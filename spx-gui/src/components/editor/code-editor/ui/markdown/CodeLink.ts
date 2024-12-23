import { defineComponent, h } from 'vue'
import { type Range, type Position } from '../../common'
import RawCodeLink from '../../CodeLink.vue'

export type Props = {
  /** Text document URI, e.g., `file:///NiuXiaoQi.spx` */
  file: string
  /** `${line},${column}`, e.g., `10,20` */
  position?: string
  /** `${startLine},${startColumn}-${endLine}${endColumn}`, e.g., `10,20-12,10` */
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
