import { expect, use } from '@esm-bundle/chai';
import chaiAsPromised from 'chai-as-promised';
import Router, { RouterError } from '../src/Router.js';

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
          action({ params }) {
            return `Foo--${params.id ?? ''}`;
          },
          path: '/foo/:id',
        },
        {
          action({ params }) {
            return `Bar--${params.id ?? ''}`;
          },
          path: '/bar/:id(\\d+)',
        },
      ]);

      let actual = await router.resolve('/foo/a100');
      expect(actual).to.equal('Foo--a100');

      actual = await router.resolve('/bar/124');
      expect(actual).to.equal('Bar--124');

      await expect(router.resolve('/bar/a100')).to.be.rejectedWith(RouterError);
    });

    it('resolves nested paths', async () => {
      const router = new Router({
        async action({ next }) {
          const result = 'Foo';
          const child = (await next()) as string;
          return `${result}--${child}--Baz`;
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
      const router = new Router<string, never>({
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

    it('allows omitting "action" for the parent route', async () => {
      const router = new Router<string, string>({
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

      await expect(router.resolve(new URL('/foo', BASE_PATH))).to.rejectedWith(RouterError);

      const actual = await router.resolve(new URL('/foo', 'https://vaadin.com'));
      expect(actual).to.equal('Foo--https://vaadin.com/foo');
    });

    it('allows specifying custom error handler', async () => {
      const router = new Router<string, string>(
        {
          action() {
            return 'Foo';
          },
          path: '/foo',
        },
        {
          errorHandler(_, error, context) {
            return `[${error.status}]: ${error.message}.\n\n${context ?? ''}`;
          },
        },
      );

      const result = await router.resolve('/bar', 'FOO');
      expect(result).to.equal(`[404]: Page ${new URL('/bar', BASE_PATH).toString()} is not found.\n\nFOO`);
    });
  });

  describe('Router#resolve', () => {
    it('allows receiving context in actions', async () => {
      const router = new Router<string, string>({
        action({ context }) {
          return `Foo--${context ?? ''}`;
        },
        path: '/foo',
      });

      let actual = await router.resolve('/foo', 'CTX');
      expect(actual).to.equal('Foo--CTX');

      actual = await router.resolve('/foo', 'XTC');
      expect(actual).to.equal('Foo--XTC');
    });
  });
});
