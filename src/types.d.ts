/**
 * Represents an empty object.
 */
export type EmptyRecord = Record<never, never>;

/**
 * Represents a parameter that should be optional depending on the generic `C`
 * type provided. If `C` is the {@link EmptyRecord}, providing the parameter is
 * forbidden; otherwise, it is required.
 */
export type Optional<T extends Record<string, unknown>> = keyof T extends never ? [] : [T];
