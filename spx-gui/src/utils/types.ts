import { type AllowedComponentProps, type EmitFn, type VNodeProps } from 'vue'

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

// At most 8 overloads (event names) are supported, which should be enough for most use cases.
// TypeScript doesn't support infinite overloads, and supporting too many overloads can cause performance issues.
type OverloadedParameters<T> = T extends {
  (...args: infer A1): any
  (...args: infer A2): any
  (...args: infer A3): any
  (...args: infer A4): any
  (...args: infer A5): any
  (...args: infer A6): any
  (...args: infer A7): any
  (...args: infer A8): any
}
  ? A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8
  : T extends {
        (...args: infer A1): any
        (...args: infer A2): any
        (...args: infer A3): any
        (...args: infer A4): any
        (...args: infer A5): any
        (...args: infer A6): any
        (...args: infer A7): any
      }
    ? A1 | A2 | A3 | A4 | A5 | A6 | A7
    : T extends {
          (...args: infer A1): any
          (...args: infer A2): any
          (...args: infer A3): any
          (...args: infer A4): any
          (...args: infer A5): any
          (...args: infer A6): any
        }
      ? A1 | A2 | A3 | A4 | A5 | A6
      : T extends {
            (...args: infer A1): any
            (...args: infer A2): any
            (...args: infer A3): any
            (...args: infer A4): any
            (...args: infer A5): any
          }
        ? A1 | A2 | A3 | A4 | A5
        : T extends {
              (...args: infer A1): any
              (...args: infer A2): any
              (...args: infer A3): any
              (...args: infer A4): any
            }
          ? A1 | A2 | A3 | A4
          : T extends {
                (...args: infer A1): any
                (...args: infer A2): any
                (...args: infer A3): any
              }
            ? A1 | A2 | A3
            : T extends {
                  (...args: infer A1): any
                  (...args: infer A2): any
                }
              ? A1 | A2
              : T extends (...args: infer A) => any
                ? A
                : never

type EmitParamsToEmits<Params> = Params extends [infer Event, ...infer Args]
  ? Event extends PropertyKey
    ? string extends Event
      ? never
      : number extends Event
        ? never
        : symbol extends Event
          ? never
          : { [K in Event]: Args }
    : never
  : never

/** Convert an Emit function type to an emits object type. Inverse operation of `EmitFn`. */
type EmitFnToEmitsObject<T> = Prettify<UnionToIntersection<EmitParamsToEmits<OverloadedParameters<T>>>>

/** Vue Component type with given props type & emits type */
export type ComponentDefinition<Props, Emits> = {
  new (): {
    $props: Props
    $emit: EmitFn<Emits>
  }
}

type ShortEmitsToProps<Emits extends Record<string, any>> = {
  [K in `on${Capitalize<string & keyof Emits>}`]?: K extends `on${infer C}`
    ? (
        ...args: Emits[Uncapitalize<C>] extends (...args: infer P) => any
          ? P
          : Emits[Uncapitalize<C>] extends null
            ? any[]
            : never
      ) => any
    : never
}

/**
 * Extract user-defined props type from result Vue component props type, excluding:
 * - Props generated from emits, like `onUpdate`, `onCancelled`
 * - Props from Vue internal, like `class`, `style`
 * - Props of VNode, like `key`, `ref`
 */
export type PruneProps<Props, Emits extends Record<string, any>> = Prettify<
  Omit<Props, keyof ShortEmitsToProps<Emits> | keyof VNodeProps | keyof AllowedComponentProps>
>

/** Get the emits (object) type of a Vue component. */
export type EmitsForComponent<C> = C extends { new (): { $emit: infer Emit } } ? EmitFnToEmitsObject<Emit> : never

/** Get the props type of a Vue component, excluding emits-generated props and internal props. */
export type PropsForComponent<C> = C extends { new (): { $props: infer Props; $emit: infer Emit } }
  ? PruneProps<Props, EmitFnToEmitsObject<Emit>>
  : never

/** Prettify a type to make it more readable in IDEs */
export type Prettify<T> = { [K in keyof T]: T[K] } & {}

/** Make some keys in T optional */
export type PartialBy<T, K extends keyof T> = Prettify<Omit<T, K> & Partial<Pick<T, K>>>

declare const stringTypeInfo: unique symbol

/** String type carrying compile-time-only type information. */
export type StringWithTypeInfo<T> = string & {
  readonly [stringTypeInfo]?: T
}
