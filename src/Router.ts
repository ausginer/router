// eslint-disable-next-line @typescript-eslint/triple-slash-reference,spaced-comment
/// <reference types="urlpattern-polyfill" />
export type RouteResult<T = unknown> = Promise<T | null | undefined> | T | null | undefined;

export type RouteContext<R = unknown, C = unknown> = Readonly<{
  context?: C | null;
  router: Router<R, C>;
  route: Route<R, C>;
  parent: Route<R, C> | null;
  params: Readonly<Record<string, string | undefined>>;
  url: URL;
  next(): RouteResult<R> | undefined;
}>;

export type Route<R = unknown, C = unknown> = Readonly<{
  children?: ReadonlyArray<Route<R, C>> | null;
  path: string;
  action?(context: RouteContext<R, C>): RouteResult<R>;
}>;

export type RouterErrorHandler<R = unknown, C = unknown> = (
  path: URL,
  error: RouterError,
  context?: C | null,
) => RouteResult<R>;

export type RouterOptions<R = unknown, C = unknown> = Readonly<{
  baseURL?: URL | string;
  errorHandler?: RouterErrorHandler<R, C>;
}>;

export class RouterError extends Error {
  readonly status: number;

  constructor(status: number, message?: string, options?: ErrorOptions) {
    super(message, options);
    this.status = status;
  }
}

type CopyableURLPatternProperties = keyof Omit<URLPattern, 'exec' | 'test'>;

export default class Router<R = unknown, C = unknown> {
  readonly #routes: ReadonlyArray<Route<R, C>>;
  readonly #patterns = new WeakMap<Route<R, C>, URLPattern>();
  readonly #options?: RouterOptions<R, C>;
  readonly #baseURL: string;

  constructor(routes: ReadonlyArray<Route<R, C>> | Route<R, C>, options?: RouterOptions<R, C>) {
    this.#routes = Array.isArray(routes) ? (routes as ReadonlyArray<Route<R, C>>) : [routes as Route<R, C>];
    this.#options = options;
    this.#baseURL = String(this.#options?.baseURL ?? location.origin);
    this.#patternize(this.#routes, [this.#baseURL]);
  }

  async resolve(path: URL | string, context?: C | null): Promise<RouteResult<R>> {
    try {
      return await this.#resolve(path, this.#routes, null, context);
    } catch (e: unknown) {
      if (e instanceof RouterError && this.#options?.errorHandler) {
        return this.#options.errorHandler(new URL(path, this.#baseURL), e, context);
      }

      throw e;
    }
  }

  #patternize(routes: ReadonlyArray<Route<R, C>>, parents: readonly string[] = []): void {
    for (const route of routes) {
      const path = [...parents, route.path];
      if (route.children?.length) {
        this.#patternize(route.children, path);
        path.push('*');
      }
      const pattern = new URLPattern(
        path
          .map((p) => p.replace(/^\/*(.*)\/*/u, '$1'))
          .filter(Boolean)
          .join('/'),
      );
      const init: URLPatternInit = {};

      // eslint-disable-next-line no-restricted-syntax
      for (const propertyName in pattern)
        init[propertyName as CopyableURLPatternProperties] = pattern[propertyName as CopyableURLPatternProperties]
          ? pattern[propertyName as CopyableURLPatternProperties]
          : '*';

      this.#patterns.set(route, new URLPattern(init));
    }
  }

  async #resolve(
    path: URL | string,
    routes: ReadonlyArray<Route<R, C>>,
    parent: Route<R, C> | null,
    context: C | null | undefined,
  ): Promise<RouteResult<R>> {
    const url = new URL(path, this.#baseURL);

    for (const route of routes) {
      // There cannot be a router without appropriate pattern, so we can safely suppress null
      const result = this.#patterns.get(route)!.exec(url);

      if (result) {
        const next = async () => (route.children ? this.#resolve(path, route.children, route, context) : undefined);

        return (
          route.action?.({
            context,
            next,
            params: result.pathname.groups,
            parent,
            route,
            router: this,
            url,
          }) ?? next()
        );
      }
    }

    throw new RouterError(404, `Page ${String(url)} is not found`);
  }
}
