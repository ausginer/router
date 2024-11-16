import type { EmptyObject, StructuredCloneable } from 'type-fest';

export type HistoryState<C> = Readonly<{ path: string; context?: C }>;

/**
 * Changes the current URL and notifies the application using the `popstate`
 * event.
 *
 * @typeParam C - The type of the context data. It should match the `C` type
 * parameter of the {@link Router}.
 *
 * @param path - The path to navigate to. It can be either an absolute URL or a
 * string path relative to the {@link RouterOptions.baseURL}.
 * @param context - Any data that needs to be sent to {@link Route.action}. The
 * type of this parameter should match the generic `C`. If `C` is not provided
 * or is equal to {@link EmptyObject}, providing this parameter is forbidden.
 * @event PopStateEvent - The event that notifies the application that the URL
 * has changed.
 */
export function navigate(path: URL | string): void;
export function navigate<C extends object & StructuredCloneable = EmptyObject>(
  path: URL | string,
  context: C extends EmptyObject ? never : C,
): void;
export function navigate<C extends object & StructuredCloneable = EmptyObject>(path: URL | string, context?: C): void {
  history.pushState({ path: path.toString(), context }, '', path);
  dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Adds a listener to the `popstate` event executed each time the event is
 * fired. This function is designed to be used in combination with the {@link Router.resolve}
 * method.
 *
 * @param listener - The listener function. It has the same signature as {@link Router.resolve}
 * or {@link navigate}.
 * @param options - The optional parameter to customize the behavior of the
 * listener. It supports all the parameters of {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener | addEventListener}
 * function.
 */
export function addNavigationListener(listener: (path: string) => void, options?: AddEventListenerOptions): void;
export function addNavigationListener<C extends object & StructuredCloneable = EmptyObject>(
  listener: (path: string, context: C extends EmptyObject ? never : C) => void,
  options?: AddEventListenerOptions,
): void;
export function addNavigationListener<C extends object & StructuredCloneable = EmptyObject>(
  listener: (path: string, context?: C) => void,
  options?: AddEventListenerOptions,
): void {
  addEventListener(
    'popstate',
    () => {
      const { path, context } = history.state as HistoryState<C>;
      listener(path, context);
    },
    options,
  );
}
