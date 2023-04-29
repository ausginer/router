export type NavigationEventListener<C = unknown> = (path: URL | string, context?: C | null) => void;

type HistoryState<C> = Readonly<{
  context: C;
  path: URL | string;
}>;

export function navigate<C>(path: URL | string, context: C): void {
  const state: HistoryState<C> = { context, path };
  history.pushState(state, '', path);
  dispatchEvent(new PopStateEvent('popstate', { state }));
}

export function addNavigationListener<C>(listener: NavigationEventListener<C>): () => void {
  function popstateEventListener({
    state: { context, path },
  }: Omit<PopStateEvent, 'state'> & Readonly<{ state: HistoryState<C> }>) {
    listener(path, context);
  }

  addEventListener('popstate', popstateEventListener);

  return () => removeEventListener('popstate', popstateEventListener);
}
