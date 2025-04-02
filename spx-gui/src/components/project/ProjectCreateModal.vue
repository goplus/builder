<template>
  <TagNode name="project-create-modal">
    <UIFormModal
      class="project-create-modal"
      :title="$t(title)"
      :visible="props.visible"
      @update:visible="handleCancel"
    >
      <UIForm :form="form" has-success-feedback @submit="handleSubmit.fn">
        <div class="alert">
          {{
            $t({
              en: 'The project name cannot be modified after it is created.',
              zh: '项目名创建后无法修改。'
            })
          }}
        </div>
        <UIFormItem path="name">
          <UITextInput
            v-model:value="form.value.name"
            :placeholder="$t({ en: 'Please enter the project name', zh: '请输入项目名' })"
          />
        </UIFormItem>
        <footer class="footer">
          <UIButton class="create-button" type="primary" html-type="submit" :loading="handleSubmit.isLoading.value">
            {{ $t({ en: 'Create', zh: '创建' }) }}
          </UIButton>
        </footer>
      </UIForm>
    </UIFormModal>
  </TagNode>
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
import { untilNotNull } from '@/utils/utils'
import { useUserStore } from '@/stores/user'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { Project } from '@/models/project'

/**
 * How to update the default project:
 * 1. Use Go+ Builder to create / open a project.
 * 2. Edit it as needed.
 * 3. Export the project file (`.gbp`).
 * 4. Replace `./default-project.gbp` with the exported file.
 */
import defaultProjectFileUrl from './default-project.gbp?url'

const props = defineProps<{
  remixSource?: string
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [name: string]
}>()

const { t } = useI18n()
const userStore = useUserStore()

const signedInUser = computed(() => userStore.getSignedInUser())

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

async function getDefaultProjectFile() {
  const resp = await fetch(defaultProjectFileUrl)
  const blob = await resp.blob()
  return new window.File([blob], 'default-project.gbp', { type: blob.type })
}

const handleSubmit = useMessageHandle(
  async () => {
    const projectName = form.value.name
    if (props.remixSource != null) {
      await addProject({
        name: projectName,
        visibility: Visibility.Private,
        remixSource: props.remixSource
      })
    } else {
      const owner = await untilNotNull(signedInUser)
      const defaultProjectFile = await getDefaultProjectFile()
      const project = new Project(owner.name, projectName)
      await project.loadGbpFile(defaultProjectFile)
      project.setVisibility(Visibility.Private)
      await project.saveToCloud()
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
      en: 'The project name can only contain letters, numbers, - and _',
      zh: '项目名仅可包含字母、数字、- 及 _'
    })

  if (name.length > 100)
    return t({
      en: 'The project name is too long (maximum is 100 characters)',
      zh: '项目名长度超出限制（最多 100 个字符）'
    })

  // check naming conflict
  if (signedInUser.value == null) throw new Error('login required')
  const username = signedInUser.value.name
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

<style scoped lang="scss">
.alert {
  height: 30px;
  color: var(--ui-color-grey-900);
}

.footer {
  margin-top: 40px;
  display: flex;
  justify-content: center;
}
</style>
