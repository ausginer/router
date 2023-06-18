import type { EmptyRecord, Optional } from './types.js';

export type NavigationEventListener<C extends Record<string, unknown> = EmptyRecord> = (
  path: URL | string,
  context: Optional<C>,
) => void;

type HistoryState<C extends Record<string, unknown> = EmptyRecord> = Readonly<{
  context: Optional<C>;
  path: URL | string;
}>;

export function navigate<C extends Record<string, unknown> = EmptyRecord>(
  path: URL | string,
  context: Optional<C>,
): void {
  const state: HistoryState<C> = { context, path: String(path) };
  history.pushState(state, '', new URL(path, location.origin));
  dispatchEvent(new PopStateEvent('popstate', { state }));
}

export function addNavigationListener<C extends Record<string, unknown> = EmptyRecord>(
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
