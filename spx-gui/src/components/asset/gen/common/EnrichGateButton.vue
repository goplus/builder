<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { UIButton, UITooltip } from '@/components/ui'

const props = withDefaults(
  defineProps<{
    enriched: boolean
    enriching: boolean
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    loading: false,
    disabled: false
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

const resolvedVisible = computed(() => isEnrichTriggered.value && props.enriching)
const resolvedLoading = computed(() => props.loading || (isEnrichTriggered.value && props.enriching))
// When enrichment is triggered by this button (isEnrichTriggered=true), keep the button
// enabled so the UITooltip can display the "enriching in progress" message. A disabled
// button would prevent the tooltip from showing on hover. Only apply the parent's disabled
// state when enrichment hasn't been triggered yet.
const resolvedDisabled = computed(() => !isEnrichTriggered.value && props.disabled)
</script>

<template>
  <UITooltip :visible="resolvedVisible">
    <template #trigger>
      <UIButton v-bind="$attrs" :disabled="resolvedDisabled" :loading="resolvedLoading" @click="handleSubmit">
        <slot></slot>
      </UIButton>
    </template>
    {{
      $t({
        zh: '描述信息太少，正在自动丰富细节，请稍后...',
        en: 'Description is too short, enriching automatically, please wait...'
      })
    }}
  </UITooltip>
</template>

<style lang="scss" scoped></style>
