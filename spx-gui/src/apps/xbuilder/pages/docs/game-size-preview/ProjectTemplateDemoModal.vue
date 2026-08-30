<template>
  <UIFormModal
    :radar="{ name: 'Create project modal', desc: 'Modal for creating a project from a template' }"
    class="project-create-modal"
    :title="$t({ en: 'Create a new project', zh: '创建新的项目' })"
    :visible="visible"
    :mask-closable="false"
    @update:visible="emit('update:visible', $event)"
  >
    <UIForm :form="form" has-success-feedback @submit="handleSubmit">
      <div data-testid="project-create-fields">
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
            data-testid="project-name-input"
            :placeholder="$t({ en: 'Please enter the project name', zh: '请输入项目名' })"
          />
        </UIFormItem>

        <div class="mt-6">
          <div class="mb-3">
            <div class="text-title">{{ $t({ en: 'Choose a template', zh: '选择模板' }) }}</div>
            <div class="mt-1 text-xs text-grey-700">
              {{
                $t({
                  en: 'The template determines the game canvas and editor preview layout.',
                  zh: '模板将决定游戏画面以及编辑器预览布局。'
                })
              }}
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="template in demoProjectTemplates"
              :key="template.id"
              v-radar="{
                name: `${template.name.en} project template`,
                desc: `Create a project from the ${template.name.en} template`
              }"
              type="button"
              class="min-w-0 rounded-md border p-2 text-left transition-colors"
              :class="
                selectedTemplateId === template.id
                  ? 'border-primary-500 bg-primary-100 text-primary-700'
                  : 'border-grey-400 bg-grey-100 hover:bg-grey-300'
              "
              :aria-pressed="selectedTemplateId === template.id"
              :data-testid="`create-template-${template.id}`"
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
              <div class="mt-1 line-clamp-2 min-h-8 text-2xs text-grey-700">
                {{ $t(template.description) }}
              </div>
            </button>
          </div>
        </div>
      </div>

      <footer class="mt-8 flex justify-center">
        <UIButton
          v-radar="{ name: 'Create button', desc: 'Click to create the project from the selected template' }"
          data-testid="create-project-button"
          type="primary"
          html-type="submit"
          :loading="loading"
        >
          {{ $t({ en: 'Create', zh: '创建' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  UIButton,
  UIForm,
  UIFormItem,
  UIFormModal,
  UITextInput,
  useForm,
  type FormValidationResult
} from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { demoProjectTemplates, type DemoProjectTemplateId } from './templates'

defineProps<{
  visible: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  created: [payload: { name: string; templateId: DemoProjectTemplateId }]
}>()

const { t } = useI18n()
const form = useForm({
  name: ['MyGame', validateName]
})
const selectedTemplateId = ref<DemoProjectTemplateId>('classic')

function handleSubmit() {
  emit('created', {
    name: form.value.name.trim(),
    templateId: selectedTemplateId.value
  })
}

function validateName(name: string): FormValidationResult {
  name = name.trim()
  if (name === '') return t({ en: 'The project name must not be blank', zh: '项目名不可为空' })
  if (!/^[\w-]+$/.test(name)) {
    return t({
      en: 'The project name can only contain letters, digits, and the characters - and _.',
      zh: '项目名仅可包含字母、数字以及字符 - 和 _。'
    })
  }
  return null
}
</script>

<style scoped>
.template-canvas {
  max-height: 100%;
}
</style>
