import { z } from 'zod'
import { defineComponent, watch } from 'vue'
import { useCodeEditorRef, stringifyDefinitionId } from '@/components/xgo-code-editor'

export const tagName = 'api-reference-filter'

export const isRaw = false

export const description = 'Narrow the "API References" panel to only the listed APIs.'

export const detailedDescription = `Narrow the "API References" panel (left of the code editor) to only the listed \
APIs, to focus the user during a guided step. \`ids\` is a comma-separated list of API definition IDs — get the exact \
IDs from the \`list_api_reference_items\` tool. Use \`ids=""\` to show all APIs again. Re-emit this element with a new \
list whenever the relevant APIs change or you previously made a mistake — the latest one wins. For example, \
<${tagName} ids="xgo:github.com/goplus/spx/v2?Sprite.say#0,xgo:github.com/goplus/spx/v2?Game.onStart" /> keeps only \
those two APIs visible.`

export const attributes = z.object({
  ids: z
    .string()
    .describe(
      'Comma-separated API definition IDs to keep visible (from list_api_reference_items). Empty string shows all.'
    )
})

export type Props = {
  /** Comma-separated API definition IDs to keep visible. Empty string shows all. */
  ids: string
}

export default defineComponent<Props>(
  (props) => {
    const codeEditorRef = useCodeEditorRef()

    function apply() {
      const codeEditor = codeEditorRef.value
      if (codeEditor == null) return
      const ids = props.ids
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id !== '')
      if (ids.length === 0) {
        codeEditor.setAPIReferenceFilter(null)
        return
      }
      const allow = new Set(ids)
      codeEditor.setAPIReferenceFilter((item) => allow.has(stringifyDefinitionId(item.definition)))
    }

    // Re-apply on initial render, when the editor becomes available (it may mount later than this
    // element), and when the copilot updates the element with a new `ids` prop.
    watch([codeEditorRef, () => props.ids], apply, { immediate: true })

    return function render() {
      return null
    }
  },
  {
    name: 'ApiReferenceFilter',
    props: {
      ids: {
        type: String,
        default: ''
      }
    }
  }
)
