<script lang="ts" setup>
import { useRoute } from 'vue-router'
import { useMessageHandle } from '@/utils/exception'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import {
  createFeedback,
  feedbackDescriptionMaxLength,
  feedbackRequestBodyMaxSize,
  feedbackTitleMaxLength,
  type Feedback
} from '@/apis/feedback'
import { UIButton, UICheckbox, UIForm, UIFormItem, UIFormModal, UITextInput, UITooltip, useForm } from '@/components/ui'
import { useEditorCtxRef } from '@/components/editor/EditorContextProvider.vue'
import { useCodeEditorRef } from '@/components/editor/spx-code-editor'
import { captureFeedbackContext, type FeedbackSource } from './context'

const props = defineProps<{
  source: FeedbackSource
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [Feedback]
}>()

const i18n = useI18n()
const route = useRoute()
const editorCtxRef = useEditorCtxRef()
const codeEditorRef = useCodeEditorRef()

const form = useForm({
  title: ['', validateTitle],
  description: ['', validateDescription],
  shareContext: [true]
})

function validateText(value: string, name: LocaleMessage) {
  if (value.trim() === '') return i18n.t({ en: `The ${name.en} must not be blank`, zh: `${name.zh}不可为空` })
  return null
}

function validateTitle(value: string) {
  return validateText(value, { en: 'title', zh: '标题' })
}

function validateDescription(value: string) {
  return validateText(value, { en: 'description', zh: '描述' })
}

const handleSubmit = useMessageHandle(
  async () => {
    const title = form.value.title.trim()
    const description = form.value.description.trim()
    // Context may use what the rest of the request leaves of the body size limit.
    const restSize = new TextEncoder().encode(JSON.stringify({ title, description, context: null })).length
    const context = form.value.shareContext
      ? await captureFeedbackContext({
          source: props.source,
          path: route.fullPath,
          language: i18n.lang.value,
          editorCtx: editorCtxRef.value ?? null,
          codeEditor: codeEditorRef.value,
          maxSize: feedbackRequestBodyMaxSize - restSize
        })
      : undefined
    const feedback = await createFeedback({ title, description, context })
    emit('resolved', feedback)
  },
  { en: 'Failed to send feedback', zh: '提交反馈失败' },
  { en: 'Feedback sent. Thank you!', zh: '反馈已提交，感谢！' }
)

// A request already sent cannot be taken back, so the form stays open until it settles.
function handleCancel() {
  if (handleSubmit.isLoading.value) return
  emit('cancelled')
}
</script>

<template>
  <UIFormModal
    :radar="{ name: 'Feedback modal', desc: 'Modal for sending feedback about a problem' }"
    :title="$t({ en: 'Send feedback', zh: '提交反馈' })"
    :style="{ width: '560px' }"
    :visible="props.visible"
    @update:visible="handleCancel"
  >
    <UIForm :form="form" @submit="handleSubmit.fn">
      <UIFormItem :label="$t({ en: 'Title', zh: '标题' })" path="title">
        <UITextInput
          v-model:value="form.value.title"
          v-radar="{ name: 'Feedback title input', desc: 'Input field for a short summary of the problem' }"
          :maxlength="feedbackTitleMaxLength"
          :placeholder="$t({ en: 'Briefly describe the problem', zh: '简要描述遇到的问题' })"
        />
      </UIFormItem>
      <UIFormItem :label="$t({ en: 'Description', zh: '描述' })" path="description">
        <UITextInput
          v-model:value="form.value.description"
          v-radar="{ name: 'Feedback description input', desc: 'Input field for details about the problem' }"
          type="textarea"
          :rows="6"
          :maxlength="feedbackDescriptionMaxLength"
          :placeholder="$t({ en: 'What happened, and what did you expect?', zh: '发生了什么？你期望的结果是什么？' })"
        />
      </UIFormItem>
      <footer class="mt-5 flex items-center gap-3">
        <UITooltip placement="top-start" class="max-w-100">
          <template #trigger>
            <UICheckbox
              v-model:checked="form.value.shareContext"
              v-radar="{ name: 'Share diagnostic information checkbox', desc: 'Toggle sharing diagnostic information' }"
            >
              {{ $t({ en: 'Share diagnostic information', zh: '分享诊断信息' }) }}
            </UICheckbox>
          </template>
          {{
            $t({
              en: 'Includes the current page, project, code errors, and runtime output to help us find the problem faster.',
              zh: '附带当前页面、项目、代码报错和运行输出，帮助我们更快定位问题。'
            })
          }}
        </UITooltip>
        <div class="flex-1" />
        <UIButton
          v-radar="{ name: 'Cancel button', desc: 'Click to cancel sending feedback' }"
          type="neutral"
          :disabled="handleSubmit.isLoading.value"
          @click="handleCancel"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Send button', desc: 'Click to send the feedback' }"
          type="primary"
          html-type="submit"
          :loading="handleSubmit.isLoading.value"
        >
          {{ $t({ en: 'Send', zh: '提交' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>
