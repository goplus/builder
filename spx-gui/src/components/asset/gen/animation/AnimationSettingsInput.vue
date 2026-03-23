<script lang="ts" setup>
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { AnimationGen } from '@/models/spx/gen/animation-gen'
import { UIButton } from '@/components/ui'
import SettingsInput from '../common/SettingsInput.vue'
import ReferenceCostumeInput from '../common/ReferenceCostumeInput.vue'
import ArtStyleInput from '../common/ArtStyleInput.vue'
import PerspectiveInput from '../common/PerspectiveInput.vue'
import AnimationLoopModeInput from './AnimationLoopModeInput.vue'

const props = defineProps<{
  gen: AnimationGen
}>()

const readonly = computed(() => props.gen.result != null)
const isGenerating = computed(() => props.gen.generateVideoState.status === 'running')
const isFinishing = computed(() => props.gen.finishState.status === 'running')
const disabled = computed(() => isGenerating.value || isFinishing.value)
const handleEnrich = useMessageHandle(() => props.gen.enrich(), {
  en: 'Failed to enrich animation details',
  zh: '丰富动画细节失败'
}).fn
const submitDisabled = computed(
  () => props.gen.enrichState.status === 'running' || isFinishing.value || props.gen.settings.description === ''
)
const submitText = computed(() => {
  if (props.gen.generateVideoState.status === 'initial') return { en: 'Generate', zh: '生成' }
  return { en: 'Regenerate', zh: '重新生成' }
})
</script>

<template>
  <SettingsInput
    v-radar="{
      name: 'Animation generation settings',
      desc: 'Enter an animation description, or enrich details to generate an animation'
    }"
    :description="gen.settings.description"
    :enriching="gen.enrichState.status === 'running'"
    :readonly="readonly"
    :disabled="disabled"
    @update:description="gen.setSettings({ description: $event })"
    @enrich="handleEnrich"
  >
    <template #extra>
      <ReferenceCostumeInput
        :costumes="gen.sprite.costumes"
        :selected-id="gen.referenceCostume?.id ?? null"
        :clearable="false"
        @update:selected-id="gen.setReferenceCostume($event)"
      />
      <ArtStyleInput :value="gen.settings.artStyle" @update:value="gen.setSettings({ artStyle: $event })" />
      <PerspectiveInput :value="gen.settings.perspective" @update:value="gen.setSettings({ perspective: $event })" />
      <AnimationLoopModeInput :value="gen.settings.loopMode" @update:value="gen.setSettings({ loopMode: $event })" />
    </template>
    <template #submit>
      <UIButton
        v-radar="{ name: 'Submit', desc: 'Click to generate an animation' }"
        :disabled="submitDisabled"
        :loading="isGenerating"
        @click="gen.generateVideo()"
      >
        {{ $t(submitText) }}
      </UIButton>
    </template>
  </SettingsInput>
</template>

<style lang="scss" scoped></style>
