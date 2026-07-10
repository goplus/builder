import { z } from 'zod'
import { defineComponent, h } from 'vue'
import { useI18n } from '@/utils/i18n'
import { isDeveloperMode } from '@/utils/developer-mode'

export const tagName = 'stay-silent'

export const isRaw = false

export const description = 'Respond without saying anything to the user.'

export const detailedDescription = `Respond without saying anything to the user. When you decide no reaction is \
needed (see the topic instructions for when staying silent is expected), reply with exactly <${tagName} /> and \
nothing else — no other text (not even your reasoning for staying silent), elements or tool calls. Any reply \
containing this element is hidden from the user entirely, INCLUDING whatever text surrounds it. Do NOT use this \
element when the user sends you a message directly — anything they typed always deserves a response.`

export const attributes = z.object({})

const staySilentPattern = new RegExp(`<${tagName}\\b[^>]*/?>`)

/**
 * Whether copilot message content should be treated as silence. The protocol requires
 * `stay-silent` to be the entire reply; when the model emits it anyway alongside other text,
 * that text is leaked reasoning (never meant for the user), so the presence of the element
 * counts as silence regardless of what surrounds it.
 */
export function isSilentContent(content: string): boolean {
  return staySilentPattern.test(content) || content.trim() === ''
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
