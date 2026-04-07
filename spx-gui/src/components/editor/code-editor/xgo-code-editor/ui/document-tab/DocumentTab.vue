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
        class="document-tab h-10 w-10 flex-none flex items-center rounded-1 border-2 transition-all"
        :class="isActive ? 'border-yellow-500 bg-yellow-200' : 'border-transparent bg-grey-300 cursor-pointer'"
        @click="emit('click')"
      >
        <UIImg v-if="thumbnailUrl != null" class="h-full w-full rounded-[4px]" :src="thumbnailUrl" />
      </div>
    </template>
  </UITooltip>
</template>
