/**
 * @desc Simple i18n tool for vue
 */

import {
  inject,
  type App,
  type InjectionKey,
  type ObjectPlugin,
  ref,
  type Ref,
  type SetupContext,
  type SlotsType
} from 'vue'

export type Lang = 'en' | 'zh'

export function normalizeLang(lang: string): Lang {
  if (lang === 'zh') return 'zh'
  return 'en'
}

// We may also support `VNode` as translated resule in the future, if needed
export type Translated = string

export type LocaleMessage = Record<Lang, Translated>

export interface I18nConfig {
  /** Initial lang */
  lang: Lang
}

export type TranslateFn = InstanceType<typeof I18n>['t']

// Vue's [official document](https://vuejs.org/api/utility-types.html#componentcustomproperties) says we should do
// `declare module 'vue'`. While it does not work as expected. Related issue:
// * https://github.com/vuejs/language-tools/issues/3372
// It does work with `vue/runtime-core` instead of `vue` (it's the way vue-router & vue-i18n do)
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $t: TranslateFn
  }
  interface GlobalComponents {
    I18nT: typeof T
  }
}

const injectKey: InjectionKey<I18n> = Symbol('i18n')

export class I18n implements ObjectPlugin<[]> {
  /** Current language */
  lang: Ref<Lang>

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
    app.config.globalProperties.$t = this.t
    app.component('I18nT', T as any)
  }
}

// NOTE: `T` (also known as `I18nT`) is a suitable choice for translating complex content within templates in Single File Component (SFC).
// It relies on a straightforward mechanism and integrates well with SFC features such as scoped styles.
// If we decide to externalize locale messages from components into separate locale data in the future, we need to:
// 1. Provide support for locale messages of type `VNode`.
// 2. Adjust component code to properly handle potential issues with SFC features like scoped styles.

/**
 * Translate component. Use slot with lang as key to provide translated content. e.g.,
 * ```html
 * <I18nT>
 *   <template #en>English</template>
 *   <template #zh>中文</template>
 * </I18nT>
 * ```
 */
function T(_props: unknown, { slots }: SetupContext<unknown, SlotsType<Record<Lang, any>>>) {
  const i18n = inject(injectKey)
  if (i18n == null) throw new Error('i18n not installed')
  return slots[i18n.lang.value]?.()
}

export function createI18n(config: I18nConfig) {
  return new I18n(config)
}

export function useI18n() {
  const i18n = inject(injectKey)
  if (i18n == null) throw new Error('i18n not installed')
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
