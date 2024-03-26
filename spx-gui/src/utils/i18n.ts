/**
 * @desc Simple i18n tool for vue
 */

import { inject, type App, type InjectionKey, type ObjectPlugin, type VNode, ref, type Ref } from 'vue'

export type Lang = 'en' | 'zh'

export type LocaleMessageValue = string | VNode

export type RawLocaleMessage<T extends LocaleMessageValue = string> = Record<Lang, T>

export type FunctionLocaleMessage<
  Args extends any[],
  T extends LocaleMessageValue = string
> = Record<Lang, ((...args: Args) => T) | undefined>

export type LocaleMessage<T extends LocaleMessageValue = string, Args extends any[] = []> =
  | RawLocaleMessage<T>
  | FunctionLocaleMessage<Args, T>

export interface I18nConfig {
  /** Initial lang */
  lang: Lang
}

declare module 'vue' {
  interface ComponentCustomProperties {
    _t: InstanceType<typeof I18n>['t']
  }
}

const injectKey: InjectionKey<I18n> = Symbol('i18n')

export class I18n implements ObjectPlugin<[]> {

  /** Current language */
  private lang: Ref<Lang>

  constructor({ lang }: I18nConfig) {
    this.lang = ref(lang)
    this.t = this.t.bind(this)
  }

  /** Set current language */
  setLang(lang: Lang) {
    this.lang.value = lang
  }

  /** Translate */
  t<T extends LocaleMessageValue>(message: RawLocaleMessage<T>): T
  t<T extends LocaleMessageValue>(message: RawLocaleMessage<T> | null): T | null
  t<T extends LocaleMessageValue, Args extends any[]>(message: LocaleMessage<T, Args>, ...args: Args): T
  t<T extends LocaleMessageValue, Args extends any[]>(message: LocaleMessage<T, Args> | null, ...args: Args): T | null
  t(message: LocaleMessage<LocaleMessageValue, unknown[]> | null, ...args: unknown[]) {
    if (message == null) return null
    const val = message[this.lang.value]
    if (typeof val === 'function') {
      return (val as any)(...args)
    }
    return val
  }

  /** Hook for vue */
  install(app: App<unknown>) {
    app.provide(injectKey, this)
    app.config.globalProperties._t = this.t
  }
}

export function createI18n(config: I18nConfig) {
  return new I18n(config)
}

export function useI18n() {
  const i18n = inject(injectKey)
  if (i18n == null) throw new Error('i18n not used')
  return i18n
}

export function mapMessageValues<
  Message extends LocaleMessage<LocaleMessageValue, any[]>,
  T extends LocaleMessageValue
>(message: Message, process: (value: Message[keyof Message], lang: Lang) => T) {
  return keysOf(message).reduce((acc, cur) => {
    const value = message[cur]
    const lang = cur as Lang
    acc[lang] = process(value, lang)
    return acc
  }, {} as RawLocaleMessage<T>)
}

function keysOf<T extends {}>(target: T): Array<keyof T> {
  return Object.keys(target) as any
}
