# i18n

Simple i18n tool for vue.

## Usage

### Init & set language

```ts
import { createI18n, useI18n } from './utils/i18n'

// Install in Vue app
app.use(
  createI18n({
    lang: 'en'
  })
)

// set language
const i18n = useI18n()
i18n.setLang('zh')
```

### Do translation in template of SFC

```vue
<button>
  {{$t({ en: 'Sign in', zh: '登录' })}}
</button>
```

### Do translation in setup script

```ts
import { useI18n } from '@/utils/i18n'

const { t } = useI18n()

const signoutText = t({ en: 'Sign out', zh: '登出' })
```

### Locale Message Functions

Locale-message-functions are functions that return locale message. It is useful when extra information is needed when constructing locale messages. For example:

```ts
const projectSummaryMessage = (num: number) => ({
  en: `You have ${num} project${num > 1 ? 's' : ''}`,
  zh: `你有 ${num} 个项目`
})

const projectSummary = t(projectSummaryMessage(3)) // "You have 3 projects" / "你有 3 个项目"
```

It's like [interpolations](https://vue-i18n.intlify.dev/guide/essentials/syntax.html#interpolations) in vue-i18n, but simpler & more powerful.

### `mapMessage`

Messages are more complex than texts, which makes messages operation more difficult that text operation. Fo example, we can join texts simply with string `+` or template strings (or even array `join`):

```ts
const helloText = 'Hello'
console.log(helloText + ' foo')
```

But it is not easy to do similar thing with messages. `mapMessage` aims to help:

```ts
const helloMessage = {
  en: 'Hello',
  zh: '你好'
}
const resultMessage = mapMessage(helloMessage, hello => hello + ' foo')
console.log(t(resultMessage)) // "Hello foo" / "你好 foo"
```
