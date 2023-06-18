// eslint-disable-next-line @typescript-eslint/triple-slash-reference,spaced-comment
/// <reference types="urlpattern-polyfill" />
import type { EmptyRecord, Optional } from './types.js';

export type ActionResult<T> = Promise<T | null | undefined> | T | null | undefined;

export type Route<
  T = unknown,
  X extends Record<string, unknown> = EmptyRecord,
  C extends Record<string, unknown> = EmptyRecord,
> = Readonly<{
  readonly children?: ReadonlyArray<Route<T, X, C>> | null;
  readonly path: string;
  action?(this: Route<T, X, C>, context: RouteContext<T, X, C>): ActionResult<T>;
}> &
  X;

export type RouteContext<
  T = unknown,
  X extends Record<string, unknown> = EmptyRecord,
  C extends Record<string, unknown> = EmptyRecord,
> = C &
  Readonly<{
    params: Readonly<Record<string, string | undefined>>;
    parents: ReadonlyArray<Route<T, X, C>>;
    route: Route<T, X, C>;
    router: Router<T, X, C>;
    url: URL;
    next(): Promise<T | null | undefined>;
  }>;

export type RouterErrorHandler<T = unknown, C extends Record<string, unknown> = EmptyRecord> = (
  path: URL,
  error: unknown,
  context: C,
) => ActionResult<T>;

export type RouterOptions<T = unknown, C extends Record<string, unknown> = EmptyRecord> = Readonly<{
  baseURL?: URL | string;
  hash?: boolean;
  errorHandler?: RouterErrorHandler<T, C>;
}>;

export class RouterError extends Error {
  readonly status: number;

  constructor(status: number, url?: URL, options?: ErrorOptions) {
    super(url?.toString(), options);
    this.status = status;
  }
}

export class Router<
  T = unknown,
  X extends Record<string, unknown> = EmptyRecord,
  C extends Record<string, unknown> = EmptyRecord,
> {
  readonly #routes: ReadonlyArray<Route<T, X, C>>;
  readonly #patterns = new Map<URLPattern, ReadonlyArray<Route<T, X, C>>>();
  readonly #options: RouterOptions<T, C>;
  readonly #baseURL: string;

  constructor(routes: ReadonlyArray<Route<T, X, C>> | Route<T, X, C>, options: RouterOptions<T, C> = {}) {
    this.#routes = Array.isArray(routes) ? routes : [routes];
    this.#options = options;
    this.#baseURL = String(this.#options.baseURL ?? location.origin);

    for (const chain of this.#traverse(this.#routes)) {
      const route = chain.at(-1)!;

      if (!route.children?.length) {
        this.#patterns.set(
          new URLPattern(
            `${this.#baseURL}/${this.#options.hash ? '#/' : ''}${chain
              .map((r) => r.path.replace(/^\/*(.*)\/*/u, '$1'))
              .filter(Boolean)
              .join('/')}${this.#options.hash ? '' : '\\?*#*'}`,
          ),
          chain,
        );
      }
    }
  }

  get routes(): ReadonlyArray<Route<T, X, C>> {
    return this.#routes;
  }

  get options(): RouterOptions<T, C> {
    return this.#options;
  }

  async resolve(path: URL | string, context: Optional<C>): Promise<T | null | undefined> {
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
                ...(context as C),
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
    routes: ReadonlyArray<Route<T, X, C>>,
    parents: ReadonlyArray<Route<T, X, C>> = [],
  ): Generator<ReadonlyArray<Route<T, X, C>>, void, void> {
    for (const route of routes) {
      const chain = [...parents, route];

      yield chain;

      if (route.children) {
        yield* this.#traverse(route.children, chain);
      }
    }
  }
}
