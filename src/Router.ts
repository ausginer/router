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
     * A collection of URL {@link https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API#fixed_text_and_capture_groups | capture groups}.
     */
    groups: Readonly<Record<string, string | undefined>>;
    /**
     * A sequence of the route's parents resolved from root to leaf. The first
     * one is the root route, the last one is the final leaf route.
     */
    parents: ReadonlyArray<Route<T, R, C>>;
    /**
     * The final route in the resolution chain.
     */
    route: Route<T, R, C>;
    /**
     * The router instance.
     */
    router: Router<T, R, C>;
    /**
     * The URL being resolved.
     */
    url: URL;
    /**
     * The method that will execute an action of the next (child) route in the
     * resolution chain.
     */
    next(): Promise<T | null | undefined>;
  }>;

/**
 * An error handler function signature.
 *
 * @public
 */
export type RouterErrorHandler<T = unknown, C extends Record<string, unknown> = EmptyRecord> = (
  path: URL,
  error: unknown,
  context: C,
) => ActionResult<T>;

/**
 * @public
 * @interface
 */
export type RouterOptions<T = unknown, C extends Record<string, unknown> = EmptyRecord> = Readonly<{
  baseURL?: URL | string;
  hash?: boolean;
  errorHandler?: RouterErrorHandler<T, C>;
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
  readonly #options: RouterOptions<T, C>;
  readonly #baseURL: string;

  constructor(routes: ReadonlyArray<Route<T, R, C>> | Route<T, R, C>, options: RouterOptions<T, C> = {}) {
    this.#routes = Array.isArray(routes) ? routes : [routes];
    this.#options = options;
    this.#baseURL = String(this.#options.baseURL ?? location.origin);

    for (const chain of this.#traverse(this.#routes)) {
      const route = chain.at(-1)!;

      if (!route.children?.length) {
        this.#patterns.set(
          new URLPattern(
            `${this.#options.hash ? '#/' : ''}${chain
              .map((r) => r.path.replace(/^\/*(.*)\/*/u, '$1'))
              .filter(Boolean)
              .join('/')}${this.#options.hash ? '' : '\\?*#*'}`,
            this.#baseURL,
          ),
          chain,
        );
      }
    }
  }

  get routes(): ReadonlyArray<Route<T, R, C>> {
    return this.#routes;
  }

  get options(): RouterOptions<T, C> {
    return this.#options;
  }

  /**
   *
   * @param path -
   * @param context -
   */
  resolve(path: URL | string, ...context: Optional<C>): Promise<T | null | undefined>;
  resolve(path: URL | string, context?: C): Promise<T | null | undefined> {
    const url = new URL(path, this.#baseURL);

    for (const [pattern, chain] of this.#patterns) {
      const result = pattern.exec(url);

      if (result) {
        const iter = chain.values();
        const next = async (): Promise<T | null | undefined> => {
          const { done, value } = iter.next();

          return done
            ? undefined
            : value.action?.({
                ...context!,
                groups: result.pathname.groups,
                next,
                parents: chain,
                route: chain.at(-1)!,
                router: this,
                url,
              }) ?? next();
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
