<script lang="ts" setup>
import { ref } from 'vue'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import type { LocaleMessage } from '@/utils/i18n'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import type { ProjectReference } from '@/apis/course'
import { getProject } from '@/apis/project'
import { UIButton, UIIcon, UILoading, UITextInput } from '@/components/ui'

const props = defineProps<{
  references: ProjectReference[]
}>()

const emit = defineEmits<{
  'update:references': [value: ProjectReference[]]
}>()

const projectInput = ref('')

function validateProjectFullName(fullName: string): LocaleMessage | null {
  if (fullName === '') {
    return { en: 'Please enter project name', zh: '请输入项目名称' }
  }

  const parts = fullName.split('/')
  if (parts.length !== 2) {
    return { en: 'Format should be owner/project', zh: '格式应为 owner/project' }
  }

  const [owner, project] = parts
  if (owner === '' || project === '') {
    return { en: 'Invalid project name', zh: '无效的项目名称' }
  }

  if (props.references.some((ref) => ref.fullName === fullName)) {
    return { en: 'Project already added', zh: '项目已添加' }
  }

  return null
}

const handleAdd = useMessageHandle(
  async () => {
    const fullName = projectInput.value.trim()

    const error = validateProjectFullName(fullName)
    if (error != null) {
      throw new DefaultException(error)
    }

    try {
      const [owner, project] = fullName.split('/')
      await getProject(owner, project)
    } catch (e) {
      if (e instanceof ApiException && e.code === ApiExceptionCode.errorNotFound) {
        throw new DefaultException({ en: 'Project not found', zh: '项目不存在' })
      }
      throw e
    }

    emit('update:references', [...props.references, { type: 'project', fullName }])
    projectInput.value = ''
  },
  {
    en: 'Failed to add project',
    zh: '添加项目失败'
  },
  {
    en: 'Project added successfully',
    zh: '项目添加成功'
  }
)

function handleRemove(index: number) {
  const newRefs = [...props.references]
  newRefs.splice(index, 1)
  emit('update:references', newRefs)
}
</script>

<template>
  <div class="project-references-input">
    <UITextInput
      v-model:value="projectInput"
      class="project-input"
      :placeholder="$t({ en: 'e.g., owner/project', zh: '例如：owner/project' })"
      :disabled="handleAdd.isLoading.value"
      @keypress.enter="handleAdd.fn"
    >
      <template #suffix>
        <UIButton size="small" type="primary" :disabled="handleAdd.isLoading.value" @click="handleAdd.fn">
          <UILoading v-if="handleAdd.isLoading.value" />
          <span v-else>{{ $t({ en: 'Add', zh: '添加' }) }}</span>
        </UIButton>
      </template>
    </UITextInput>

    <div class="references-list">
      <template v-if="references.length > 0">
        <div v-for="(reference, index) in references" :key="reference.fullName" class="reference-item">
          <span class="reference-name">{{ reference.fullName }}</span>
          <UIIcon type="close" class="remove-icon" @click="handleRemove(index)" />
        </div>
      </template>
      <div v-else class="empty-hint">
        {{ $t({ en: 'No reference projects added yet', zh: '尚未添加参考项目' }) }}
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.project-references-input {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.references-list {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-2);
  overflow-y: auto;
}

.reference-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-1);

  .remove-icon {
    cursor: pointer;
    color: var(--ui-color-grey-500);
    transition: 0.2s;

    &:hover {
      color: var(--ui-color-error);
    }
  }
}

.empty-hint {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-color-grey-700);
}
</style>
