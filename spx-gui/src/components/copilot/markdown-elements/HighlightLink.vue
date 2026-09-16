<script lang="ts">
import { z } from 'zod'
import { useSlotText } from '@/utils/vnode'

export const tagName = 'highlight-link'

export const isRaw = false

export const description = 'Create a link that reveals & highlights a specific node in the UI when clicked.'

export const detailedDescription = `Create a link that reveals & highlights a specific node in the UI when clicked. \
Use a Radar selector to specify a visible target node. When it matches multiple nodes, the first one in document order is used. \
Use this element in your output to help users to find the relevant UI element quickly. \
For example, <highlight-link selector="save-button" tip="Click this button to submit">Submit button</highlight-link> \
will create a link with text "Submit button", when clicked, reveals the selected node and shows the tip "Click this button to submit".`

export const attributes = z.object({
  selector: z.string().describe('Radar selector for the linked node'),
  tip: z
    .string()
    .optional()
    .describe('Tip to show when node revealed, typically a description of the UI element in user language')
})
</script>

<script lang="ts" setup>
import { useRadar } from '@/utils/radar'
import { useSpotlight } from '@/utils/spotlight'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  /** Radar selector for the linked node. */
  selector: string
  /** Tip to show when node revealed */
  tip?: string
}>()

const radar = useRadar()
const spotlight = useSpotlight()
const text = useSlotText()

const { fn: handleClick } = useMessageHandle(
  () => {
    const nodeInfo = radar.selectAll(props.selector)[0]
    if (nodeInfo == null) throw new Error(`No visible Radar node matches selector: ${props.selector}`)
    const element = nodeInfo.getElement()
    spotlight.reveal(element, props.tip ?? text.value)
  },
  { en: 'Failed to find the corresponding node.', zh: '未找到对应的节点' }
)
</script>

<template>
  <button
    type="button"
    class="inline-block w-fit cursor-pointer rounded-[4px] border-none bg-turquoise-main px-1.25 py-0.5 text-sm/[normal] text-grey-100 outline-none hover:bg-turquoise-400 active:bg-turquoise-600"
    @click="handleClick"
  >
    {{ text }}
  </button>
</template>
