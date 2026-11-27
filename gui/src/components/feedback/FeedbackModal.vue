<script lang="ts">
import type { Feedback } from '@/apis/feedback'

/** Initial content of the Feedback form, which the user can still edit before sending */
export type FeedbackDraft = Pick<Feedback, 'title' | 'description'>
</script>

<script lang="ts" setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import {
  createFeedback,
  feedbackDescriptionMaxLength,
  feedbackRequestBodyMaxSize,
  feedbackTitleMaxLength
} from '@/apis/feedback'
import { UIButton, UICheckbox, UIForm, UIFormItem, UIFormModal, UITextInput, UITooltip, useForm } from '@/components/ui'
import { useEditorCtxRef } from '@/components/editor/EditorContextProvider.vue'
import { useCodeEditorRef } from '@/components/editor/spx-code-editor'
import { captureFeedbackContext, getEncodedSize, type FeedbackSource } from './context'

const props = defineProps<{
  source: FeedbackSource
  draft: FeedbackDraft | null
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
  title: [props.draft?.title ?? '', validateTitle],
  description: [props.draft?.description ?? '', validateDescription],
  shareContext: [true]
})

function validateTitle(value: string) {
  const trimmed = value.trim()
  if (trimmed === '') return i18n.t({ en: 'Enter a title.', zh: '请输入标题。' })
  if (trimmed.length > feedbackTitleMaxLength)
    return i18n.t({
      en: `The title must be ${feedbackTitleMaxLength} characters or fewer.`,
      zh: `标题不能超过 ${feedbackTitleMaxLength} 个字符。`
    })
  return null
}

function validateDescription(value: string) {
  const trimmed = value.trim()
  if (trimmed === '') return i18n.t({ en: 'Describe the problem.', zh: '请描述遇到的问题。' })
  if (trimmed.length > feedbackDescriptionMaxLength)
    return i18n.t({
      en: `The description must be ${feedbackDescriptionMaxLength} characters or fewer.`,
      zh: `描述不能超过 ${feedbackDescriptionMaxLength} 个字符。`
    })
  return null
}

const shareContextTooltipVisible = ref(false)

const handleSubmit = useMessageHandle(
  async () => {
    const title = form.value.title.trim()
    const description = form.value.description.trim()
    const context = form.value.shareContext
      ? await captureFeedbackContext({
          source: props.source,
          path: route.fullPath,
          language: i18n.lang.value,
          editorCtx: editorCtxRef.value ?? null,
          codeEditor: codeEditorRef.value,
          // Context may use what the rest of the request leaves of the body size limit.
          maxSize: feedbackRequestBodyMaxSize - getEncodedSize({ title, description, context: null })
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
    :radar="{ name: 'feedback-modal', desc: 'Modal for sending feedback about a problem' }"
    :title="$t({ en: 'Send feedback', zh: '提交反馈' })"
    :style="{ width: '560px' }"
    :visible="props.visible"
    @update:visible="handleCancel"
  >
    <UIForm :form="form" @submit="handleSubmit.fn">
      <UIFormItem :label="$t({ en: 'Title', zh: '标题' })" path="title">
        <UITextInput
          v-model:value="form.value.title"
          v-radar="{ name: 'feedback-title-input', desc: 'Input field for a short summary of the problem' }"
          :placeholder="$t({ en: 'Briefly describe the problem', zh: '简要描述遇到的问题' })"
        />
      </UIFormItem>
      <UIFormItem :label="$t({ en: 'Description', zh: '描述' })" path="description">
        <UITextInput
          v-model:value="form.value.description"
          v-radar="{ name: 'feedback-description-input', desc: 'Input field for details about the problem' }"
          type="textarea"
          :rows="6"
          :placeholder="$t({ en: 'What happened, and what did you expect?', zh: '发生了什么？你期望的结果是什么？' })"
        />
      </UIFormItem>
      <footer class="mt-5 flex items-center gap-3">
        <UITooltip v-model:visible="shareContextTooltipVisible" placement="top-start" class="max-w-100">
          <template #trigger>
            <UICheckbox
              v-model:checked="form.value.shareContext"
              v-radar="{ name: 'share-page-state-checkbox', desc: 'Toggle sharing page state' }"
              @focusin="shareContextTooltipVisible = true"
              @focusout="shareContextTooltipVisible = false"
            >
              {{ $t({ en: 'Attach page and project details', zh: '附带页面和项目信息' }) }}
            </UICheckbox>
          </template>
          {{
            $t({
              en: 'This may include page details, a copy of your project, code diagnostics, and runtime output to help us investigate.',
              zh: '可能附带页面信息、项目副本、代码检查结果和运行输出，帮助我们排查问题。'
            })
          }}
        </UITooltip>
        <div class="flex-1" />
        <UIButton
          v-radar="{ name: 'cancel-button', desc: 'Click to cancel sending feedback' }"
          type="neutral"
          :disabled="handleSubmit.isLoading.value"
          @click="handleCancel"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'send-button', desc: 'Click to send the feedback' }"
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
