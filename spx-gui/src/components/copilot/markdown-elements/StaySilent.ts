import { z } from 'zod'
import { defineComponent, h } from 'vue'
import { useI18n } from '@/utils/i18n'
import { isDeveloperMode } from '@/utils/developer-mode'

export const tagName = 'stay-silent'

export const isRaw = false

export const description = 'Respond without saying anything to the user.'

export const detailedDescription = `Respond without saying anything to the user. When you decide no reaction is \
needed (see the topic instructions for when staying silent is expected), reply with exactly <${tagName} /> and \
nothing else — no other text, elements or tool calls. The user will not see the reply at all. Do NOT use this \
element when the user asks you something directly — a direct question always deserves an answer.`

export const attributes = z.object({})

const staySilentPattern = new RegExp(`<${tagName}\\b[^>]*/?>`, 'g')

/** Whether copilot message content displays nothing: empty, or only `stay-silent` elements. */
export function isSilentContent(content: string): boolean {
  return content.replace(staySilentPattern, '').trim() === ''
}

export type Props = {}

export default defineComponent<Props>(
  () => {
    const i18n = useI18n()

    return function render() {
      // Silent rounds are skipped by the chat UI entirely; this fallback rendering is only ever
      // visible in developer mode, where suppressed rounds are shown for prompt debugging.
      if (!isDeveloperMode.value) return null
      return h(
        'span',
        { class: 'text-xs text-hint-2' },
        i18n.t({ en: '(Copilot stays silent)', zh: '（Copilot 保持沉默）' })
      )
    }
  },
  {
    name: 'StaySilent',
    props: {}
  }
)
