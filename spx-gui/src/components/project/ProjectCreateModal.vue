<template>
  <UIFormModal
    :radar="{ name: 'Create project modal', desc: 'Modal for creating a new project' }"
    class="project-create-modal"
    :title="$t(title)"
    :visible="props.visible"
    @update:visible="handleCancel"
  >
    <UIForm :form="form" has-success-feedback @submit="handleSubmit.fn">
      <div class="h-7.5 text-grey-900">
        {{
          $t({
            en: 'The project name will also be used in project URLs.',
            zh: '项目名同时也会用于项目 URL。'
          })
        }}
      </div>
      <UIFormItem path="name">
        <UITextInput
          v-model:value="form.value.name"
          v-radar="{ name: 'Project name input', desc: 'Input field for project name' }"
          :placeholder="$t({ en: 'Please enter the project name', zh: '请输入项目名' })"
        />
      </UIFormItem>
      <footer class="mt-10 flex justify-center">
        <UIButton
          v-radar="{ name: 'Create button', desc: 'Click to create the project' }"
          class="create-button"
          color="primary"
          html-type="submit"
          :loading="handleSubmit.isLoading.value"
        >
          {{ $t({ en: 'Create', zh: '创建' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>

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
import { getProject, addProject, Visibility, parseRemixSource } from '@/apis/project'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { untilLoaded } from '@/utils/query'
import { useSignedInStateQuery } from '@/stores/user'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { cloudHelpers } from '@/models/common/cloud'
import { xbpHelpers } from '@/models/common/xbp'
import { SpxProject } from '@/models/spx/project'
import { getDefaultProjectFile } from '@/components/project'

const props = defineProps<{
  remixSource?: string
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [name: string]
}>()

const { t } = useI18n()
const signedInStateQuery = useSignedInStateQuery()
const title = computed(() => {
  if (props.remixSource == null) return { en: 'Create a new project', zh: '创建新的项目' }
  return { en: `Remix ${props.remixSource}`, zh: `改编 ${props.remixSource}` }
})

const initialName = props.remixSource == null ? '' : parseRemixSource(props.remixSource).project

const form = useForm({
  name: [initialName, validateName]
})

function handleCancel() {
  emit('cancelled')
}

const handleSubmit = useMessageHandle(
  async () => {
    const projectName = form.value.name.trim()
    if (props.remixSource != null) {
      await addProject({
        name: projectName,
        displayName: projectName,
        visibility: Visibility.Private,
        remixSource: props.remixSource
      })
    } else {
      const signedInState = await untilLoaded(signedInStateQuery)
      if (!signedInState.isSignedIn) throw new Error('login required')
      const defaultProjectFile = await getDefaultProjectFile()
      const project = new SpxProject(signedInState.user.username, projectName)
      const serialized = await xbpHelpers.load(defaultProjectFile)
      await project.load(serialized)
      project.setDisplayName(projectName)
      project.setVisibility(Visibility.Private)
      const exported = await project.export()
      const saved = await cloudHelpers.save(exported)
      project.setMetadata(saved.metadata)
    }
    emit('resolved', projectName)
    return projectName
  },
  { en: 'Failed to create project', zh: '项目创建失败' },
  (projectName) => ({
    en: `Project ${projectName} created`,
    zh: `项目 ${projectName} 创建成功`
  })
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

  // check naming conflict
  const signedInState = await untilLoaded(signedInStateQuery)
  if (!signedInState.isSignedIn) throw new Error('login required')
  const existedProject = await getProject(signedInState.user.username, name).catch((e) => {
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
