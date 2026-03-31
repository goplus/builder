<script setup lang="ts">
import { computed } from 'vue'
import {
  UIButton,
  UIForm,
  UIFormItem,
  UIFormModal,
  UITextInput,
  useForm,
  type FormValidationResult
} from '@/components/ui'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { getProject, updateProject } from '@/apis/project'
import type { SpxProject } from '@/models/spx/project'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'

const props = defineProps<{
  project: SpxProject
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [string]
}>()

const { t } = useI18n()
const currentName = computed(() => props.project.name ?? '')

const form = useForm({
  name: [currentName.value, validateName]
})

function handleCancel() {
  emit('cancelled')
}

const handleSubmit = useMessageHandle(
  async () => {
    const project = props.project
    const owner = project.owner
    const oldName = project.name
    if (owner == null || oldName == null) throw new Error('Project owner or name is not loaded')
    const nextName = form.value.name.trim()
    if (nextName === currentName.value) {
      emit('resolved', nextName)
      return nextName
    }
    const saved = await updateProject(owner, oldName, { name: nextName })
    emit('resolved', saved.name)
    return saved.name
  },
  { en: 'Failed to update project name', zh: '更新项目名失败' }
)

async function validateName(name: string): Promise<FormValidationResult> {
  name = name.trim()

  if (name === '') return t({ en: 'The project name must not be blank', zh: '项目名不可为空' })

  if (!/^[\w-]+$/.test(name))
    return t({
      en: 'The project name can only contain letters, digits, and the characters - and _.',
      zh: '项目名仅可包含字母、数字以及字符 - 和 _。'
    })

  if (name.length > 100)
    return t({
      en: 'The project name is too long (maximum is 100 characters)',
      zh: '项目名长度超出限制（最多 100 个字符）'
    })

  if (name.toLowerCase() === currentName.value.toLowerCase()) return

  const owner = props.project.owner
  if (owner == null) throw new Error('Project owner is not loaded')
  const existedProject = await getProject(owner, name).catch((e) => {
    if (e instanceof ApiException && e.code === ApiExceptionCode.errorNotFound) return null
    throw e
  })
  if (existedProject != null)
    return t({
      en: `Project ${name} already exists`,
      zh: `项目 ${name} 已存在`
    })
}
</script>

<template>
  <UIFormModal
    :radar="{ name: 'Project name modal', desc: 'Modal for updating project name' }"
    :title="$t({ en: 'Modify project name', zh: '修改项目名' })"
    :visible="props.visible"
    :mask-closable="false"
    @update:visible="handleCancel"
  >
    <UIForm :form="form" has-success-feedback @submit="handleSubmit.fn">
      <UIFormItem path="name">
        <UITextInput
          v-model:value="form.value.name"
          v-radar="{ name: 'Project name input', desc: 'Input field for project name' }"
          :placeholder="$t({ en: 'Please enter the project name', zh: '请输入项目名' })"
        />
      </UIFormItem>
      <footer class="mt-large flex justify-end gap-middle pb-1">
        <UIButton
          v-radar="{ name: 'Cancel button', desc: 'Click to cancel updating project name' }"
          color="boring"
          @click="handleCancel"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Confirm button', desc: 'Click to confirm updating project name' }"
          color="primary"
          html-type="submit"
          :loading="handleSubmit.isLoading.value"
        >
          {{ $t({ en: 'Confirm', zh: '确认' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>
