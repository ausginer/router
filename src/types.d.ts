/**
 * Represents an empty object.
 */
export type EmptyRecord = Record<never, never>;

/**
 * Represents a parameter that should be optional depending on the generic `T`
 * type provided. If `T` is the {@link EmptyRecord}, providing the parameter is
 * forbidden; otherwise, it is required.
 */
export type Optional<T extends Record<string, unknown>> = keyof T extends never ? [] : [T];
