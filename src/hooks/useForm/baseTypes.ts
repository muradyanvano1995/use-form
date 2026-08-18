/**
 * Nested field-path typing for `useForm`.
 *
 * Plain objects are traversable. Arrays of primitives/Files/objects support a single
 * level of numeric index paths (`products.0.name`). Nested arrays inside items are
 * not expanded. Recursion depth is capped at 5 for compiler performance.
 */

export type FormValues = Record<string, unknown>

type Primitive = string | number | boolean | bigint | symbol | null | undefined

type BuiltInObject =
  | Date
  | File
  | Blob
  | FileList
  | RegExp
  | Error
  | ArrayBuffer
  | DataView
  | ((...args: never[]) => unknown)
  | Map<unknown, unknown>
  | Set<unknown>
  | WeakMap<object, unknown>
  | WeakSet<object>
  | Promise<unknown>

/**
 * Depth counter for path expansion (max 5 nested object levels below the root).
 * Increase carefully — deeper unions hurt editor performance.
 */
type PathDepth = [never, 0, 1, 2, 3, 4, 5]

type IsPlainObjectType<T> =
  NonNullable<T> extends object
    ? NonNullable<T> extends Primitive | BuiltInObject | ReadonlyArray<unknown>
      ? false
      : true
    : false

/** Paths into plain objects only — arrays are atomic leaves (blocks nested arrays). */
type ObjectOnlyFieldPath<T, Depth extends number = 5> = [Depth] extends [never]
  ? never
  : {
      [K in Extract<keyof T, string>]: IsPlainObjectType<T[K]> extends true
        ? `${K}` | `${K}.${ObjectOnlyFieldPath<NonNullable<T[K]>, PathDepth[Depth]>}`
        : `${K}`
    }[Extract<keyof T, string>]

type ArrayIndexPaths<U, Depth extends number> =
  IsPlainObjectType<U> extends true
    ? `${number}` | `${number}.${ObjectOnlyFieldPath<NonNullable<U>, PathDepth[Depth]>}`
    : `${number}`

/**
 * Dot-separated paths into plain nested objects and one level of array indices.
 * Includes intermediate object paths (`'address'`) and leaf paths (`'address.city'`).
 * Includes array paths (`'products'`) and indexed paths (`'products.0.name'`).
 * Optional objects (`company?: { name: string }`) still expand nested paths.
 */
export type FieldPath<T, Depth extends number = 5> = [Depth] extends [never]
  ? never
  : {
      [K in Extract<keyof T, string>]: NonNullable<T[K]> extends ReadonlyArray<infer U>
        ? `${K}` | `${K}.${ArrayIndexPaths<U, Depth>}`
        : IsPlainObjectType<T[K]> extends true
          ? `${K}` | `${K}.${FieldPath<NonNullable<T[K]>, PathDepth[Depth]>}`
          : `${K}`
    }[Extract<keyof T, string>]

/** Compatible alias of {@link FieldPath} for flatter call sites. */
export type FieldName<T extends FormValues> = FieldPath<T>

type NestedOptionalPaths<V, Depth extends number> =
  IsPlainObjectType<V> extends true
    ? OptionalFieldPath<NonNullable<V>, PathDepth[Depth]>
    : V extends ReadonlyArray<infer U>
      ? OptionalArrayIndexPaths<U, Depth>
      : never

/**
 * Indexed paths that are themselves optional.
 *
 * - Optional item values (`(string | undefined)[]`) expose `'0'`
 * - Optional properties inside object items expose `'0.note'`
 * - A required index of an optional array (`tags?: string[]`) is **not** included —
 *   the array can be absent, but an item cannot be deleted independently
 */
type OptionalArrayIndexPaths<U, Depth extends number> =
  IsPlainObjectType<U> extends true
    ? `${number}.${OptionalFieldPath<NonNullable<U>, PathDepth[Depth]>}`
    : undefined extends U
      ? `${number}`
      : never

/**
 * Paths whose **exact** property may be absent from a type-correct `TInput`.
 *
 * Includes:
 * - optional / `| undefined` properties (`company`, `nickname`)
 * - optional nested leaves under required or optional parents (`address.unit`, `company.note`)
 * - optional properties inside array items (`extras.0.note`)
 *
 * Does **not** include required children of an optional parent (`company.taxNumber`).
 * Unregister that parent (`company`) instead of deleting a required nested key.
 *
 * Destructive unregister (`keepValue: false` / `shouldUnregister: true`) is typed
 * against this set so required runtime properties cannot disappear silently.
 */
export type OptionalFieldPath<T, Depth extends number = 5> = [Depth] extends [never]
  ? never
  : {
      [K in Extract<keyof T, string>]:
        | (undefined extends T[K] ? K : never)
        | (NestedOptionalPaths<NonNullable<T[K]>, Depth> extends infer Rest
            ? [Rest] extends [never]
              ? never
              : Rest extends string
                ? `${K}.${Rest}`
                : never
            : never)
    }[Extract<keyof T, string>]

type PathValueContinue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends `${number}`
    ? NonNullable<T> extends ReadonlyArray<infer U>
      ? PathValueContinue<U, Rest>
      : never
    : K extends keyof NonNullable<T>
      ? PathValueContinue<NonNullable<T>[K], Rest>
      : never
  : P extends `${number}`
    ? NonNullable<T> extends ReadonlyArray<infer U>
      ? U
      : never
    : P extends keyof NonNullable<T>
      ? NonNullable<T>[P]
      : never

/** Value located at a typed field path (including numeric array indices). */
export type FieldPathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof NonNullable<T>
    ? PathValueContinue<NonNullable<T>[K], Rest>
    : never
  : P extends keyof NonNullable<T>
    ? NonNullable<T>[P]
    : never

/**
 * Paths that point at array values (flat or nested under plain objects).
 * Does not include indexed item paths (`products.0`).
 */
export type FieldArrayPath<T, Depth extends number = 5> = [Depth] extends [never]
  ? never
  : {
      [K in Extract<keyof T, string>]: NonNullable<T[K]> extends ReadonlyArray<unknown>
        ? `${K}`
        : IsPlainObjectType<T[K]> extends true
          ? `${K}.${FieldArrayPath<NonNullable<T[K]>, PathDepth[Depth]>}`
          : never
    }[Extract<keyof T, string>]

/** Element type of the array at `P`. */
export type FieldArrayItem<T, P extends FieldArrayPath<T>> =
  FieldPathValue<T, P> extends ReadonlyArray<infer U> ? U : never

/** Deep partial for nested plain objects; arrays and atomic values stay shallow. */
export type DeepPartial<T> = T extends Primitive | BuiltInObject
  ? T
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<U>
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T
