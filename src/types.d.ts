export type EmptyRecord = Record<never, never>;
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type Optional<T extends Record<string, unknown>> = keyof T extends never ? void : T;
