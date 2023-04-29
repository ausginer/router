import { expect, use } from '@esm-bundle/chai';
import chaiAsPromised from 'chai-as-promised';
import Router, { RouterError } from '../src/Router.js';

use(chaiAsPromised);

describe('Router', () => {
  const BASE_PATH = location.origin;

  describe('routes', () => {
    it('resolves simple paths', async () => {
      const expected = {};

      const router = new Router([
        {
          action() {
            return expected;
          },
          path: '/foo',
        },
      ]);

      const actual = await router.resolve(new URL('/foo', BASE_PATH));
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
        {
          action({ search }) {
            return `Baz--${search.query ?? ''}`;
          },
          path: '/baz?q=:query',
        },
      ]);

      let actual = await router.resolve(new URL('/foo/a100', BASE_PATH));
      expect(actual).to.equal('Foo--a100');

      actual = await router.resolve(new URL('/bar/124', BASE_PATH));
      expect(actual).to.equal('Bar--124');

      await expect(router.resolve(new URL('/bar/a100', BASE_PATH))).to.be.rejectedWith(RouterError);

      actual = await router.resolve(new URL('/baz?q=Baz', BASE_PATH));
      expect(actual).to.equal('Baz--Baz');
    });

    it('resolves nested paths', async () => {
      const router = new Router([
        {
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
        },
      ]);

      const actual = await router.resolve(new URL('/foo/bar', BASE_PATH));
      expect(actual).to.equal('Foo--Bar--Baz');
    });
  });

  describe('options', () => {
    it('allows specifying custom baseURL', async () => {
      const router = new Router(
        [
          {
            action({ path }) {
              return `Foo--${String(path)}`;
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
  });

  describe('Router#resolve', () => {
    it('allows receiving context in actions', async () => {
      const router = new Router<string, string>([
        {
          action({ context }) {
            return `Foo--${context ?? ''}`;
          },
          path: '/foo',
        },
      ]);

      let actual = await router.resolve(new URL('/foo', BASE_PATH), 'CTX');
      expect(actual).to.equal('Foo--CTX');

      actual = await router.resolve(new URL('/foo', BASE_PATH), 'XTC');
      expect(actual).to.equal('Foo--XTC');
    });
  });
});
