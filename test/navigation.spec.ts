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

    afterEach(async () => {
      const state: HistoryState<never> = { path: DEFAULT_PAGE };
      history.pushState(state, '', DEFAULT_PAGE);
      dispatchEvent(new PopStateEvent('popstate', { state }));
    });

    it('navigates to the specified URL', (done) => {
      const url = new URL('/foo', BASE_PATH);
      addEventListener(
        'popstate',
        (e) => {
          expect(e.state).to.include({ context: undefined, path: url.toString() });
          expect(location.href).to.equal(url.toString());
          done();
        },
        { once: true },
      );

      navigate(url.toString());
    });

    it('propagates the navigation context via event', (done) => {
      const url = new URL('/foo', BASE_PATH);
      const ctx = { foo: 'bar' };
      addEventListener(
        'popstate',
        ({ state: { context } }) => {
          expect(context).to.equal(ctx);
          done();
        },
        { once: true },
      );

      navigate(url, ctx);
    });

    it('restores the context on history#back', (done) => {
      const url = new URL('/foo', BASE_PATH);
      const ctx = { foo: 'bar' };
      navigate(url, ctx);
      navigate(new URL('/bar', BASE_PATH));
      addEventListener(
        'popstate',
        ({ state }) => {
          // History serializes object to store it, so the recovered object cannot be
          // strictly equal to the original one.
          expect((state as HistoryState<typeof ctx> | null | undefined)?.context).to.deep.equal(ctx);
          done();
        },
        { once: true },
      );

      history.back();
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
      dispatchEvent(new PopStateEvent('popstate', { state }));

      expect(spy).to.have.been.calledWith('/foo', 'bar');
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
