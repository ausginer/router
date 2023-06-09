// eslint-disable-next-line @typescript-eslint/triple-slash-reference,spaced-comment
/// <reference types="urlpattern-polyfill" />
export type ActionResult<T> = Promise<T | null | undefined> | T | null | undefined;

export interface Route<T = unknown, C extends Record<string, unknown> = Record<never, never>> {
  readonly children?: readonly this[] | null;
  readonly path: string;
  action?(context: RouteContext<T, C, this>): ActionResult<T>;
}

export type RouteContext<
  T = unknown,
  C extends Record<string, unknown> = Record<never, never>,
  R extends Route<T, C> = Route<T, C>,
> = C &
  Readonly<{
    params: Readonly<Record<string, string | undefined>>;
    parent: R | null;
    route: R;
    router: Router<R>;
    url: URL;
    next(): Promise<T | null | undefined>;
  }>;

export type RouterErrorHandler<T = unknown, C extends Record<string, unknown> = Record<never, never>> = (
  path: URL,
  error: RouterError,
  context?: C | null,
) => ActionResult<T>;

export type RouterOptions<T = unknown, C extends Record<string, unknown> = Record<never, never>> = Readonly<{
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

type CopyableURLPatternProperties = keyof Omit<URLPattern, 'exec' | 'test'>;

type Output<R> = R extends Route<infer T> ? T : never;
type Context<R> = R extends Route<unknown, infer T> ? T : never;

export default class Router<R extends Route> {
  readonly #routes: readonly R[];
  readonly #patterns = new WeakMap<R, URLPattern>();
  readonly #options?: RouterOptions<Output<R>, Context<R>>;
  readonly #baseURL: string;

  constructor(routes: R | readonly R[], options?: RouterOptions<Output<R>, Context<R>>) {
    this.#routes = Array.isArray(routes) ? (routes as readonly R[]) : [routes as R];
    this.#options = options;
    this.#baseURL = String(this.#options?.baseURL ?? location.origin);
    this.#patternize(this.#routes);
  }

  get routes(): readonly R[] {
    return this.#routes;
  }

  get options(): RouterOptions<Output<R>, Context<R>> | undefined {
    return this.#options;
  }

  async resolve(path: URL | string, context?: Context<R> | null): Promise<Output<R> | null | undefined> {
    try {
      return await this.#resolve(path, this.#routes, null, context);
    } catch (e: unknown) {
      if (e instanceof RouterError && this.#options?.errorHandler) {
        return this.#options.errorHandler(new URL(path, this.#baseURL), e, context);
      }

      throw e;
    }
  }

  #patternize(routes: readonly R[], parents: readonly string[] = []): void {
    for (const route of routes) {
      const pathParts = [...parents, route.path];

      if (route.children?.length) {
        this.#patternize(route.children, pathParts);
        pathParts.push('*');
      }

      const pattern = new URLPattern(
        `${this.#baseURL}/${this.#options?.hash ? '#/' : ''}${pathParts
          .map((p) => p.replace(/^\/*(.*)\/*/u, '$1'))
          .filter(Boolean)
          .join('/')}`,
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
    routes: readonly R[],
    parent: R | null,
    context: Context<R> | null | undefined,
  ): Promise<Output<R> | null | undefined> {
    const url = new URL(path, this.#baseURL);

    for (const route of routes) {
      // There cannot be a router without appropriate pattern, so we can safely suppress null
      const result = this.#patterns.get(route)!.exec(url);

      if (result) {
        const next = async () => (route.children ? this.#resolve(path, route.children, route, context) : undefined);

        return (
          (route.action?.({
            ...context,
            next,
            params: result.pathname.groups,
            parent,
            route,
            router: this,
            url,
          }) as ActionResult<Output<R>>) ?? next()
        );
      }
    }

    throw new RouterError(404, url);
  }
}
