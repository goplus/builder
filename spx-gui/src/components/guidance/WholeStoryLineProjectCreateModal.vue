<template>
  <UIFormModal class="project-create-modal" :title="$t(title)" :visible="props.visible" @update:visible="handleCancel">
    <UIForm :form="form" has-success-feedback @submit="handleSubmit.fn">
      <div class="alert">
        {{
          $t({
            en: 'Congratulations on completing the course! You can create a project with the whole code of this course and freely create or share it with other users.',
            zh: '恭喜您完成本课程！您可以创建一个具有本课程完整代码的项目，并在上面自由创作或者分享给其他用户。'
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
import { getProject, Visibility } from '@/apis/project'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { untilNotNull } from '@/utils/utils'
import { useUserStore } from '@/stores/user'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { Project } from '@/models/project'
import type { LocaleMessage } from '@/utils/i18n'

const props = defineProps<{
  visible: boolean
  title: LocaleMessage
  projectFile?: File
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [name: string]
}>()

const { t } = useI18n()
const userStore = useUserStore()

const signedInUser = computed(() => userStore.getSignedInUser())

const title = computed(() => {
  return {
    en: `Create a project with the whole code of course ${props.title.en}`,
    zh: `创建一个具有课程 ${props.title.zh} 完整代码的项目`
  }
})

const form = useForm({
  name: ['', validateName]
})

function handleCancel() {
  emit('cancelled')
}

const handleSubmit = useMessageHandle(
  async () => {
    const projectName = form.value.name
    const owner = await untilNotNull(signedInUser)
    const project = new Project(owner.name, projectName)
    if (props.projectFile) {
      await project.loadGbpFile(props.projectFile)
    } else {
      console.warn('No project file provided, creating empty project')
    }
    project.setVisibility(Visibility.Private)
    await project.saveToCloud()

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
  height: 60px;
  color: var(--ui-color-grey-900);
}

.footer {
  margin-top: 40px;
  display: flex;
  justify-content: center;
}
</style>
