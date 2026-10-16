<script setup lang="ts">
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { CodeEditorUI, getTextDocumentId, useCodeEditor } from '@/components/xgo-code-editor'
import { UIButton } from '@/components/ui'

const editor = useCodeEditor()
const i18n = useI18n()

const handleFormat = useMessageHandle(
  () =>
    editor.history.doAction({ name: { en: 'Format code', zh: '格式化代码' } }, () =>
      editor.formatTextDocument(getTextDocumentId(mainCourseFilePath))
    ),
  { en: 'Failed to format, please check the code', zh: '格式化失败，请检查代码' }
)
</script>

<template>
  <div class="flex justify-end border-b border-dividing-line-2 p-2">
    <UIButton
      v-radar="{ name: 'format-button', desc: 'Click to format the course program' }"
      type="white"
      :loading="handleFormat.isLoading.value"
      @click="handleFormat.fn"
    >
      {{ $t({ en: 'Format', zh: '格式化' }) }}
    </UIButton>
  </div>
  <CodeEditorUI :key="i18n.lang.value" :code-file-path="mainCourseFilePath" :has-api-reference="false" />
</template>
