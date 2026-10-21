<script setup lang="ts">
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { CostumeGen } from '@/models/spx/gen/costume-gen'
import { UIButton } from '@/components/ui'
import SettingsInput from '../gen/common/SettingsInput.vue'

const props = defineProps<{
  gen: CostumeGen
  instruction: string
  submit?: () => Promise<void>
}>()

const emit = defineEmits<{
  'update:instruction': [string]
}>()

const submitting = computed(() => props.gen.generateState.status === 'running')
const disabled = computed(() => submitting.value || props.gen.finishState.status === 'running')
const handleSubmit = useMessageHandle(() => props.submit?.() ?? props.gen.edit(props.instruction), {
  en: 'Failed to edit costume',
  zh: '修改造型失败'
}).fn
</script>

<template>
  <SettingsInput
    v-radar="{ name: 'Costume edit instructions', desc: 'Describe changes to the selected costume' }"
    :description="instruction"
    :placeholder="$t({ en: 'Describe changes to this costume', zh: '描述对当前造型的修改' })"
    :enrichable="false"
    :disabled="disabled"
    @update:description="emit('update:instruction', $event)"
  >
    <template #submit>
      <UIButton
        v-radar="{ name: 'Edit costume', desc: 'Apply the instructions to the selected costume with AI' }"
        type="primary"
        :disabled="disabled || instruction.trim() === ''"
        :loading="submitting"
        @click="handleSubmit"
      >
        {{ $t({ en: 'Edit costume', zh: '修改造型' }) }}
      </UIButton>
    </template>
  </SettingsInput>
</template>
