<template>
  <UIFormModal class="project-create-modal" :title="$t(title)" :visible="props.visible" @update:visible="handleCancel">
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
import { type ProjectData, getProject, addProject, Visibility, parseRemixSource } from '@/apis/project'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { useUserStore } from '@/stores/user'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { Sprite } from '@/models/sprite'
import { Costume } from '@/models/costume'
import { File } from '@/models/common/file'
import { saveFiles } from '@/models/common/cloud'
import { filename } from '@/utils/path'
import defaultSpritePng from '@/assets/default-sprite.png'
import defaultBackdropImg from '@/assets/default-backdrop.png'
import { Backdrop } from '@/models/backdrop'
import { Project } from '@/models/project'

const props = defineProps<{
  remixSource?: string
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [ProjectData]
}>()

const { t } = useI18n()
const userStore = useUserStore()

const signedInUser = computed(() => userStore.getSignedInUser())

const title = computed(() => {
  if (props.remixSource == null) return { en: 'Create a new project', zh: '创建新的项目' }
  return { en: `Remix ${props.remixSource}`, zh: `改编 ${parseRemixSource(props.remixSource)}` }
})

const initialName = props.remixSource == null ? '' : parseRemixSource(props.remixSource).project

const form = useForm({
  name: [initialName, validateName]
})

function handleCancel() {
  emit('cancelled')
}

function createFile(url: string) {
  return new File(filename(url), async () => {
    const resp = await fetch(url)
    const blob = await resp.blob()
    return blob.arrayBuffer()
  })
}

// TODO: we should maintain thumbnail together with other content of the default project, see details in https://github.com/goplus/builder/issues/1027
const defaultThumbnailImg = 'https://builder-static.gopluscdn.com/assets/default-thumbnail.jpg'

const handleSubmit = useMessageHandle(
  async () => {
    let projectData: ProjectData
    if (props.remixSource != null) {
      projectData = await addProject({
        name: form.value.name,
        visibility: Visibility.Private,
        remixSource: props.remixSource
      })
    } else {
      // make default project
      const sprite = Sprite.create('')
      const costume = await Costume.create('', createFile(defaultSpritePng))
      sprite.addCostume(costume)
      const project = new Project()
      const backdrop = await Backdrop.create('', createFile(defaultBackdropImg))
      project.stage.addBackdrop(backdrop)
      project.addSprite(sprite)
      await sprite.autoFit()
      // upload project content & call API addProject, TODO: maybe this should be extracted to `@/models`?
      const [, files] = await project.export()
      const { fileCollection } = await saveFiles(files)
      projectData = await addProject({
        name: form.value.name,
        visibility: Visibility.Private,
        files: fileCollection,
        thumbnail: defaultThumbnailImg
      })
    }
    emit('resolved', projectData)
    return projectData
  },
  { en: 'Failed to create project', zh: '项目创建失败' },
  (projectData) => ({
    en: `Project ${projectData.name} created`,
    zh: `项目 ${projectData.name} 创建成功`
  })
)

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
