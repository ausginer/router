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

    it('navigates to the specified URL', (done) => {
      const url = new URL('/foo', BASE_PATH);
      addEventListener(
        'popstate',
        () => {
          expect(history.state).to.include({ context: undefined, path: url.toString() });
          expect(location.href).to.equal(url.toString());
          done();
        },
        { once: true },
      );

      navigate(url);
    });

    it('restores the context on history#back', (done) => {
      const url = new URL('/foo', BASE_PATH);
      const ctx = { foo: 'bar' };
      navigate(url, ctx);
      navigate(new URL('/bar', BASE_PATH));
      addEventListener(
        'popstate',
        () => {
          // History serializes object to store it, so the recovered object cannot be
          // strictly equal to the original one.
          expect((history.state as HistoryState<typeof ctx>).context).to.deep.equal(ctx);
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
