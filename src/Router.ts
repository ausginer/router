// eslint-disable-next-line @typescript-eslint/triple-slash-reference,spaced-comment
/// <reference types="urlpattern-polyfill" />
import type { EmptyRecord, Optional } from './types.js';

/**
 * Describes a result of the {@link Route.action}. Could be either a
 * `Promise` or a plain value.
 *
 * @typeParam T - a value for action to return.
 *
 * @public
 */
export type ActionResult<T> = Promise<T | null | undefined> | T | null | undefined;

/**
 * Describes a single route.
 *
 * The route is a description of a single or multiple sections in the URL. It
 * sets up a behavior of a page as a reaction to the URL update. The route could
 * work either as a producer of a page content or as a middleware for the
 * children routes.
 *
 * @typeParam T - a value for an {@link Route.action} to return.
 * @typeParam R - an extension for the Route type to provide specific data.
 * @typeParam C - an extension for the {@link RouterContext} type to provide
 * specific data.
 *
 * @public
 * @interface
 */
export type Route<
  T = unknown,
  R extends Record<string, unknown> = EmptyRecord,
  C extends Record<string, unknown> = EmptyRecord,
> = R &
  Readonly<{
    /**
     * Contains a list of nested routes.
     */
    readonly children?: ReadonlyArray<Route<T, R, C>> | null;

    /**
     * Represents a URL section of the current route. During the construction
     * of the final URL, it will be added next to the path of the parent route
     * or to the {@link RouterOptions.baseURL | baseURL} if there is no parent
     * route.
     *
     * @remarks
     *
     * You could use all the {@link https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API | URLPattern}
     * capabilities related to `pathname`, like including RegExp instructions into
     * the URL section. However, do not include hash (`#`) and search (`?`) parts,
     * use route action instead.
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
     * Executed each time the route is resolved.
     *
     * The action is a core part of the route concept. Actions are executed from
     * the root route to the child one recursively, and are able to either
     * produce the content or execute something before or after the child
     * action.
     *
     * If the action is not defined, resolution algorithm will simply return
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
     * This code will print:
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
export type RouterContext<
  T = unknown,
  R extends Record<string, unknown> = EmptyRecord,
  C extends Record<string, unknown> = EmptyRecord,
> = C &
  Readonly<{
    /**
     * A sequence of routes connecting the root route to the resolved leaf
     * route. For convenience, it starts with the leaf route and ends with
     * the root route.
     */
    branch: ReadonlyArray<Route<T, R, C>>;
    /**
     * A result of the current resolution. It is an object returned by
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
     * The method that will execute an action of the next route in the
     * resolution chain.
     */
    next(): Promise<T | null | undefined>;
  }>;

/**
 * An error handler function signature.
 *
 * @typeParam T - a value for an {@link Route.action} to return.
 * @typeParam R - an extension for the Route type to provide specific data.
 * @typeParam C - an extension for the {@link RouterContext} type to provide
 * specific data.
 *
 * @returns A result that will be delivered to the {@link Router.resolve}
 * method. In this case, the error handler is just another specific
 * {@link Route.action}.
 *
 * @public
 */
export type RouterErrorHandler<
  T = unknown,
  R extends Record<string, unknown> = EmptyRecord,
  C extends Record<string, unknown> = EmptyRecord,
> = (
  context: Readonly<{
    error: unknown;
  }> &
    RouterContext<T, R, C>,
) => ActionResult<T>;

/**
 * @public
 * @interface
 */
export type RouterOptions<
  T = unknown,
  R extends Record<string, unknown> = EmptyRecord,
  C extends Record<string, unknown> = EmptyRecord,
> = Readonly<{
  baseURL?: URL | string;
  hash?: boolean;
  errorHandler?: RouterErrorHandler<T, R, C>;
}>;

/**
 * @public
 */
export class RouterError extends Error {
  readonly status: number;

  constructor(status: number, url?: URL, options?: ErrorOptions) {
    super(url?.toString(), options);
    this.status = status;
  }
}

/**
 * Describes a route object.
 *
 * @typeParam T - a value for an {@link Route.action | action} to return.
 * @typeParam R - an extension for the Route type to provide specific data.
 * @typeParam C - an extension for the {@link RouterContext} type to provide
 * specific data.
 *
 * @public available since version 1.0.0.
 */
export class Router<
  T = unknown,
  R extends Record<string, unknown> = EmptyRecord,
  C extends Record<string, unknown> = EmptyRecord,
> {
  readonly #routes: ReadonlyArray<Route<T, R, C>>;
  readonly #patterns = new Map<URLPattern, ReadonlyArray<Route<T, R, C>>>();
  readonly #options: RouterOptions<T, R, C>;
  readonly #baseURL: string;

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

  get routes(): ReadonlyArray<Route<T, R, C>> {
    return this.#routes;
  }

  get options(): RouterOptions<T, R, C> {
    return this.#options;
  }

  /**
   *
   * @param path -
   * @param context -
   */
  async resolve(path: URL | string, ...context: Optional<C>): Promise<T | null | undefined>;
  async resolve(path: URL | string, context?: C): Promise<T | null | undefined> {
    const url = new URL(path, this.#baseURL);

    for (const [pattern, branch] of this.#patterns) {
      const result = pattern.exec(url);

      if (result) {
        const reversedBranch = branch.slice().reverse();
        const iter = branch.values();

        const next = async (): Promise<T | null | undefined> => {
          const { done, value } = iter.next();

          if (done) {
            return undefined;
          }

          if (!value.action) {
            return next();
          }

          const routeCtx = {
            ...context!,
            branch: reversedBranch,
            next,
            result,
            router: this,
            url,
          };

          try {
            return await value.action(routeCtx);
          } catch (e: unknown) {
            if (this.#options.errorHandler) {
              return this.#options.errorHandler({ ...routeCtx, error: e });
            }

            throw e;
          }
        };

        return next();
      }
    }

    throw new RouterError(404, url);
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
