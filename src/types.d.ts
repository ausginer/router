import type { StructuredCloneable } from 'type-fest';

/**
 * Describes the value that could be either be a promise or a plain value.
 *
 * @typeParam T - The type of value.
 *
 * @public
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Matches an object that can be losslessly cloned using `structuredClone`.
 *
 * @public
 */
export type StructuredCloneableObject = object & StructuredCloneable;
