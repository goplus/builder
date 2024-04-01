/**
 * @desc Simple i18n tool for vue
 */

import { inject, type App, type InjectionKey, type ObjectPlugin, ref, type Ref } from 'vue'

export type Lang = 'en' | 'zh'

// We may also support `VNode` as translated resule in the future, if needed
export type Translated = string

export type LocaleMessage = Record<Lang, Translated>

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
  t(message: LocaleMessage): Translated
  t(message: LocaleMessage | null): Translated | null
  t(message: LocaleMessage | null) {
    if (message == null) return null
    const val = message[this.lang.value]
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

export function mapMessage<M extends LocaleMessage, T>(
  message: M,
  process: (value: M[keyof M], lang: Lang) => T
): Record<Lang, T> {
  return keysOf(message).reduce((acc, cur) => {
    const value = message[cur]
    const lang = cur as Lang
    acc[lang] = process(value, lang)
    return acc
  }, {} as any)
}

function keysOf<T extends {}>(target: T): Array<keyof T> {
  return Object.keys(target) as any
}
