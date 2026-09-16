<template>
  <UIFormModal
    :radar="{ name: 'Create project modal', desc: 'Modal for creating a new project' }"
    class="project-create-modal"
    :title="$t(title)"
    :visible="props.visible"
    @update:visible="handleCancel"
  >
    <UIForm :form="form" has-success-feedback @submit="handleSubmit.fn">
      <UIFormItem path="name" :label="$t({ en: 'Project name', zh: '项目名' })">
        <UITextInput
          v-model:value="form.value.name"
          v-radar="{ name: 'Project name input', desc: 'Input field for project name' }"
          :placeholder="$t({ en: 'Please enter the project name', zh: '请输入项目名' })"
        />
      </UIFormItem>

      <div v-if="props.remixSource == null" class="mt-6">
        <div class="mb-3 text-title">{{ $t({ en: 'Template', zh: '模板' }) }}</div>
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="template in projectTemplates"
            :key="template.id"
            v-radar="{
              name: `${template.name.en} project template`,
              desc: `Create a project from the ${template.name.en} template`
            }"
            type="button"
            class="min-w-0 rounded-md border p-2 text-left transition-colors"
            :data-testid="`project-template-${template.id}`"
            :class="
              selectedTemplateId === template.id
                ? 'border-primary-500 bg-primary-100 text-primary-700'
                : 'border-grey-400 bg-grey-100 hover:bg-grey-300'
            "
            :aria-pressed="selectedTemplateId === template.id"
            @click="selectedTemplateId = template.id"
          >
            <div class="h-24 flex items-center justify-center overflow-hidden rounded-sm bg-grey-200 p-2">
              <div
                class="template-canvas relative h-full max-w-full overflow-hidden rounded-sm border border-grey-400 bg-grey-100"
                :style="{ aspectRatio: `${template.viewportSize.width} / ${template.viewportSize.height}` }"
              >
                <div class="absolute left-2 right-2 top-2 h-1.5 rounded-full bg-grey-300"></div>
                <div
                  class="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-400"
                ></div>
                <div class="absolute bottom-2 left-2 right-2 h-1 rounded-full bg-grey-300"></div>
              </div>
            </div>
            <div class="mt-2 truncate text-xs">{{ $t(template.name) }}</div>
          </button>
        </div>
      </div>

      <footer class="mt-8 flex justify-center">
        <UIButton
          v-radar="{ name: 'Create button', desc: 'Click to create the project' }"
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
import { computed, ref } from 'vue'
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
import { useMessageHandle } from '@/utils/exception'
import { untilLoaded } from '@/utils/query'
import { useSignedInStateQuery } from '@/stores/user'
import { cloudHelpers } from '@/models/common/cloud'
import { useProjectConfig } from './config'
import { createDefaultProject } from './default-project'
import { getProjectTemplate, projectTemplates, type ProjectTemplateId } from './templates'

const props = defineProps<{
  remixSource?: string
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [name: string]
}>()

const { t } = useI18n()
const { defaultFontPreferences } = useProjectConfig()
const signedInStateQuery = useSignedInStateQuery()
const title = computed(() => {
  if (props.remixSource == null) return { en: 'Create a new project', zh: '创建新的项目' }
  return { en: `Remix ${props.remixSource}`, zh: `改编 ${props.remixSource}` }
})

const initialName = props.remixSource == null ? '' : parseRemixSource(props.remixSource).project

const form = useForm({
  name: [initialName, validateName]
})
const selectedTemplateId = ref<ProjectTemplateId>('classic')

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
        // This modal will own project type selection in a later design.
        type: ProjectType.Game,
        visibility: Visibility.Private,
        remixSource: props.remixSource
      })
    } else {
      const signedInState = await untilLoaded(signedInStateQuery)
      if (!signedInState.isSignedIn) throw new Error('login required')
      const template = getProjectTemplate(selectedTemplateId.value)
      const project = await createDefaultProject(
        signedInState.user.username,
        projectName,
        defaultFontPreferences,
        template.viewportSize
      )
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

  if (name.length > projectNameMaxLength)
    return t({
      en: `The project name is too long (maximum is ${projectNameMaxLength} characters)`,
      zh: `项目名长度超出限制（最多 ${projectNameMaxLength} 个字符）`
    })

  // check naming conflict
  const signedInState = await untilLoaded(signedInStateQuery)
  if (!signedInState.isSignedIn) throw new Error('login required')
  if (await isProjectNameTaken(signedInState.user.username, name))
    return t({
      en: `Project ${name} already exists`,
      zh: `项目 ${name} 已存在`
    })
}
</script>

<style scoped>
.template-canvas {
  max-height: 100%;
}
</style>
