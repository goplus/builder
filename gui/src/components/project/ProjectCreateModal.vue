<template>
  <UIFormModal
    :radar="{ name: 'create-project-modal', desc: 'Modal for creating a new project' }"
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
          v-radar="{ name: 'project-name-input', desc: 'Input field for project name' }"
          :placeholder="$t({ en: 'Please enter the project name', zh: '请输入项目名' })"
        />
        <template v-if="props.sourceProject != null" #tip>
          {{
            $t({
              en: 'Your copy will open in the editor after you save it.',
              zh: '保存后，编辑器会打开你的项目副本。'
            })
          }}
        </template>
      </UIFormItem>
      <footer class="mt-10 flex justify-center">
        <UIButton
          v-radar="{ name: 'create-button', desc: 'Click to create the project' }"
          class="create-button"
          type="primary"
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
import {
  addProject,
  isProjectNameTaken,
  ProjectType,
  projectNameMaxLength,
  Visibility,
  parseRemixSource
} from '@/apis/project'
import { useI18n } from '@/utils/i18n'
import type { ProjectIdentifier } from '@/utils/project-route'
import { useMessageHandle } from '@/utils/exception'
import { useSignedIn } from '@/stores/user'
import { cloudHelpers } from '@/models/common/cloud'
import { useProjectConfig } from './config'
import { createDefaultProject } from './default-project'
import type { ProjectSerialized } from '@/models/project'

const props = defineProps<{
  /** Existing cloud project reference used by the server-side remix flow. */
  remixSource?: string
  /** Serialized local project copied into a new private project owned by the current user. */
  sourceProject?: ProjectSerialized
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [project: ProjectIdentifier]
}>()

const { t } = useI18n()
const { defaultFontPreferences } = useProjectConfig()
const signedIn = useSignedIn()
const title = computed(() => {
  if (props.sourceProject != null) return { en: 'Save as my project', zh: '另存为我的项目' }
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
    const username = signedIn.username
    if (username == null) throw new Error('login required')
    let created: ProjectIdentifier
    if (props.sourceProject != null) {
      const { files, metadata } = props.sourceProject
      const saved = await cloudHelpers.save({
        files,
        metadata: {
          owner: username,
          name: projectName,
          displayName: projectName,
          type: metadata.type ?? ProjectType.Game,
          visibility: Visibility.Private,
          thumbnail: metadata.thumbnail
        }
      })
      created = saved.metadata
    } else if (props.remixSource != null) {
      created = await addProject({
        name: projectName,
        displayName: projectName,
        // This modal will own project type selection in a later design.
        type: ProjectType.Game,
        visibility: Visibility.Private,
        remixSource: props.remixSource
      })
    } else {
      const project = await createDefaultProject(username, projectName, defaultFontPreferences)
      project.setDisplayName(projectName)
      project.setVisibility(Visibility.Private)
      const exported = await project.export()
      const saved = await cloudHelpers.save(exported)
      project.setMetadata(saved.metadata)
      created = saved.metadata
    }
    emit('resolved', { owner: created.owner, name: created.name })
    return projectName
  },
  { en: 'Failed to create project', zh: '项目创建失败' },
  props.sourceProject != null
    ? undefined
    : (projectName) => ({
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

  if (name.length > projectNameMaxLength)
    return t({
      en: `The project name is too long (maximum is ${projectNameMaxLength} characters)`,
      zh: `项目名长度超出限制（最多 ${projectNameMaxLength} 个字符）`
    })

  // check naming conflict
  const username = signedIn.username
  if (username == null) throw new Error('login required')
  if (await isProjectNameTaken(username, name))
    return t({
      en: `Project ${name} already exists`,
      zh: `项目 ${name} 已存在`
    })
}
</script>
