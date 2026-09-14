import { z } from 'zod'
import { defineComponent, watch } from 'vue'
import { useCodeEditorRef, stringifyDefinitionId } from '@/components/xgo-code-editor'

export const tagName = 'api-reference-filter'

export const isRaw = false

export const description = 'Narrow the "API References" panel to only the listed APIs.'

export const detailedDescription = `Narrow the "API References" panel (left of the code editor) to only the listed \
APIs, to focus the user during a guided step. \`ids\` is a comma-separated list of API definition IDs — get the exact \
IDs from the \`list_api_reference_items\` tool. The filter stays effective on its own: do NOT re-emit this element \
unless you intend to CHANGE the visible set (then the latest one wins). Use \`ids="*"\` to show all APIs again; an \
empty \`ids\` does nothing. For example, \
<${tagName} ids="xgo:github.com/goplus/spx/v2?Sprite.say#0,xgo:github.com/goplus/spx/v2?Game.onStart" /> keeps only \
those two APIs visible.`

export const attributes = z.object({
  ids: z
    .string()
    .describe(
      'Comma-separated API definition IDs to keep visible (from list_api_reference_items). "*" shows all; empty does nothing.'
    )
})

export type Props = {
  /** Comma-separated API definition IDs to keep visible. `*` shows all; empty string does nothing. */
  ids: string
}

export default defineComponent<Props>(
  (props) => {
    const codeEditorRef = useCodeEditorRef()

    function apply() {
      const codeEditor = codeEditorRef.value
      if (codeEditor == null) return
      // An empty `ids` is a no-op rather than a reset: the model tends to re-emit the element
      // with an empty attribute on later rounds, which must not tear down the existing filter.
      // Showing all APIs again requires the explicit `*`.
      if (props.ids.trim() === '') return
      if (props.ids.trim() === '*') {
        codeEditor.setAPIReferenceFilter(null)
        return
      }
      const ids = props.ids
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id !== '')
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
