import { type AllowedComponentProps, type ObjectEmitsOptions, type VNodeProps } from 'vue'

// copied from vue source code
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

// copied from vue source code
type EmitFn<Options = ObjectEmitsOptions, Event extends keyof Options = keyof Options> =
  Options extends Array<infer V>
    ? (event: V, ...args: any[]) => void
    : {} extends Options
      ? (event: string, ...args: any[]) => void
      : UnionToIntersection<
          {
            [key in Event]: Options[key] extends (...args: infer Args) => any
              ? (event: key, ...args: Args) => void
              : Options[key] extends any[]
                ? (event: key, ...args: Options[key]) => void
                : (event: key, ...args: any[]) => void
          }[Event]
        >

/** Vue Component type with given props type & emits type */
export type ComponentDefinition<Props, Emits extends Record<string, any[]>> = {
  new (): {
    $props: Props
    $emit: EmitFn<Emits>
  }
}

type ShortEmitsToProps<Emits extends Record<string, any[]>> = {
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
export type PruneProps<Props, Emits extends Record<string, any[]>> = Omit<
  Props,
  keyof ShortEmitsToProps<Emits> | keyof VNodeProps | keyof AllowedComponentProps
>

/** Prettify a type to make it more readable in IDEs */
export type Prettify<T> = { [K in keyof T]: T[K] } & {}
