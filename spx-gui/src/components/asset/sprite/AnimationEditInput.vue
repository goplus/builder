<script setup lang="ts">
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { AnimationGen } from '@/models/spx/gen/animation-gen'
import { UIButton } from '@/components/ui'
import SettingsInput from '../gen/common/SettingsInput.vue'

const props = defineProps<{
  gen: AnimationGen
  instruction: string
  submit?: () => Promise<void>
}>()

const emit = defineEmits<{
  'update:instruction': [string]
}>()

const submitting = computed(() => props.gen.generateVideoState.status === 'running')
const disabled = computed(() => submitting.value || props.gen.finishState.status === 'running')
const handleSubmit = useMessageHandle(() => props.submit?.() ?? props.gen.editVideo(props.instruction), {
  en: 'Failed to edit animation',
  zh: '修改动画失败'
}).fn
</script>

<template>
  <SettingsInput
    v-radar="{ name: 'Animation edit instructions', desc: 'Describe changes to the selected animation' }"
    :description="instruction"
    :placeholder="$t({ en: 'Describe changes to this animation', zh: '描述对当前动画的修改' })"
    :enrichable="false"
    :disabled="disabled"
    @update:description="emit('update:instruction', $event)"
  >
    <template #submit>
      <UIButton
        v-radar="{ name: 'Edit animation', desc: 'Apply the instructions to the selected animation with AI' }"
        type="primary"
        :disabled="disabled || instruction.trim() === ''"
        :loading="submitting"
        @click="handleSubmit"
      >
        {{ $t({ en: 'Edit animation', zh: '修改动画' }) }}
      </UIButton>
    </template>
  </SettingsInput>
</template>
