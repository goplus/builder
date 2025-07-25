<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import { UITextInput, UIButton, UIIcon } from '@/components/ui'
import type { ProjectReference } from '@/apis/course'

const props = defineProps<{
  modelValue: ProjectReference[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ProjectReference[]]
}>()

const { t } = useI18n()
const inputValue = ref('')
const inputError = ref<string | null>(null)

const references = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

function validateProjectFullName(fullName: string): string | null {
  if (!fullName) {
    return t({ en: 'Please enter project name', zh: '请输入项目名称' })
  }

  const parts = fullName.split('/')
  if (parts.length !== 2) {
    return t({ en: 'Format should be owner/project', zh: '格式应为 owner/project' })
  }

  const [owner, project] = parts
  if (!owner || !project) {
    return t({ en: 'Invalid project name', zh: '无效的项目名称' })
  }

  if (references.value.some((ref) => ref.fullName === fullName)) {
    return t({ en: 'Project already added', zh: '项目已添加' })
  }

  return null
}

function handleAdd() {
  const fullName = inputValue.value.trim()
  const error = validateProjectFullName(fullName)

  if (error) {
    inputError.value = error
    return
  }

  references.value = [...references.value, { type: 'project', fullName }]
  inputValue.value = ''
  inputError.value = null
}

function handleRemove(index: number) {
  const newRefs = [...references.value]
  newRefs.splice(index, 1)
  references.value = newRefs
}

function handleInputChange() {
  if (inputError.value) {
    inputError.value = null
  }
}
</script>

<template>
  <div class="project-references-input">
    <div class="input-section">
      <UITextInput
        v-model:value="inputValue"
        class="project-input"
        :placeholder="$t({ en: 'e.g., owner/project', zh: '例如：owner/project' })"
        :error="!!inputError"
        @update:value="handleInputChange"
        @keypress.enter="handleAdd"
      >
        <template #suffix>
          <UIButton size="small" type="primary" @click="handleAdd">
            {{ $t({ en: 'Add', zh: '添加' }) }}
          </UIButton>
        </template>
      </UITextInput>
      <div v-if="inputError" class="error-message">
        {{ inputError }}
      </div>
    </div>

    <div v-if="references.length > 0" class="references-list">
      <div v-for="(reference, index) in references" :key="reference.fullName" class="reference-item">
        <span class="reference-name">{{ reference.fullName }}</span>
        <UIIcon type="close" class="remove-icon" @click="handleRemove(index)" />
      </div>
    </div>

    <div v-else class="empty-hint">
      <div class="empty-text">{{ $t({ en: 'No reference projects added yet', zh: '尚未添加参考项目' }) }}</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.project-references-input {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.input-section {
  width: 100%;

  .project-input {
    width: 100%;
  }

  .error-message {
    margin-top: 4px;
    font-size: 12px;
    color: var(--ui-color-error);
  }
}

.references-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--ui-color-grey-50);
  border: 1px solid var(--ui-color-grey-200);
  border-radius: 8px;
  min-height: 80px;
  max-height: 120px;
  overflow-y: auto;
}

.reference-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: white;
  border: 1px solid var(--ui-color-grey-200);
  border-radius: 6px;

  .reference-name {
    font-size: 14px;
    color: var(--ui-color-grey-900);
  }

  .remove-icon {
    cursor: pointer;
    color: var(--ui-color-grey-500);
    transition: color 0.2s;

    &:hover {
      color: var(--ui-color-error);
    }
  }
}

.empty-hint {
  width: 100%;
  padding: 24px 16px;
  background: var(--ui-color-grey-50);
  border: 1px solid var(--ui-color-grey-200);
  border-radius: 8px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;

  .empty-text {
    text-align: center;
    color: var(--ui-color-grey-500);
    font-size: 14px;
    line-height: 1.5;
  }
}
</style>
