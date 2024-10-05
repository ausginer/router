// eslint-disable-next-line
/// <reference types="urlpattern-polyfill" />
import type { AnyObject, EmptyObject } from './types.js';

/**
 * Describes the result of the {@link Route.action}. It can be either a
 * `Promise` or a plain value.
 *
 * @typeParam T - The type of value returned by the action.
 *
 * @public
 */
export type ActionResult<T> = Promise<T | null | undefined> | T | null | undefined;

/**
 * Describes a single route.
 *
 * A route represents a single or multiple sections in the URL. It defines the
 * behavior of a page in response to URL updates. A route can act as a content
 * producer or as middleware for child routes.
 *
 * @typeParam T - The type of value returned by the {@link Route.action}.
 * @typeParam R - An extension for the Route type to provide specific data.
 * @typeParam C - An extension for the {@link RouterContext} type to provide
 * specific data.
 *
 * @public
 * @interface
 */
export type Route<T = unknown, R extends AnyObject = EmptyObject, C extends AnyObject = EmptyObject> = R &
  Readonly<{
    /**
     * Contains a list of nested routes.
     */
    readonly children?: ReadonlyArray<Route<T, R, C>> | null;

    /**
     * Represents a section of the URL specific to the current route. When
     * constructing the final URL, this section will be appended to the parent
     * route's path or to the {@link RouterOptions.baseURL | baseURL} if there
     * is no parent route.
     *
     * @remarks
     *
     * You can utilize all capabilities of the {@link https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API | URLPattern}
     * related to the `pathname`, including incorporating RegExp
     * instructions into the URL section. However, do not include the hash (`#`)
     * and search (`?`) parts; use the route action instead.
     *
     * @example
     * ```ts
     * const router = new Router({
     *   path: '/foo/:bar',
     *   children: [{
     *     path: '/id/:id(\\d+)'
     *   }]
     * });
     * ```
     * The code above matches the following URL:
     * ```
     * /foo/some-random-text/id/100
     * ```
     */
    readonly path: string;

    /**
     * Executes each time the route is resolved.
     *
     * The action is a fundamental part of the route concept. Actions are
     * executed recursively from the root route to the child route and can
     * either produce content or perform actions before or after the child's
     * action.
     *
     * If the action is not defined, the resolution algorithm will simply return
     * the result of the child route's action.
     *
     * @param context - A {@link RouterContext} object.
     *
     * @returns A result that will be delivered to the {@link Router.resolve}
     * method.
     *
     * @example
     * ```ts
     * const router = new Router<string>({
     *   async action({ next }) {
     *     console.log('before');
     *     await next();
     *     console.log('after');
     *   },
     *   path: '/foo',
     *   children: [{
     *     action() {
     *       console.log('child');
     *       return 'content';
     *     },
     *     path: '/bar'
     *   }]
     * });
     *
     * router.resolve('/foo/bar');
     * ```
     * The above code will print:
     * ```
     * before
     * child
     * after
     * ```
     */
    action?(this: Route<T, R, C>, context: RouterContext<T, R, C>): ActionResult<T>;
  }>;

/**
 * Describes a context of the router specific for each resolution.
 *
 * @public
 * @interface
 */
export type RouterContext<T = unknown, R extends AnyObject = EmptyObject, C extends AnyObject = EmptyObject> = C &
  Readonly<{
    /**
     * A sequence of routes connecting the root route to the resolved leaf
     * route. The root route comes first, and the leaf route comes last.
     */
    branch: ReadonlyArray<Route<T, R, C>>;

    /**
     * The result of the current resolution. It is an object returned by the
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/URLPattern/exec | URLPattern#exec }
     * method.
     */
    result: URLPatternResult;

    /**
     * The router instance.
     */
    router: Router<T, R, C>;

    /**
     * The URL being resolved.
     */
    url: URL;

    /**
     * The method that will execute the action of the next route in the
     * resolution chain.
     *
     * @remarks
     *
     * Note that `next` can only be called once. Calling it multiple times will
     * produce undefined behavior.
     */
    next(): Promise<T | null | undefined>;
  }>;

/**
 * Describes a set of options to customize the router behavior.
 *
 * @typeParam T - The type of value returned by the {@link Route.action}.
 * @typeParam R - An extension of the Route type that provides specific data.
 * @typeParam C - An extension of the {@link RouterContext} type that provides
 * specific data.
 *
 * @public
 */
export interface RouterOptions<T = unknown, R extends AnyObject = EmptyObject, C extends AnyObject = EmptyObject> {
  /**
   * The base URL against which all routes will be resolved. This option is
   * designed for applications hosted on URLs like the following:
   *
   * ```
   * https://example.com/path/to/my/root
   * ```
   *
   * @defaultValue `window.location.origin`
   */
  baseURL?: URL | string;

  /**
   * Enables the use of old-style hash routing. When this option is enabled, all
   * URLs will be resolved as follows:
   *
   * ```
   * https://example.com/#/foo/bar
   *                      ^ resolved route URL
   * ```
   *
   * @defaultValue `false`
   */
  hash?: boolean;

