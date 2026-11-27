<script setup lang="ts">
import { ref } from 'vue'
import { UIDropdown } from '@/components/ui'
import DefinitionOverviewWrapper from '../definition/DefinitionOverviewWrapper.vue'
import DefinitionDetailWrapper from '../definition/DefinitionDetailWrapper.vue'
import MarkdownView from '../markdown/MarkdownView.vue'
import HoverCard from '../hover/HoverCard.vue'
import HoverCardContent from '../hover/HoverCardContent.vue'
import type { APIReferenceItem } from '.'
import APIReferenceItemRow from './APIReferenceItemRow.vue'
import { useAPIReferenceItem } from './use-api-reference-item'

const props = defineProps<{
  item: APIReferenceItem
  /** Suspend the hover dropdown while the list is scrolling. */
  interactionDisabled: boolean
  blockStyle?: boolean
  disabled?: boolean
}>()

const { snippetPreview, actions } = useAPIReferenceItem(() => props.item)
const hoverDropdown = ref<InstanceType<typeof UIDropdown> | null>(null)

function hideDropdown() {
  hoverDropdown.value?.setVisible(false)
}
</script>

<template>
  <UIDropdown
    ref="hoverDropdown"
    placement="bottom-start"
    :offset="{ x: 0, y: 4 }"
    :disabled="interactionDisabled || disabled"
  >
    <template #trigger>
      <APIReferenceItemRow
        :item="item"
        :snippet-preview="snippetPreview"
        :block-style="blockStyle"
        :disabled="disabled"
        @interaction="hideDropdown"
      />
    </template>
    <HoverCard :actions="actions" @action="hideDropdown">
      <HoverCardContent>
        <DefinitionOverviewWrapper :kind="item.kind" :inlay-hints="snippetPreview.inlayHints">
          {{ snippetPreview.overview }}
        </DefinitionOverviewWrapper>
        <DefinitionDetailWrapper>
          <MarkdownView v-bind="item.detail" />
        </DefinitionDetailWrapper>
      </HoverCardContent>
    </HoverCard>
  </UIDropdown>
</template>
