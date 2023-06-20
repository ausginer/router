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
 * Describes a route object.
 *
 * @typeParam T - a value for an {@link Route.action} to return.
 * @typeParam R - an extension for the Route type to provide specific data.
 * @typeParam C - an extension for the {@link RouteContext} type to provide
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
     * Represents URL section of the current route. During the construction of the
     * final URL, it will be added next to the path of the parent route or to the
     * {@link RouterOptions.baseURL | baseURL} if there is no parent route.
     *
     * @remarks
     *
     * You could use all the {@link https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API | URLPattern}
     * capabilities related to `pathname`, like including RegExp instructions into
     * the URL section. However, do not include hash (`#`) and search (`?`) parts,
     * use route action instead.
     */
    readonly path: string;

    /**
     * Executed each time the route is resolved. It is capable of everything you
     * want: it can render a page or a part of the page, check user permissions,
     * or redirect a user to any other page.
     *
     * @param context - A {@link RouteContext} object.
     *
     * @returns A result that will be delivered to the {@link Router.resolve}
     * method.
     */
    action?(this: Route<T, R, C>, context: RouteContext<T, R, C>): ActionResult<T>;
  }>;

/**
 * Describes a route context object. It contains all the local data that could
 * be helpful to resolve route correctly.
 *
 * @public
 * @interface
 */
export type RouteContext<
  T = unknown,
  R extends Record<string, unknown> = EmptyRecord,
  C extends Record<string, unknown> = EmptyRecord,
> = C &
  Readonly<{
    params: Readonly<Record<string, string | undefined>>;
    parents: ReadonlyArray<Route<T, R, C>>;
    route: Route<T, R, C>;
    router: Router<T, R, C>;
    url: URL;
    next(): Promise<T | null | undefined>;
  }>;

/**
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
 * @typeParam C - an extension for the {@link RouteContext} type to provide
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
                next,
                params: result.pathname.groups,
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
