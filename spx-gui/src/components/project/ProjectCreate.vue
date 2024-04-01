<template>
  <NForm ref="formRef" :model="formValue" :rules="formRules">
    <NFormItem :label="_t({ en: 'Project Name', zh: '项目名' })" path="name">
      <NInput v-model:value="formValue.name" />
    </NFormItem>
    <NFormItem>
      <NButton type="tertiary" @click="handleCancel">
        {{ _t({ en: 'Cancel', zh: '取消' }) }}
      </NButton>
      <NButton type="primary" @click="handleSubmit">
        {{ _t({ en: 'Create', zh: '创建' }) }}
      </NButton>
    </NFormItem>
  </NForm>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NForm, NFormItem, NInput, NButton } from 'naive-ui'
import { type ProjectData, getProject, addProject as rawAddProject, IsPublic } from '@/apis/project'
import { useForm, type ValidationResult } from '@/utils/form'
import { useMessageHandle } from '@/utils/exception'
import { useUserStore } from '@/stores/user'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'

const emit = defineEmits<{
  created: [ProjectData]
  cancelled: []
}>()

const userStore = useUserStore()

const formValue = ref({
  name: ''
})

const [formRef, formRules, validateForm] = useForm({
  name: validateName
})

function handleCancel() {
  emit('cancelled')
}

const addProject = useMessageHandle(
  rawAddProject,
  { en: 'Failed to create project', zh: '创建失败' },
  (project) => ({ en: `Project ${project.name} created`, zh: `项目 ${project.name} 创建成功` })
)

async function handleSubmit() {
  if (formRef.value == null) return
  const errs = await validateForm()
  if (errs.length > 0) return
  const projectData = await addProject({
    name: formValue.value.name,
    isPublic: IsPublic.personal,
    files: {}
  })
  emit('created', projectData)
}

async function validateName(name: string): Promise<ValidationResult> {
  name = name.trim()

  if (name === '') return { en: 'The project name must not be blank', zh: '项目名不可为空' }

  if (!/^[\w-]+$/.test(name))
    return {
      en: 'The project name can only contain ASCII letters, digits, and the characters - and _',
      zh: '项目名仅可包含字母、数字、符号 - 及 _'
    }

  if (name.length > 100)
    return {
      en: 'The project name is too long (maximum is 100 characters)',
      zh: '项目名长度超出限制（最多 100 个字符）'
    }

  // check naming conflict
  const username = userStore.userInfo!.name // TODO: remove `!` here
  const existedProject = await getProject(username, name).catch((e) => {
    if (e instanceof ApiException && e.code === ApiExceptionCode.errorNotFound) return null
    throw e
  })
  if (existedProject != null)
    return {
      en: `Project ${name} already exists`,
      zh: `项目 ${name} 已存在`
    }
}
</script>

<style scoped lang="scss"></style>
