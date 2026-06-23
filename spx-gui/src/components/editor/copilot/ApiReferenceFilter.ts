import { z } from 'zod'
import { defineComponent, onMounted, watch } from 'vue'
import { useCodeEditorRef, parseDefinitionName } from '@/components/xgo-code-editor'

export const tagName = 'api-reference-filter'

export const isRaw = false

export const description = 'Narrow the "API References" panel to only the listed APIs.'

export const detailedDescription = `Narrow the "API References" panel (left of the code editor) to only the listed \
APIs, to focus the user during a guided step. \`names\` is a comma-separated list of API names, as named in the spx \
API reference (e.g. \`onStart\`, \`say\`, \`move\`). Use \`names=""\` to show all APIs again. Re-emit this element with \
a new list whenever the relevant APIs change or you previously made a mistake — the latest one wins. For example, \
<${tagName} names="onStart, say" /> keeps only "onStart" and "say" visible.`

export const attributes = z.object({
  names: z
    .string()
    .describe('Comma-separated API names to keep visible, e.g., `onStart, say, move`. Empty string shows all.')
})

export type Props = {
  /** Comma-separated API names to keep visible. Empty string shows all. */
  names: string
}

export default defineComponent<Props>(
  (props) => {
    const codeEditorRef = useCodeEditorRef()

    function apply() {
      const codeEditor = codeEditorRef.value
      if (codeEditor == null) return
      const names = props.names
        .split(',')
        .map((name) => name.trim().toLowerCase())
        .filter((name) => name !== '')
      if (names.length === 0) {
        codeEditor.setAPIReferenceFilter(null)
        return
      }
      const allow = new Set(names)
      codeEditor.setAPIReferenceFilter((item) => {
        const fullName = item.definition.name
        if (fullName == null) return false
        // Match either the receiver-qualified name (e.g. `Sprite.say`) or the bare method name (`say`),
        // so the model can use the plain names it knows from the spx API reference skill.
        const [, method] = parseDefinitionName(fullName)
        return allow.has(fullName.toLowerCase()) || allow.has(method.toLowerCase())
      })
    }

    onMounted(apply)
    // The editor may become available later than this element; apply again once it is ready.
    watch(codeEditorRef, (codeEditor) => {
      if (codeEditor != null) apply()
    })

    return function render() {
      return null
    }
  },
  {
    name: 'ApiReferenceFilter',
    props: {
      names: {
        type: String,
        default: ''
      }
    }
  }
)
