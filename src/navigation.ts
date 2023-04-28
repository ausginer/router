import type { CustomContext } from './types.js';

export type NavigationEventListener<C extends CustomContext> = (path: URL | string, context?: C | null) => void;

type HistoryState<C extends CustomContext> = Readonly<{
  context: C;
  path: URL | string;
}>;

export function navigate<C extends CustomContext>(path: URL | string, context: C): void {
  const state: HistoryState<C> = { context, path };
  history.pushState(state, '', path);
  dispatchEvent(new PopStateEvent('popstate', { state }));
}

export function addNavigationListener<C extends CustomContext>(listener: NavigationEventListener<C>): () => void {
  function popstateEventListener({
    state: { context, path },
  }: Omit<PopStateEvent, 'state'> & Readonly<{ state: HistoryState<C> }>) {
    listener(path, context);
  }

  addEventListener('popstate', popstateEventListener);

  return () => removeEventListener('popstate', popstateEventListener);
}
