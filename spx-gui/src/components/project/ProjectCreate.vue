<template>
  <UIForm :form="form" @submit="handleSubmit">
    <UIFormItem :label="$t({ en: 'Project Name', zh: '项目名' })" path="name">
      <UITextInput v-model:value="form.value.name" />
    </UIFormItem>
    <UIFormItem>
      <UIButton html-type="button" type="boring" @click="handleCancel">
        {{ $t({ en: 'Cancel', zh: '取消' }) }}
      </UIButton>
      <UIButton type="primary">
        {{ $t({ en: 'Create', zh: '创建' }) }}
      </UIButton>
    </UIFormItem>
  </UIForm>
</template>

<script setup lang="ts">
import {
  UIButton,
  UIForm,
  UIFormItem,
  UITextInput,
  useForm,
  type FormValidationResult
} from '@/components/ui'
import { type ProjectData, getProject, addProject as apiAddProject, IsPublic } from '@/apis/project'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { useUserStore } from '@/stores/user'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'

const emit = defineEmits<{
  created: [ProjectData]
  cancelled: []
}>()

const { t } = useI18n()
const userStore = useUserStore()

const form = useForm({
  name: ['', validateName]
})

function handleCancel() {
  emit('cancelled')
}

const addProject = useMessageHandle(
  apiAddProject,
  { en: 'Failed to create project', zh: '创建失败' },
  (project) => ({ en: `Project ${project.name} created`, zh: `项目 ${project.name} 创建成功` })
)

async function handleSubmit() {
  const projectData = await addProject({
    name: form.value.name,
    isPublic: IsPublic.personal,
    files: {}
  })
  emit('created', projectData)
}

async function validateName(name: string): Promise<FormValidationResult> {
  name = name.trim()

  if (name === '') return t({ en: 'The project name must not be blank', zh: '项目名不可为空' })

  if (!/^[\w-]+$/.test(name))
    return t({
      en: 'The project name can only contain ASCII letters, digits, and the characters - and _',
      zh: '项目名仅可包含字母、数字、符号 - 及 _'
    })

  if (name.length > 100)
    return t({
      en: 'The project name is too long (maximum is 100 characters)',
      zh: '项目名长度超出限制（最多 100 个字符）'
    })

  // check naming conflict
  if (userStore.userInfo == null) throw new Error('login required')
  const username = userStore.userInfo.name
  const existedProject = await getProject(username, name).catch((e) => {
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

<style scoped lang="scss"></style>
