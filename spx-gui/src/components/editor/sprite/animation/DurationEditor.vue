<template>
  <UIDropdownForm
    v-radar="{ name: 'Duration editor dropdown form', desc: 'Dropdown form for editing animation duration' }"
    :title="$t(actionName)"
    style="width: 280px"
    @cancel="emit('close')"
    @confirm="handleConfirm"
  >
    <UINumberInput v-model:value="duration" :min="0.01">
      <template #prefix>{{ $t({ en: 'Duration', zh: '时长' }) }}</template>
      <template #suffix>{{ $t({ en: 's', zh: '秒' }) }}</template>
    </UINumberInput>
  </UIDropdownForm>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Animation } from '@/models/spx/animation'
import { UIDropdownForm, UINumberInput } from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'

const props = defineProps<{
  animation: Animation
}>()

const emit = defineEmits<{
  close: []
}>()

const editorCtx = useEditorCtx()
const actionName = { en: 'Adjust animation duration', zh: '调整动画时长' }
const duration = ref(props.animation.duration)

async function handleConfirm() {
  await editorCtx.state.history.doAction({ name: actionName }, () => {
    props.animation.setDuration(duration.value)
  })
  emit('close')
}
</script>
