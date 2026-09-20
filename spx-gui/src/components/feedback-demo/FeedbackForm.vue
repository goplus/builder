<script setup lang="ts">
import { ref, useId } from 'vue'

import { useI18n } from '@/utils/i18n'
import { UIButton, UIForm, UIFormItem, UISwitch, UITextInput, useForm } from '@/components/ui'
import type { FeedbackDraft, FeedbackSource } from './mock-data'
import type { SubmitFeedbackInput } from './model'

const props = defineProps<{
  source: FeedbackSource
  draft: FeedbackDraft
  submitting?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  submit: [SubmitFeedbackInput]
}>()

const { t } = useI18n()
const contextTitleID = useId()
const contextDescriptionID = useId()
const form = useForm({
  title: [props.draft.title, validateTitle],
  description: [props.draft.description, validateDescription]
})
const includeContext = ref(props.draft.includeContext ?? true)

function validateTitle(value: string) {
  if (value.trim() === '') return t({ en: 'Enter a short title', zh: '请填写一个简短的标题' })
  return null
}

function validateDescription(value: string) {
  if (value.trim() === '') return t({ en: 'Describe what happened', zh: '请描述发生了什么' })
  return null
}

function submit() {
  emit('submit', {
    source: props.source,
    title: form.value.title,
    description: form.value.description,
    attachments: [],
    includeContext: includeContext.value
  })
}
</script>

<template>
  <div :aria-busy="props.submitting || undefined">
    <UIForm :form="form" @submit="submit">
      <UIFormItem :label="$t({ en: 'Title', zh: '标题' })" path="title">
        <UITextInput
          v-model:value="form.value.title"
          v-radar="{ name: 'Feedback title', desc: 'A short title for this feedback' }"
          :placeholder="$t({ en: 'Briefly describe the problem', zh: '用一句话概括问题' })"
          :maxlength="100"
          clearable
        />
      </UIFormItem>

      <UIFormItem :label="$t({ en: 'Description', zh: '详细描述' })" path="description">
        <UITextInput
          v-model:value="form.value.description"
          v-radar="{ name: 'Feedback description', desc: 'Detailed description of the feedback' }"
          type="textarea"
          :rows="5"
          :maxlength="2000"
          :placeholder="$t({ en: 'What happened? What did you expect?', zh: '发生了什么？你原本希望发生什么？' })"
        />
      </UIFormItem>

      <section class="mt-6 border-t border-grey-300 pt-4" :aria-labelledby="contextTitleID">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h3 :id="contextTitleID" class="text-sm font-medium text-title">
              {{ $t({ en: 'Share diagnostic details', zh: '分享诊断信息' }) }}
            </h3>
            <p :id="contextDescriptionID" class="mt-1 text-xs leading-5 text-grey-800">
              {{
                $t({
                  en: 'Includes the current page and language, project structure, selected sprite, nearby code, diagnostics, and the latest 50 runtime outputs.',
                  zh: '包含当前页面与语言、项目结构、所选角色、附近代码、代码诊断和最近 50 条运行输出。'
                })
              }}
            </p>
          </div>
          <UISwitch
            v-model:value="includeContext"
            v-radar="{ name: 'Share diagnostic details', desc: 'Choose whether to share troubleshooting details' }"
            class="mt-0.5 shrink-0"
            :aria-labelledby="contextTitleID"
            :aria-describedby="contextDescriptionID"
          />
        </div>
      </section>

      <footer class="mt-6 flex justify-end gap-3">
        <UIButton type="neutral" :disabled="props.submitting" @click="emit('cancel')">
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Submit feedback', desc: 'Submit this feedback to the mock feedback pool' }"
          html-type="submit"
          :disabled="props.submitting"
          :loading="props.submitting"
        >
          {{ $t({ en: 'Send feedback', zh: '提交反馈' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </div>
</template>
