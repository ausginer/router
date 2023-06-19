export type EmptyRecord = Record<never, never>;
export type Optional<T extends Record<string, unknown>> = keyof T extends never ? [] : [T];