  /**
   * Invoked when an error is thrown during the resolution process.
   *
   * @remarks
   *
   * This function is not called for 404 errors.
   *
   * @param error - The error thrown during the resolution.
   * @param context - The context of the current resolution.
   *
   * @returns A result that will be delivered to the {@link Router.resolve}
   * method.
   */
  errorHandler?(error: unknown, context: RouterContext<T, R, C>): ActionResult<T>;
}

/**
 * Defines an error that is thrown when the resolving URL does not match any
 * pattern known by the router.
 *
 * This error cannot be handled by the {@link RouterOptions.errorHandler}. To
 * handle this error, you should create a route that consumes all possible URLs
 * and place it at the end of the routes list. This way, if the preceding routes
 * are unable to handle the URL, it will be handled by this route, and the
 * `NotFoundError` will never be thrown.
 *
 * @example
 * ```ts
 * const router = new Router<string>([
 *   {
 *     path: '/foo',
 *   },
 *   {
 *     action() { console.log('404: Page not found'); },
 *     path: '*',
 *   }
 * ]);
 *
 * await router.resolve('/foo/bar');
 * ```
 * The example above will print the following message in the console:
 * ```
 * 404: Page not found
 * ```
 *
 * @public
 */
export class NotFoundError extends Error {
  constructor(url?: URL, options?: ErrorOptions) {
    super(url?.toString(), options);
  }
}

/**
 * The main class that creates a router instance.
 *
 * @typeParam T - The type of value returned by the {@link Route.action}.
 * @typeParam R - An extension of the Route type that provides specific data.
 * @typeParam C - An extension of the {@link RouterContext} type that provides
 * specific data.
 *
 * @public
 */
export class Router<T = unknown, R extends AnyObject = EmptyObject, C extends AnyObject = EmptyObject> {
  readonly #routes: ReadonlyArray<Route<T, R, C>>;
  readonly #patterns = new Map<URLPattern, ReadonlyArray<Route<T, R, C>>>();
  readonly #options: RouterOptions<T, R, C>;
  readonly #baseURL: string;

  /**
   * Constructs a router instance.
   *
   * @param routes - The root route or a list of routes.
   * @param options - The optional parameter to customize the router behavior.
   */
  constructor(routes: ReadonlyArray<Route<T, R, C>> | Route<T, R, C>, options: RouterOptions<T, R, C> = {}) {
    this.#routes = Array.isArray(routes) ? routes : [routes];
    this.#options = options;
    this.#baseURL = String(this.#options.baseURL ?? location.origin);

    for (const branch of this.#traverse(this.#routes)) {
      const route = branch.at(-1)!;

      if (!route.children?.length) {
        this.#patterns.set(
          new URLPattern(
            `${this.#options.hash ? '#/' : ''}${branch
              .map((r) => r.path.replace(/^\/*(.*)\/*$/u, '$1'))
              .filter(Boolean)
              .join('/')}${this.#options.hash ? '' : '\\?*#*'}`,
            this.#baseURL,
          ),
          branch,
        );
      }
    }
  }

  /**
   * Gets the list of provided routes.
   */
  get routes(): ReadonlyArray<Route<T, R, C>> {
    return this.#routes;
  }

  /**
   * Gets the list of provided options.
   */
  get options(): RouterOptions<T, R, C> {
    return this.#options;
  }

  /**
   * Resolves the provided path based on the established routes.
   *
   * @param path - The path to be resolved. It can be either an absolute URL
   * or a string path relative to the {@link RouterOptions.baseURL}.
   * @param context - Any data that needs to be sent to {@link Route.action}.
   * The type of this parameter should match the `C` type parameter of the
   * Route. If `C` is not provided or is equal to {@link AnyObject}, providing
   * this parameter is forbidden.
   */
  async resolve(path: URL | string): Promise<T | null | undefined>;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  async resolve(path: URL | string, context: C extends EmptyObject ? never : C): Promise<T | null | undefined>;
  async resolve(path: URL | string, context?: C): Promise<T | null | undefined> {
    const url = new URL(path, this.#baseURL);

    const [result, branch] = this.#search(url);

    const iter = branch.values();

    const next = async (): Promise<T | null | undefined> => {
      const { done, value } = iter.next();

      if (done) {
        return undefined;
      }

      if (!value.action) {
        return await next();
      }

      const routeCtx = {
        ...context!,
        branch,
        next,
        result,
        router: this,
        url,
      };

      try {
        return await value.action(routeCtx);
      } catch (error: unknown) {
        if (this.#options.errorHandler) {
          return await this.#options.errorHandler(error, routeCtx);
        }

        throw error;
      }
    };

    // eslint-disable-next-line no-await-in-loop
    return await next();
  }

  #search(url: URL): readonly [URLPatternResult, ReadonlyArray<Route<T, R, C>>] {
    for (const [pattern, branch] of this.#patterns) {
      const result = pattern.exec(url);

      if (result) {
        return [result, branch];
      }
    }

    throw new NotFoundError(url);
  }

  *#traverse(
    routes: ReadonlyArray<Route<T, R, C>>,
    parents: ReadonlyArray<Route<T, R, C>> = [],
  ): Generator<ReadonlyArray<Route<T, R, C>>, void, void> {
    for (const route of routes) {
      const chain = [...parents, route];

      yield chain;

      if (route.children) {
        yield* this.#traverse(route.children, chain);
      }
    }
  }
}
