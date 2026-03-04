<script setup lang="ts">
import { computed } from 'vue'
import { useFileUrl } from '@/utils/file'
import type { LocaleMessage } from '@/utils/i18n'
import { UIImg, UITooltip } from '@/components/ui'
import type { TextDocument } from '../../text-document'

const props = defineProps<{
  textDocument: TextDocument
  isActive: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const name = computed<LocaleMessage>(() => props.textDocument.displayName)

const [thumbnailUrl] = useFileUrl(() => props.textDocument.thumbnailFile)
</script>

<template>
  <UITooltip placement="right">
    {{ $t(name) }}
    <template #trigger>
      <div
        v-radar="{ name: 'Code document tab', desc: `Click to open code of ${textDocument.id.uri}` }"
        class="document-tab"
        :class="{ active: isActive }"
        @click="emit('click')"
      >
        <UIImg v-if="thumbnailUrl != null" class="thumbnail-img" :src="thumbnailUrl" />
      </div>
    </template>
  </UITooltip>
</template>

<style lang="scss" scoped>
.document-tab {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  border-radius: var(--ui-border-radius-1);
  border: 2px solid transparent;
  transition: 0.2s;
  background-color: var(--ui-color-grey-300);

  &.active {
    border: 2px solid var(--ui-color-yellow-500);
    background-color: var(--ui-color-yellow-200);
  }

  &:not(.active) {
    cursor: pointer;
    &:hover {
      background-color: var(--ui-color-grey-300);
    }
  }
}

.thumbnail-img {
  border-radius: 4px;
  width: 100%;
  height: 100%;
}
</style>
