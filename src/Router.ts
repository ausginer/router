// eslint-disable-next-line @typescript-eslint/triple-slash-reference,spaced-comment
/// <reference types="urlpattern-polyfill" />
export type ActionResult<T> = Promise<T | null | undefined> | T | null | undefined;

export type EmptyRecord = Record<never, never>;

export type Route<
  T = unknown,
  A extends Record<string, unknown> = EmptyRecord,
  C extends Record<string, unknown> = EmptyRecord,
> = A &
  Readonly<{
    readonly children?: ReadonlyArray<Route<T, A, C>> | null;
    readonly path: string;
    action?(context: RouteContext<T, A, C>): ActionResult<T>;
  }>;

export type RouteContext<
  T = unknown,
  A extends Record<string, unknown> = EmptyRecord,
  C extends Record<string, unknown> = EmptyRecord,
> = C &
  Readonly<{
    params: Readonly<Record<string, string | undefined>>;
    parent: Route<T, A, C> | null;
    route: Route<T, A, C>;
    router: Router<T, A, C>;
    url: URL;
    next(): Promise<T | null | undefined>;
  }>;

export type RouterErrorHandler<T = unknown, C extends Record<string, unknown> = EmptyRecord> = (
  path: URL,
  error: RouterError,
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

type CopyableURLPatternProperties = keyof Omit<URLPattern, 'exec' | 'test'>;
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
type OptionalParameter<T extends Record<string, unknown>> = keyof T extends never ? void : T;

export default class Router<
  T = unknown,
  A extends Record<string, unknown> = EmptyRecord,
  C extends Record<string, unknown> = EmptyRecord,
> {
  readonly #routes: ReadonlyArray<Route<T, A, C>>;
  readonly #patterns = new WeakMap<Route<T, A, C>, URLPattern>();
  readonly #options?: RouterOptions<T, C>;
  readonly #baseURL: string;

  constructor(routes: ReadonlyArray<Route<T, A, C>> | Route<T, A, C>, options?: RouterOptions<T, C>) {
    this.#routes = Array.isArray(routes) ? routes : [routes];
    this.#options = options;
    this.#baseURL = String(this.#options?.baseURL ?? location.origin);
    this.#patternize(this.#routes);
  }

  get routes(): ReadonlyArray<Route<T, A, C>> {
    return this.#routes;
  }

  get options(): RouterOptions<T, C> | undefined {
    return this.#options;
  }

  async resolve(path: URL | string, context: OptionalParameter<C>): Promise<T | null | undefined> {
    try {
      return await this.#resolve(path, this.#routes, null, context);
    } catch (e: unknown) {
      if (e instanceof RouterError && this.#options?.errorHandler) {
        return this.#options.errorHandler(new URL(path, this.#baseURL), e, context as C);
      }

      throw e;
    }
  }

  #patternize(routes: ReadonlyArray<Route<T, A, C>>, parents: readonly string[] = []): void {
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
    routes: ReadonlyArray<Route<T, A, C>>,
    parent: Route<T, A, C> | null,
    context: OptionalParameter<C>,
  ): Promise<T | null | undefined> {
    const url = new URL(path, this.#baseURL);

    for (const route of routes) {
      // There cannot be a router without appropriate pattern, so we can safely suppress null
      const result = this.#patterns.get(route)!.exec(url);

      if (result) {
        const next = async () => (route.children ? this.#resolve(path, route.children, route, context) : undefined);

        return (
          route.action?.({
            ...(context as C),
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

    throw new RouterError(404, url);
  }
}
