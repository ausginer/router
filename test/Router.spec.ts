import { expect, use } from '@esm-bundle/chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { Router, NotFoundError } from '../src/Router.js';

use(chaiAsPromised);
use(sinonChai);

describe('Router', () => {
  const BASE_PATH = location.origin;

  describe('routes', () => {
    it('resolves simple paths', async () => {
      const expected = {};

      const router = new Router({
        action() {
          return expected;
        },
        path: '/foo',
      });

      const actual = await router.resolve(new URL('/foo', BASE_PATH));
      expect(actual).to.equal(expected);
    });

    it('resolves complex path', async () => {
      const router = new Router([
        {
          action({
            result: {
              pathname: {
                groups: { id },
              },
            },
          }) {
            return `Foo--${id ?? ''}`;
          },
          path: '/foo/:id',
        },
        {
          action({
            result: {
              pathname: {
                groups: { id },
              },
            },
          }) {
            return `Bar--${id ?? ''}`;
          },
          path: '/bar/:id(\\d+)',
        },
      ]);

      let actual = await router.resolve(new URL('/foo/a100', BASE_PATH));
      expect(actual).to.equal('Foo--a100');

      actual = await router.resolve(new URL('/bar/124', BASE_PATH));
      expect(actual).to.equal('Bar--124');

      await expect(router.resolve(new URL('/bar/a100', BASE_PATH))).to.be.rejectedWith(NotFoundError);
    });

    it('allows creating non-middleware page with children', async () => {
      const router = new Router<string>({
        children: [
          {
            action() {
              return 'Foo';
            },
            path: '',
          },
          {
            action() {
              return 'Bar';
            },
            path: '/bar',
          },
        ],
        path: '/foo',
      });

      const [result1, result2] = await Promise.all([
        router.resolve(new URL('/foo', BASE_PATH)),
        router.resolve(new URL('/foo/bar', BASE_PATH)),
      ]);

      expect(result1).to.equal('Foo');
      expect(result2).to.equal('Bar');
    });

    it('resolves nested paths', async () => {
      const router = new Router<string>({
        async action({ next }) {
          return `Foo--${(await next()) ?? ''}--Baz`;
        },
        children: [
          {
            action() {
              return 'Bar';
            },
            path: '/bar',
          },
        ],
        path: '/foo',
      });

      const actual = await router.resolve(new URL('/foo/bar', BASE_PATH));
      expect(actual).to.equal('Foo--Bar--Baz');
    });

    it('allows preventing the loading of the nested route', async () => {
      const router = new Router<string>({
        async action({ next, url }) {
          if (url.searchParams.has('authenticated')) {
            return await next();
          }

          return 'Authentication required';
        },
        children: [
          {
            action() {
              return 'Hi, User';
            },
            path: '/protected',
          },
        ],
        path: '/',
      });

      let result = await router.resolve(new URL('/protected', BASE_PATH));
      expect(result).to.equal('Authentication required');

      result = await router.resolve(new URL('/protected?authenticated=true', BASE_PATH));
      expect(result).to.equal('Hi, User');
    });

    it('allows setting arbitrary data along with the route', async () => {
      type RouteExtension = Readonly<{
        requiresLogin?: boolean;
      }>;

      const router = new Router<string, RouteExtension>({
        async action({ branch, next }) {
          return `Foo-${String(await next())}|${JSON.stringify({
            child: String(branch.at(-1)?.requiresLogin),
            parent: this.requiresLogin,
          })}`;
        },
        children: [
          {
            action() {
              return 'Bar';
            },
            path: '/protected',
          },
        ],
        path: '/',
        requiresLogin: true,
      });

      const result = await router.resolve(new URL('/protected', BASE_PATH));
      expect(result).to.equal('Foo-Bar|{"child":"undefined","parent":true}');
    });

    it('allows omitting "action" for the parent route', async () => {
      const router = new Router({
        children: [
          {
            action() {
              return 'Bar';
            },
            path: '/bar',
          },
        ],
        path: '/foo',
      });
      const result = await router.resolve(new URL('/foo/bar', BASE_PATH));
      expect(result).to.equal('Bar');
    });

    it('returns undefined if the leaf child has no action', async () => {
      const router = new Router({
        path: '/foo',
      });

      const result = await router.resolve(new URL('/foo', BASE_PATH));
      expect(result).to.be.undefined;
    });
  });

  describe('options', () => {
    it('allows specifying custom baseURL', async () => {
      const router = new Router(
        [
          {
            action({ url }) {
              return `Foo--${String(url)}`;
            },
            path: '/foo',
          },
        ],
        { baseURL: 'https://vaadin.com' },
      );

      await expect(router.resolve(new URL('/foo', BASE_PATH))).to.rejectedWith(NotFoundError);

      const actual = await router.resolve(new URL('/foo', 'https://vaadin.com'));
      expect(actual).to.equal('Foo--https://vaadin.com/foo');
    });

    it('throws an error if the path cannot be associated', async () => {
      const router = new Router<string, object>({
        action() {
          return 'Foo';
        },
        path: '/foo',
      });

      await expect(router.resolve(new URL('/bar', BASE_PATH))).to.rejectedWith(NotFoundError);
    });

    it('it does not throw an error if there is a catching route', async () => {
      const router = new Router<string>([
        {
          async action({ next }) {
            return `Root--${String(await next())}`;
          },
          children: [
            {
              action() {
                return 'Foo';
              },
              path: '/foo',
            },
          ],
          path: '',
        },
        {
          action() {
            return '404';
          },
          path: '*',
        },
      ]);

      const result = await router.resolve(new URL('/bar', BASE_PATH));
      expect(result).to.equal('404');
    });

    it('allows setting a custom error handler', async () => {
      class CustomError extends Error {}

      const errorHandler = sinon.spy();

      const router = new Router<string>(
        {
          children: [
            {
              action() {
                throw new CustomError();
              },
              path: '/bar',
            },
          ],
          path: '/foo',
        },
        { errorHandler },
      );

      await router.resolve(new URL('/foo/bar', BASE_PATH));

      expect(errorHandler).to.be.calledOnce;

      const [error] = errorHandler.firstCall.args;
      expect(error).to.be.instanceOf(CustomError);
    });
  });

  describe('Router#resolve', () => {
    it('allows receiving context in actions', async () => {
      type Context = Readonly<{ data: string }>;

      const router = new Router<string, object, Context>({
        action({ data }) {
          return `Foo--${data}`;
        },
        path: '/foo',
      });

      let actual = await router.resolve(new URL('/foo', BASE_PATH), { data: 'CTX' });
      expect(actual).to.equal('Foo--CTX');

      actual = await router.resolve(new URL('/foo', BASE_PATH), { data: 'XTC' });
      expect(actual).to.equal('Foo--XTC');
    });
  });
});
