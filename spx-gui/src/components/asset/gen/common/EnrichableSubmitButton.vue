<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { UIButton, UITooltip } from '@/components/ui'
import type { RadarNodeMeta } from '@/utils/radar'

defineOptions({
  // Prevent $attrs from being passed to UITooltip, which may cause incorrect disabled state
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    /** Whether the asset has been enriched */
    enriched: boolean
    /** Whether the enrichment process is currently in progress */
    enriching: boolean
    loading?: boolean
    /**
     * Custom directives are not passed to the target component via $attrs.
     * When applied to UITooltip, it causes a Vue exception due to the lack of a DOM element.
     * The current approach follows UIModal by passing it through props.
     * This is not the final solution; the goal is to eventually support direct usage via v-radar.
     */
    radar: RadarNodeMeta
  }>(),
  {
    loading: false
  }
)

const emit = defineEmits<{
  enrich: []
  submit: []
}>()

const isEnrichTriggered = ref(false)
function handleSubmit() {
  if (props.enriched) emit('submit')
  else {
    isEnrichTriggered.value = true
    emit('enrich')
  }
}
watch(
  () => props.enriching,
  (value) => {
    if (!value) {
      isEnrichTriggered.value = false
    }
  }
)

const tooltipVisible = computed(() => isEnrichTriggered.value && props.enriching)
const buttonLoading = computed(() => props.loading || (isEnrichTriggered.value && props.enriching))
</script>

<template>
  <UITooltip :visible="tooltipVisible">
    <template #trigger>
      <UIButton v-radar="radar" v-bind="$attrs" :loading="buttonLoading" @click="handleSubmit">
        <slot></slot>
      </UIButton>
    </template>
    {{
      $t({
        zh: '正在自动丰富细节，请稍后...',
        en: 'Enriching automatically, please wait...'
      })
    }}
  </UITooltip>
</template>
