<script setup lang="ts">
import { useI18n } from '@/utils/i18n'
import { UIBlockItem, UIBlockItemTitle, UICornerIcon } from '@/components/ui'
import PlayControl from '@/components/editor/common/PlayControl.vue'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    label: string
    active: boolean
    clearable?: boolean
    playing?: boolean
    progress?: number
    play?: (() => Promise<void>) | null
  }>(),
  {
    clearable: false,
    playing: false,
    progress: 0,
    play: null
  }
)

const emit = defineEmits<{
  select: []
  clear: []
  stop: []
}>()
</script>

<template>
  <UIBlockItem
    :class="props.play == null ? 'h-10 w-auto min-w-21 flex-row justify-center px-3' : ''"
    :active="props.active"
    :button-label="props.label"
    @click="emit('select')"
  >
    <template v-if="props.play != null">
      <div class="relative z-1 my-3 h-9 w-9">
        <PlayControl
          size="medium"
          :playing="props.playing ? { progress: props.progress } : null"
          :progress-interval="0"
          :play-handler="props.play"
          @stop="emit('stop')"
        />
      </div>
      <UIBlockItemTitle size="medium" :title="props.label">
        {{ props.label }}
      </UIBlockItemTitle>
    </template>
    <span v-else class="pointer-events-none relative z-1 text-base text-title whitespace-nowrap">
      {{ props.label }}
    </span>
    <UICornerIcon
      v-if="props.active && props.clearable"
      v-radar="{
        name: 'deselect-option',
        desc: t({ zh: `取消选择「${props.label}」`, en: `Deselect &quot;${props.label}&quot;` })
      }"
      type="minus"
      button
      class="focus-visible:outline-2 focus-visible:outline-primary-700 focus-visible:outline-offset-2"
      @click.stop.prevent="emit('clear')"
    />
  </UIBlockItem>
</template>
