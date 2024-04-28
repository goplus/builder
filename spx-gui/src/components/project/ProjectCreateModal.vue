<template>
  <UIFormModal
    class="project-create-modal"
    :title="$t({ en: 'Create a new project', zh: '创建新的项目' })"
    :visible="props.visible"
    @update:visible="handleCancel"
  >
    <UIForm :form="form" @submit="handleSubmit.fn">
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
        <UIButton
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
import {
  UIButton,
  UIForm,
  UIFormItem,
  UIFormModal,
  UITextInput,
  useForm,
  type FormValidationResult
} from '@/components/ui'
import { type ProjectData, getProject, addProject as apiAddProject, IsPublic } from '@/apis/project'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { useUserStore } from '@/stores/user'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { Sprite, type SpriteInits } from '@/models/sprite'
import { Costume } from '@/models/costume'
import { File } from '@/models/common/file'
import { uploadFiles } from '@/models/common/cloud'
import { filename } from '@/utils/path'
import defaultSpritePng from '@/assets/default-sprite.png'
import defaultBackdropImg from '@/assets/default-backdrop.png'
import { Backdrop } from '@/models/backdrop'
import { Project } from '@/models/project'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [ProjectData]
}>()

const { t } = useI18n()
const userStore = useUserStore()

const form = useForm({
  name: ['', validateName]
})

const addProject = useMessageHandle(
  apiAddProject,
  { en: 'Failed to create project', zh: '创建失败' },
  (project) => ({ en: `Project ${project.name} created`, zh: `项目 ${project.name} 创建成功` })
).fn

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

const handleSubmit = useMessageHandle(
  async () => {
    // make default project
    const spriteFile = createFile(defaultSpritePng)
    const spriteInits: SpriteInits = { x: -71, y: 75, size: 0.5 } // offset & size to make sprite centered. depending on the size of spriteFile
    const sprite = Sprite.create('', undefined, spriteInits)
    sprite.addCostume(Costume.create('', spriteFile))
    const backdropFile = createFile(defaultBackdropImg)
    const backdrop = Backdrop.create('', backdropFile)
    const project = new Project()
    project.stage.setBackdrop(backdrop)
    project.addSprite(sprite)
    // upload project content & call API addProject, TODO: maybe this should be extracted to `@/models`?
    const files = project.export()[1]
    const fileUrls = await uploadFiles(files)
    const projectData = await addProject({
      name: form.value.name,
      isPublic: IsPublic.personal,
      files: fileUrls
    })
    emit('resolved', projectData)
  },
  { en: 'Failed to create project', zh: '项目创建失败' }
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
