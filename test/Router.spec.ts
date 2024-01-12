import { expect, use } from '@esm-bundle/chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { Router, NotFoundError } from '../src/Router.js';
import type { EmptyRecord } from '../src/types.js';

use(chaiAsPromised);

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

      const actual = await router.resolve('/foo');
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

      let actual = await router.resolve('/foo/a100');
      expect(actual).to.equal('Foo--a100');

      actual = await router.resolve('/bar/124');
      expect(actual).to.equal('Bar--124');

      await expect(router.resolve('/bar/a100')).to.be.rejectedWith(NotFoundError);
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

      const [result1, result2] = await Promise.all([router.resolve('/foo'), router.resolve('/foo/bar')]);

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

      const actual = await router.resolve('/foo/bar');
      expect(actual).to.equal('Foo--Bar--Baz');
    });

    it('allows preventing the loading of the nested route', async () => {
      const router = new Router<string>({
        async action({ next, url }) {
          if (url.searchParams.has('authenticated')) {
            return next();
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

      let result = await router.resolve('/protected');
      expect(result).to.equal('Authentication required');

      result = await router.resolve('/protected?authenticated=true');
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

      const result = await router.resolve('/protected');
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
      const result = await router.resolve('/foo/bar');
      expect(result).to.equal('Bar');
    });

    it('returns undefined if the leaf child has no action', async () => {
      const router = new Router({
        path: '/foo',
      });

      const result = await router.resolve('/foo');
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
      const router = new Router<string, EmptyRecord>({
        action() {
          return 'Foo';
        },
        path: '/foo',
      });

      await expect(router.resolve('/bar')).to.rejectedWith(NotFoundError);
    });

    it('it does not throw an error if there is a catching route', async () => {
      const router = new Router<string>([
        {
          async action({ next }) {
            return `Root--${String(await next())}`;
          },
          children: [
            {
              async action() {
                return 'Foo';
              },
              path: '/foo',
            },
          ],
          path: '',
        },
        {
          async action() {
            return '404';
          },
          path: '*',
        },
      ]);

      const result = await router.resolve('/bar');
      expect(result).to.equal('404');
    });

    it('allows setting a custom error handler', async () => {
      type Context = { data: string };
      class CustomError extends Error {}

      const errorHandler = sinon.spy();

      const router = new Router<string, EmptyRecord, Context>(
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
        {
          errorHandler,
        },
      );

      await router.resolve('/foo/bar', { data: 'foo' });

      expect(errorHandler).to.be.calledOnce;

      const [error, context] = errorHandler.firstCall.args;
      expect(context).to.be.an('object');
      expect(context).to.have.keys(['branch', 'data', 'next', 'result', 'router', 'url']);
      expect(error).to.be.instanceOf(CustomError);
    });

    it('allows using hash instead of the full URL', async () => {
      const router = new Router(
        [
          {
            action() {
              return `Foo`;
            },
            path: '/foo',
          },
        ],
        { hash: true },
      );

      const result = await router.resolve('#/foo');
      expect(result).to.equal('Foo');
    });
  });

  describe('Router#resolve', () => {
    it('allows receiving context in actions', async () => {
      type Context = Readonly<{ data: string }>;

      const router = new Router<string, EmptyRecord, Context>({
        action({ data }) {
          return `Foo--${data}`;
        },
        path: '/foo',
      });

      let actual = await router.resolve('/foo', { data: 'CTX' });
      expect(actual).to.equal('Foo--CTX');

      actual = await router.resolve('/foo', { data: 'XTC' });
      expect(actual).to.equal('Foo--XTC');
    });
  });
});
