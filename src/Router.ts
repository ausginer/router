// eslint-disable-next-line
/// <reference types="urlpattern-polyfill" />
import type { EmptyObject } from 'type-fest';
import type { MaybePromise, StructuredCloneableObject } from './types.js';

/**
 * Describes a single route.
 *
 * A route represents a single or multiple sections in the URL. It defines the
 * behavior of a page in response to URL updates. A route can act as a content
 * producer or as middleware for child routes.
 *
 * @typeParam T - The type of value returned by the {@link Route.action}.
 * @typeParam R - An extension for the Route type to provide specific data.
 * @typeParam C - An extension of the {@link RouterContext} type that provides
 * specific data. The data should be
 * {@link https://developer.mozilla.org/en-US/docs/Glossary/Serializable_object | serializable}
 *
 * @public
 * @interface
 */
export type Route<T = unknown, R extends object = EmptyObject, C extends StructuredCloneableObject = EmptyObject> = R &
  Readonly<{
    /**
     * Contains a list of nested routes.
     */
    readonly children?: ReadonlyArray<Route<T, R, C>>;

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
    action?(this: Route<T, R, C>, context: RouterContext<T, R, C>): MaybePromise<T | null | undefined>;
  }>;

/**
 * Describes a context of the router specific for each resolution.
 *
 * @public
 * @interface
 */
export type RouterContext<
  T = unknown,
  R extends object = EmptyObject,
  C extends StructuredCloneableObject = EmptyObject,
> = C &
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
 * specific data. The data should be
 * {@link https://developer.mozilla.org/en-US/docs/Glossary/Serializable_object | serializable}
 *
 * @public
 */
export interface RouterOptions<T = unknown> {
  /**
   * The base URL against which all routes will be resolved. This option is
   * designed for applications hosted on URLs like the following:
   *
   * ```
   * https://example.com/path/to/my/root
   * ```
   * @remarks
   * It doesn't consider URLs from the `<base>` tag. If you use it, you should
   * provide the base URL manually.
   *
   * @defaultValue `window.location.origin`
   */
  baseURL?: URL | string;

  /**
   * Invoked when an error is thrown during the resolution process.
   *
   * @remarks
   * This function is not called for 404 errors.
   *
   * @param error - The error thrown during the resolution.
   *
   * @returns A result that will be delivered to the {@link Router.resolve}
   * method.
   */
  errorHandler?(error: unknown): MaybePromise<T | null | undefined>;
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
 * specific data. The data should be
 * {@link https://developer.mozilla.org/en-US/docs/Glossary/Serializable_object | serializable}
 *
 * @public
 */
export class Router<T = unknown, R extends object = EmptyObject, C extends StructuredCloneableObject = EmptyObject> {
  /**
   * {@inheritDoc RouterOptions.baseURL}
   */
  readonly baseURL: URL;
  /**
   * A list of routes that are used to resolve the URL.
   */
  readonly routes: ReadonlyArray<Route<T, R, C>>;

  /**
   * The error handler that is invoked when an error is thrown during the
   * resolution process.
   *
   * @internal
   */
  readonly #errorHandler?: (error: unknown) => MaybePromise<T | null | undefined>;

  /**
   * Contains a map of URL patterns and the {@link RouterContext.branch | route branches}
   * associated with them.
   *
   * @internal
   */
  readonly #patterns = new Map<URLPattern, ReadonlyArray<Route<T, R, C>>>();

  /**
   * Constructs a router instance.
   *
   * @param routes - The root route or a list of routes.
   * @param optionsOrRouter - The optional parameter to customize the router
   * behavior. Can also be another router instance to create a new router based
   * on the existing one.
   */
  constructor(
    routes: ReadonlyArray<Route<T, R, C>> | Route<T, R, C>,
    optionsOrRouter: RouterOptions<T> | Router<T, R, C> = {},
  ) {
    this.routes = Array.isArray(routes) ? routes : [routes];
    this.baseURL = new URL(optionsOrRouter.baseURL ?? '', document.baseURI);
    this.#errorHandler =
      // eslint-disable-next-line @typescript-eslint/unbound-method
      optionsOrRouter instanceof Router ? optionsOrRouter.#errorHandler : optionsOrRouter.errorHandler;

    for (const branch of this.#traverse(this.routes)) {
      const url = branch
        .map((r) => r.path.replace(/^\/*(.*?)\/*$/u, '$1'))
        .filter((p) => p)
        .join('/');
      const pattern = new URLPattern(url, String(this.baseURL));
      this.#patterns.set(pattern, branch);
    }
  }

  /**
   * Resolves the provided path based on the established routes.
   *
   * @param path - The path to be resolved. It can be either an absolute URL
   * or a string path relative to the {@link RouterOptions.baseURL}.
   */
  async resolve(path: URL | string): Promise<T | null | undefined>;
  /**
   * Resolves the provided path based on the established routes.
   *
   * @param path - The path to be resolved. It can be either an absolute URL
   * or a string path relative to the {@link RouterOptions.baseURL}.
   * @param context - Any data that needs to be sent to {@link Route.action}.
   * The type of this parameter should match the `C` type parameter of the
   * Route. If `C` is not provided or is equal to {@link EmptyObject}, setting
   * this parameter is forbidden.
   */
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  async resolve(path: URL | string, context: C extends EmptyObject ? never : C): Promise<T | null | undefined>;
  async resolve(path: URL | string, context?: C): Promise<T | null | undefined> {
    const url = new URL(path, this.baseURL);

    const [result, branch] = this.#execute(url);
    const iter = branch.values();

    const ctx = {
      ...context!,
      branch,
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      next,
      result,
      router: this,
      url,
    };

    async function next() {
      const { done, value } = iter.next();

      if (done) {
        return undefined;
      }

      if (value.action) {
        return await value.action(ctx);
      }

      return await next();
    }

    try {
      return await next();
    } catch (error: unknown) {
      if (this.#errorHandler) {
        return await this.#errorHandler(error);
      }

      throw error;
    }
  }

  /**
   * Resolves the provided path based on the established routes and finds the
   * appropriate {@link RouterContext.branch | route branch}.
   *
   * @param url - The URL to be resolved.
   * @returns - A tuple containing the result of the URL pattern matching and
   * the {@link RouterContext.branch | route branch} associated with the URL.
   */
  #execute(url: URL): readonly [URLPatternResult, ReadonlyArray<Route<T, R, C>>] {
    for (const [pattern, branch] of this.#patterns) {
      const result = pattern.exec(url);

      if (result) {
        return [result, branch];
      }
    }

    throw new NotFoundError(url);
  }

  /**
   * Traverses the routes tree and yields all possible {@link RouterContext.branch | branches}.
   *
   * @param routes - The list of routes to traverse.
   * @param parents - The incomplete {@link RouterContext.branch | branches}.
   */
  *#traverse(
    routes: ReadonlyArray<Route<T, R, C>>,
    parents: ReadonlyArray<Route<T, R, C>> = [],
  ): Generator<ReadonlyArray<Route<T, R, C>>, void, void> {
    for (const route of routes) {
      const chain = [...parents, route];

      if (route.children) {
        yield* this.#traverse(route.children, chain);
      } else {
        yield chain;
      }
    }
  }
}
