<script setup lang="ts">
import { computed } from 'vue'
import { UIDivider, UIIcon, UITooltip } from '@/components/ui'
import { textDocumentIdEq } from '../../common'
import type { TextDocument } from '../../text-document'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import DocumentTab from './DocumentTab.vue'

const codeEditorUICtx = useCodeEditorUICtx()
const mainTextDocument = computed(() => codeEditorUICtx.ui.mainTextDocument)
const tempTextDocuments = computed(() => codeEditorUICtx.ui.tempTextDocuments)

function isActive(doc: TextDocument) {
  return textDocumentIdEq(doc.id, codeEditorUICtx.ui.activeTextDocument?.id ?? null)
}

function handleTabClick(doc: TextDocument) {
  codeEditorUICtx.ui.open(doc.id)
}

function handleClose() {
  codeEditorUICtx.ui.closeTempTextDocuments()
}
</script>

<template>
  <div class="flex flex-col items-center">
    <DocumentTab
      v-if="mainTextDocument != null"
      :text-document="mainTextDocument"
      :is-active="isActive(mainTextDocument)"
      @click="handleTabClick(mainTextDocument)"
    />
    <template v-if="tempTextDocuments.length > 0">
      <UIDivider class="my-3 w-8" />
      <div class="flex-[0_1_auto] min-h-0 flex flex-col gap-2 overflow-y-auto [scrollbar-width:none]">
        <DocumentTab
          v-for="textDocument in tempTextDocuments"
          :key="textDocument.id.uri"
          :text-document="textDocument"
          :is-active="isActive(textDocument)"
          @click="handleTabClick(textDocument)"
        />
      </div>
      <UITooltip placement="right">
        {{ $t({ en: 'Close all', zh: '全部关闭' }) }}
        <template #trigger>
          <button
            class="mt-2 h-10 w-10 flex-none cursor-pointer flex items-center justify-center rounded-1 border-0 bg-transparent text-inherit hover:bg-grey-300"
            @click="handleClose"
          >
            <UIIcon class="w-5 h-5" type="closeCircle" />
          </button>
        </template>
      </UITooltip>
    </template>
  </div>
</template>
