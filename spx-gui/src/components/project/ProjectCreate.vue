<template>
  <NForm ref="formRef" :model="formValue" :rules="formRules">
    <NFormItem :label="_t({ en: 'Project Name', zh: '项目名' })" path="name">
      <NInput v-model:value="formValue.name" />
    </NFormItem>
    <NFormItem>
      <NButton @click="handleCancel">
        {{ _t({ en: 'Cancel', zh: '取消' }) }}
      </NButton>
      <NButton @click="handleSubmit">
        {{ _t({ en: 'Create', zh: '创建' }) }}
      </NButton>
    </NFormItem>
  </NForm>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NForm, NFormItem, NInput, NButton, type FormInst } from 'naive-ui'
import { type ProjectData, getProject, addProject, IsPublic } from '@/apis/project'
import { useFormRules, type ValidationResult } from '@/utils/form'
import { useMessageHandle, cancel } from '@/utils/exception'
import { useUserStore } from '@/stores/user'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'

const emit = defineEmits<{
  created: [ProjectData],
  cancelled: []
}>()

const userStore = useUserStore()

const formRef = ref<FormInst | null>(null)

const formValue = ref({
  name: ''
})

const formRules = useFormRules({
  name: validateName
})

function handleCancel() {
  emit('cancelled')
}

const handleSubmit = useMessageHandle(
  async () => {
    if (formRef.value == null) cancel()
    const errs = await formRef.value.validate().then( // TODO: extract such logic to utils/form
      () => [],
      e => {
        if (Array.isArray(e)) return e
        throw e
      }
    )
    if (errs.length > 0) cancel()
    const projectData = await addProject({
      name: formValue.value.name,
      isPublic: IsPublic.personal,
      files: {}
    })
    emit('created', projectData)
  },
  { en: 'Failed to create project', zh: '项目创建失败' },
  { en: 'Project created', zh: '创建成功' }
)

async function validateName(name: string): Promise<ValidationResult> {
  name = name.trim()

  if (name === '') return { en: 'The project name must not be blank', zh: '项目名不可为空' }

  if (!/^[\w-]+$/.test(name)) return {
    en: 'The project name can only contain ASCII letters, digits, and the characters -, and _.',
    zh: '项目名仅可包含字母、数字以及 - & _'
  }

  if (name.length > 100) return {
    en: 'The project name is too long (maximum is 100 characters)',
    zh: '项目名长度超出限制（最多 100 个字符）'
  }

  // check naming conflict
  const username = userStore.userInfo!.name // TODO: remove `!` here
  const existedProject = await getProject(username, name).catch(e => {
    if (e instanceof ApiException && e.code === ApiExceptionCode.errorNotFound) return null
    throw e
  })
  if (existedProject != null) return {
    en: `Project ${name} already exists`,
    zh: `项目 ${name} 已存在`
  }
}
</script>

<style scoped lang="scss">

</style>
