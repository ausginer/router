import { expect, use } from '@esm-bundle/chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { addNavigationListener, navigate } from '../src/navigation.js';

use(sinonChai);

type HistoryState<C> = Readonly<{
  context?: C;
  path: URL | string;
}>;

describe('Navigation', () => {
  describe('navigate', () => {
    const BASE_PATH = location.origin;
    const DEFAULT_PAGE = location.href;

    afterEach(() => {
      const state: HistoryState<never> = { path: DEFAULT_PAGE };
      history.pushState(state, '', DEFAULT_PAGE);
      dispatchEvent(new PopStateEvent('popstate'));
    });

    it('navigates to the specified URL', async () => {
      const url = new URL('/foo', BASE_PATH);

      return await new Promise<void>((resolve) => {
        addEventListener(
          'popstate',
          () => {
            expect(history.state).to.include({ context: undefined, path: url.toString() });
            expect(location.href).to.equal(url.toString());
            resolve();
          },
          { once: true },
        );

        navigate(url.toString());
      });
    });

    it('propagates the navigation context via event', async () => {
      const url = new URL('/foo', BASE_PATH);
      const ctx = { foo: 'bar' };
      return await new Promise<void>((resolve) => {
        addEventListener(
          'popstate',
          () => {
            expect((history.state as HistoryState<typeof ctx>).context).to.equal(ctx);
            resolve();
          },
          { once: true },
        );

        navigate(url, ctx);
      });
    });

    it('restores the context on history#back', async () => {
      const url = new URL('/foo', BASE_PATH);
      const ctx = { foo: 'bar' };
      navigate(url, ctx);
      navigate(new URL('/bar', BASE_PATH));

      return await new Promise<void>((resolve) => {
        addEventListener(
          'popstate',
          () => {
            // History serializes object to store it, so the recovered object cannot be
            // strictly equal to the original one.
            expect((history.state as HistoryState<typeof ctx>).context).to.deep.equal(ctx);
            resolve();
          },
          { once: true },
        );

        history.back();
      });
    });
  });

  describe('addNavigationListener', () => {
    let state: HistoryState<string>;

    beforeEach(() => {
      state = { context: 'bar', path: '/foo' };
    });

    it('listens for popstate event', () => {
      const spy = sinon.spy();
      addNavigationListener(spy);
      const path = new URL('/foo', location.origin);
      history.pushState({ context: 'bar', path: path.toString() }, '', path);
      dispatchEvent(new PopStateEvent('popstate'));

      expect(spy).to.have.been.calledWith(path, 'bar');
    });

    it('accepts listener options', () => {
      const controller = new AbortController();
      const spy = sinon.spy();
      addNavigationListener(spy, { signal: controller.signal });
      const event = new PopStateEvent('popstate', { state });
      dispatchEvent(event);
      dispatchEvent(event);
      controller.abort();
      dispatchEvent(event);
      expect(spy).to.have.been.calledTwice;
    });
  });
});
