import { expect, use } from '@esm-bundle/chai';
import chaiAsPromised from 'chai-as-promised';
import Router, { RouterError, type Route } from '../src/Router.js';

use(chaiAsPromised);

type TestContext = Readonly<{ data: string }>;
type DefaultRoute = Route<string>;

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
      const router = new Router<DefaultRoute>([
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
      const router = new Router<DefaultRoute>({
        async action({ next }) {
          const result = 'Foo';
          const child = (await next()) ?? '';
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
      const router = new Router<DefaultRoute>({
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
      interface ExtendedRoute extends Route<string> {
        requiresLogin?: boolean;
      }

      const router = new Router<ExtendedRoute>({
        async action({ route, next }) {
          return `parent: ${String(route.requiresLogin)}, child: ${String(await next())}`;
        },
        children: [
          {
            action({ route }) {
              return String(route.requiresLogin);
            },
            path: '/protected',
          },
        ],
        path: '/',
        requiresLogin: true,
      });

      const result = await router.resolve('/protected');
      expect(result).to.equal('parent: true, child: undefined');
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
      } as DefaultRoute);
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
        ] as ReadonlyArray<Route<string>>,
        { baseURL: 'https://vaadin.com' },
      );

      await expect(router.resolve(new URL('/foo', BASE_PATH))).to.rejectedWith(RouterError);

      const actual = await router.resolve(new URL('/foo', 'https://vaadin.com'));
      expect(actual).to.equal('Foo--https://vaadin.com/foo');
    });

    it('allows specifying custom error handler', async () => {
      const router = new Router(
        {
          action() {
            return 'Foo';
          },
          path: '/foo',
        } as Route<string, TestContext>,
        {
          errorHandler(_, error, context) {
            return `[${error.status}]: ${error.message}.\n\n${context?.data ?? ''}`;
          },
        },
      );

      const result = await router.resolve('/bar', { data: 'FOO' });
      expect(result).to.equal(`[404]: Page ${new URL('/bar', BASE_PATH).toString()} is not found.\n\nFOO`);
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
        ] as ReadonlyArray<Route<string>>,
        { hash: true },
      );

      const result = await router.resolve('#/foo');
      expect(result).to.equal('Foo');
    });
  });

  describe('Router#resolve', () => {
    it('allows receiving context in actions', async () => {
      const router = new Router({
        action({ data }) {
          return `Foo--${data}`;
        },
        path: '/foo',
      } as Route<string, TestContext>);

      let actual = await router.resolve('/foo', { data: 'CTX' });
      expect(actual).to.equal('Foo--CTX');

      actual = await router.resolve('/foo', { data: 'XTC' });
      expect(actual).to.equal('Foo--XTC');
    });
  });
});
