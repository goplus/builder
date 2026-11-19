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
import InlineActionBtn from './common/InlineActionBtn.vue'

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
    const nodeInfo = radar.select(props.selector)
    if (nodeInfo == null) throw new Error(`No visible Radar node matches selector: ${props.selector}`)
    const element = nodeInfo.getElement()
    spotlight.reveal(element, { tip: props.tip ?? text.value })
  },
  { en: 'Failed to find the corresponding node.', zh: '未找到对应的节点' }
)
</script>

<template>
  <InlineActionBtn @click="handleClick">{{ text }}</InlineActionBtn>
</template>
