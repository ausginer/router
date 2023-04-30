export type NavigationEventListener<C = unknown> = (path: URL | string, context?: C | null) => void;

type HistoryState<C> = Readonly<{
  context?: C;
  path: URL | string;
}>;

export function navigate<C>(path: URL | string, context?: C): void {
  const state: HistoryState<C> = { context, path: String(path) };
  history.pushState(state, '', new URL(path, location.origin));
  dispatchEvent(new PopStateEvent('popstate', { state }));
}

export function addNavigationListener<C>(
  listener: NavigationEventListener<C>,
  options?: AddEventListenerOptions,
): void {
  addEventListener(
    'popstate',
    ({ state: { context, path } }: Omit<PopStateEvent, 'state'> & Readonly<{ state: HistoryState<C> }>) => {
      listener(path, context);
    },
    options,
  );
}
