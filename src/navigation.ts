import type { EmptyObject } from 'type-fest';
import type { StructuredCloneableObject } from './types.js';

/**
 * Describes the router-specific state stored in the history.
 */
export type HistoryState<C> = Readonly<{
  /**
   * The path to navigate to.
   */
  path: string;
  /**
   * Any data that needs to be sent to {@link Route.action}.
   */
  context?: C;
}>;

/**
 * Initiates a navigation to the specified URL without reloading the page and
 * notifies the application via the `popstate` event.
 *
 * @typeParam C - The type of the context data. It should match the `C` type
 * parameter of the {@link Router}.
 *
 * @param path - The path to navigate to. It can be either an absolute URL or a
 * string path relative to the {@link RouterOptions.baseURL}.
 */
export function navigate(path: URL | string): void;
/**
 * Initiates a navigation to the specified URL without reloading the page and
 * notifies the application via the `popstate` event.
 *
 * @typeParam C - The type of the context data. It should be
 * {@link https://developer.mozilla.org/en-US/docs/Glossary/Serializable_object | serializable}
 * and match the `C` type parameter of the {@link Router}.
 *
 * @param path - The path to navigate to. It can be either an absolute URL or a
 * string path relative to the {@link RouterOptions.baseURL}.
 * @param context - Any data that needs to be sent to {@link Route.action}. The
 * type of this parameter should match the generic `C`. If `C` is not provided
 * or is equal to {@link EmptyObject}, providing this parameter is forbidden.
 */
export function navigate<C extends StructuredCloneableObject = EmptyObject>(
  path: URL | string,
  context: C extends EmptyObject ? never : C,
): void;
export function navigate<C extends StructuredCloneableObject = EmptyObject>(path: URL | string, context?: C): void {
  history.pushState({ path: path.toString(), context }, '', path);
  dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * The listener callback.
 *
 * @param path - The path to navigate to.
 */
export type NavigationListener = (path: string) => void;

/**
 * The listener callback.
 *
 * @typeParam C - The type of the context data. It should be
 * {@link https://developer.mozilla.org/en-US/docs/Glossary/Serializable_object | serializable}
 * and match the `C` type parameter of the {@link Router}.
 *
 * @param path - The path to navigate to.
 * @param context - Any data that needs to be sent to {@link Route.action}.
 * The type of this parameter should match the generic `C`. If `C` is not
 * provided or is equal to {@link EmptyObject}, providing this parameter is
 * forbidden.
 */
export type NavigationListenerWithContext<C extends StructuredCloneableObject = EmptyObject> = (
  path: string,
  context: C extends EmptyObject ? never : C,
) => void;

/**
 * Adds a listener to the `popstate` event executed each time the event is
 * fired. This function is designed to be used in conjunction with the {@link Router.resolve}
 * method.
 */
export function addNavigationListener(
  /**
   * The listener callback.
   * @param path - The path to navigate to.
   */
  listener: (path: string) => void,
  /**
   * The optional parameter to customize the behavior of the
   * listener. It supports all the parameters of
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener | addEventListener}
   * function.
   */
  options?: AddEventListenerOptions,
): void;
/**
 * Adds a listener to the `popstate` event executed each time the event is
 * fired. This function is designed to be used in conjunction with the {@link Router.resolve}
 * method.
 *
 * @typeParam C - The type of the context data. It should be
 * {@link https://developer.mozilla.org/en-US/docs/Glossary/Serializable_object | serializable}
 * and match the `C` type parameter of the {@link Router}.
 */
export function addNavigationListener<C extends StructuredCloneableObject = EmptyObject>(
  /**
   * The listener callback.
   *
   * @param path - The path to navigate to.
   * @param context - Any data that needs to be sent to {@link Route.action}.
   * The type of this parameter should match the generic `C`. If `C` is not
   * provided or is equal to {@link EmptyObject}, providing this parameter is
   * forbidden.
   */
  listener: (path: string, context: C extends EmptyObject ? never : C) => void,
  /**
   * The optional parameter to customize the behavior of the
   * listener. It supports all the parameters of
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener | addEventListener}
   * function.
   */
  options?: AddEventListenerOptions,
): void;
export function addNavigationListener<C extends StructuredCloneableObject = EmptyObject>(
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
