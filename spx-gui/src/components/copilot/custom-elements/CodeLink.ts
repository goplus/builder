import { z } from 'zod'
import { defineComponent, h } from 'vue'
import { type Range, type Position } from '@/components/editor/code-editor/common'
import RawCodeLink from '@/components/editor/code-editor/CodeLink.vue'

export const tagName = 'code-link'

export const description = 'Display a link to a code location in the project.'

export const detailedDescription = `Display a link to a code location in the project. By clicking on the link, \
the user will be navigated to the code location. A location can be a position or a range. For example, \
<pre is="code-link" file="file:///NiuXiaoQi.spx" position="10,20" text="L10,C20"></pre> will create a link to \
line 10, column 20 in the file "NiuXiaoQi.spx" with text "L10,C20".`

export const attributes = z.object({
  file: z.string().describe('Text document URI, e.g., `file:///NiuXiaoQi.spx`'),
  position: z.string().describe('Position in the document, `${line},${column}`, e.g., `10,20`'),
  range: z
    .string()
    .describe('Range in the document, `${startLine},${startColumn}-${endLine},${endColumn}`, e.g., `10,20-12,10`')
})

export type Props = {
  /** Text document URI, e.g., `file:///NiuXiaoQi.spx` */
  file: string
  /** Link text */
  text?: string
  /** `${line},${column}`, e.g., `10,20` */
  position?: string
  /** `${startLine},${startColumn}-${endLine},${endColumn}`, e.g., `10,20-12,10` */
  range?: string
}

export default defineComponent<Props>(
  (props, { slots }) => {
    return function render() {
      // We use render function to define `CodeLink` to properly pass `slots` to `RawCodeLink`
      return h(
        RawCodeLink,
        {
          file: { uri: props.file },
          position: parsePosition(props.position),
          range: parseRange(props.range)
        },
        slots
      )
    }
  },
  {
    name: 'CodeLink',
    props: {
      file: {
        type: String,
        required: true
      },
      position: {
        type: String,
        required: false,
        default: undefined
      },
      range: {
        type: String,
        required: false,
        default: undefined
      }
    }
  }
)

function parsePosition(positionStr: string | undefined): Position | undefined {
  if (positionStr == null || positionStr === '') return undefined
  const [line, column] = positionStr.split(',').map((p) => parseInt(p.trim(), 10))
  return { line, column }
}

function parseRange(rangeStr: string | undefined): Range | undefined {
  if (rangeStr == null || rangeStr === '') return undefined
  const [start, end] = rangeStr.split('-').map(parsePosition)
  if (start == null || end == null) return undefined
  return { start, end }
}
