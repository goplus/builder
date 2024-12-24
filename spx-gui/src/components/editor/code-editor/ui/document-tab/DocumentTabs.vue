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
  <div class="document-tabs">
    <DocumentTab
      v-if="mainTextDocument != null"
      :text-document="mainTextDocument"
      :is-active="isActive(mainTextDocument)"
      @click="handleTabClick(mainTextDocument)"
    />
    <template v-if="tempTextDocuments.length > 0">
      <UIDivider class="divider" />
      <div class="temp-tabs">
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
          <button class="close-btn" @click="handleClose">
            <UIIcon class="icon" type="closeCircle" />
          </button>
        </template>
      </UITooltip>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.document-tabs {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.divider {
  width: 32px;
  margin: 12px 0;
}

.temp-tabs {
  flex: 0 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scrollbar-width: none;
}

.close-btn {
  margin-top: 8px;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  border-radius: var(--ui-border-radius-1);

  &:hover {
    background-color: var(--ui-color-grey-300);
  }

  .icon {
    width: 20px;
    height: 20px;
  }
}
</style>
