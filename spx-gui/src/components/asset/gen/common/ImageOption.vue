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
    <button
      v-if="interactive"
      type="button"
      class="absolute inset-0 rounded-md border-0 bg-transparent cursor-pointer focus-visible:outline-2 focus-visible:outline-primary-main"
      :aria-label="label"
      :title="label"
      :aria-pressed="active"
    ></button>
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
      role="button"
      tabindex="0"
      class="focus-visible:outline-2 focus-visible:outline-primary-700 focus-visible:outline-offset-2"
      :aria-label="
        removable ? $t({ en: 'Remove image', zh: '移除图片' }) : $t({ en: 'Deselect image', zh: '取消选择图片' })
      "
      @keydown.enter.stop.prevent="removable ? emit('remove') : emit('clear')"
      @keydown.space.stop.prevent="removable ? emit('remove') : emit('clear')"
      @click.stop.prevent="removable ? emit('remove') : emit('clear')"
    />
  </UIBlockItem>
</template>
