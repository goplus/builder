<script lang="ts" setup>
import { useRadar } from '@/utils/radar'
import { useSpotlight } from '@/utils/spotlight'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  /** ID for the linked node (from module `Radar`) */
  targetId: string
  /** Tip to show when node revealed */
  tip?: string
  /** Text to display for the link */
  children: string
}>()

const radar = useRadar()
const spotlight = useSpotlight()

const { fn: handleClick } = useMessageHandle(
  () => {
    const nodeInfo = radar.getNodeById(props.targetId)
    if (!nodeInfo) {
      throw new Error(`Radar node with ID ${props.targetId} not found.`)
    }

    const { visible } = nodeInfo
    const element = nodeInfo.getElement()
    if (visible) {
      spotlight.reveal(element, props.tip)
    } else {
      spotlight.conceal()
    }
  },
  { en: 'Failed to find the corresponding node.', zh: '未找到对应的节点' }
)
</script>

<template>
  <button type="button" class="highlight-link" @click="handleClick">
    {{ children }}
  </button>
</template>

<style lang="scss" scoped>
.highlight-link {
  border-radius: 2px;
  border: 1px solid var(--ui-color-turquoise-main);
  background: transparent;
  width: fit-content;
  display: inline-block;
  padding: 1px 4px;
  color: var(--ui-color-turquoise-main);
  font-size: 12px;
  font-weight: 600;
  outline: none;

  &:hover {
    cursor: pointer;
    color: #0aa5be;
    border-color: #0aa5be;
  }
}
</style>
