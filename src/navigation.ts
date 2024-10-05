import type { EmptyObject } from 'type-fest';
import type { AnyObject } from './types.js';

type HistoryState<C extends AnyObject = EmptyObject> = Readonly<{
  context?: C;
  path: URL | string;
}>;

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
export function navigate<C extends AnyObject = EmptyObject>(
  path: URL | string,
  context: C extends EmptyObject ? never : C,
): void;
export function navigate<C extends AnyObject = EmptyObject>(path: URL | string, context?: C): void {
  const state: HistoryState<C> = { context, path: String(path) };
  history.pushState(state, '', new URL(path, location.origin));
  dispatchEvent(new PopStateEvent('popstate', { state }));
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
export function addNavigationListener<C extends AnyObject = EmptyObject>(
  listener: C extends EmptyObject ? (path: URL | string) => void : (path: URL | string, context: C) => void,
  options?: AddEventListenerOptions,
): void;
export function addNavigationListener<C extends AnyObject = EmptyObject>(
  listener: (path: URL | string, context?: C) => void,
  options?: AddEventListenerOptions,
): void {
  addEventListener(
    'popstate',
    ({ state: { context, path } }: PopStateEvent & Readonly<{ state: HistoryState<C> }>) => {
      listener(path, context);
    },
    options,
  );
}
