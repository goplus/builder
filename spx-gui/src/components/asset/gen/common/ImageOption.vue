<script setup lang="ts">
import { UIBlockItem, UIBlockItemTitle, UICornerIcon, UIImg } from '@/components/ui'

withDefaults(
  defineProps<{
    label: string
    image?: string | null
    active: boolean
    interactive?: boolean
    removable?: boolean
    clearable?: boolean
  }>(),
  { image: null, interactive: true, removable: false, clearable: false }
)

const emit = defineEmits<{
  remove: []
  clear: []
}>()
</script>

<template>
  <UIBlockItem :active="active" :interactive="interactive">
    <div class="mt-0.5 flex min-h-0 w-full flex-col items-center">
      <UIImg class="h-15 w-20 rounded-sm" :src="image" />
    </div>
    <UIBlockItemTitle size="medium" :title="label">{{ label }}</UIBlockItemTitle>
    <UICornerIcon
      v-if="active && (clearable || removable)"
      v-radar="{
        name: removable ? $t({ en: 'Remove image', zh: '移除图片' }) : $t({ en: 'Deselect image', zh: '取消选择图片' }),
        desc: `${removable ? 'Remove' : 'Deselect'} '${label}'`
      }"
      :type="removable ? 'trash' : 'minus'"
      @click.stop.prevent="removable ? emit('remove') : emit('clear')"
    />
  </UIBlockItem>
</template>
