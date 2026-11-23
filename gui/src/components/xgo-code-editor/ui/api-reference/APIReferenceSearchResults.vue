<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { UIIcon } from '@/components/ui'
import { builtInCommandCopilotAsk } from '../code-editor-ui'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import APIReferenceListContent from './APIReferenceListContent.vue'
import APIReferenceSearchItem from './APIReferenceSearchItem.vue'
import type { SearchState } from './use-api-reference-search'

const props = defineProps<{
  searchState: SearchState | null
  disabled?: boolean
}>()

const listElement = ref<HTMLUListElement | null>(null)
defineExpose({ listElement })

const completedSearch = computed(() => props.searchState?.data.value ?? null)
const count = computed(() => {
  const data = completedSearch.value
  if (data == null) return 0
  return data.groups.reduce(
    (count, group) => group.subCategories.reduce((sum, subCategory) => sum + subCategory.items.length, count),
    data.ungroupedItems.length
  )
})
const searchStatusMessage = computed(() => {
  if (props.searchState?.error.value != null) {
    return { en: 'Search failed. Try again.', zh: '搜索失败，请重试' }
  }
  if (completedSearch.value == null) return null
  if (count.value === 0) return { en: 'No matching snippets', zh: '未找到相关代码片段' }
  return {
    en: count.value === 1 ? 'Matched 1 snippet' : `Matched ${count.value} snippets`,
    zh: `匹配到 ${count.value} 个代码片段`
  }
})

const codeEditorUICtx = useCodeEditorUICtx()
const i18n = useI18n()
const askCopilotAction = computed(() => {
  const completed = completedSearch.value
  if (completed == null || count.value > 0) return null
  return codeEditorUICtx.ui.resolveAction({
    command: builtInCommandCopilotAsk,
    arguments: [
      i18n.t({
        en: `I searched for “${completed.query}” in the API References panel but found no matches. Can you help me find the right API?`,
        zh: `我在 API 参考面板里搜索了「${completed.query}」，但没有找到匹配的结果。你能帮我找到合适的 API 吗？`
      })
    ]
  })
})

const handleAskCopilot = useMessageHandle(
  () => {
    const action = askCopilotAction.value
    if (action != null) return codeEditorUICtx.ui.executeCommand(action.command, ...action.arguments)
  },
  { en: 'Failed to ask Copilot', zh: '向 Copilot 提问失败' }
).fn
</script>

<template>
  <div
    v-show="searchState != null"
    class="min-h-7 flex flex-none flex-wrap items-baseline gap-x-1.5 px-3 pt-0.5 pb-1.5 text-sm"
  >
    <p class="text-hint-2" role="status" aria-live="polite" aria-atomic="true">
      <span v-if="searchState?.isLoading.value" class="inline-flex items-center gap-1.5">
        <UIIcon type="loading" class="text-primary-main motion-reduce:animate-none!" aria-hidden="true" />
        {{ $t({ en: 'Searching…', zh: '正在查找…' }) }}
      </span>
      <template v-else>{{ $t(searchStatusMessage) }}</template>
    </p>
    <button
      v-if="askCopilotAction != null"
      v-radar="{
        name: 'ask-copilot-about-snippet-search',
        desc: 'Send this search as a question to Copilot'
      }"
      type="button"
      class="cursor-pointer appearance-none whitespace-nowrap rounded-sm border-none bg-transparent p-0 text-sm text-primary-main transition-colors hover:text-primary-400 active:text-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-main"
      @click="handleAskCopilot"
    >
      {{ $t(askCopilotAction.title) }}
    </button>
  </div>
  <div v-if="searchState != null" class="flex min-h-0 flex-[1_1_0] flex-col" :aria-busy="searchState.isLoading.value">
    <ul
      v-if="completedSearch != null && count > 0"
      ref="listElement"
      class="relative flex min-h-0 flex-col overflow-y-auto px-3 pb-3 [scrollbar-width:thin]"
    >
      <APIReferenceListContent :data="completedSearch" compact>
        <template #default="{ item }">
          <APIReferenceSearchItem :item="item" :disabled="disabled" />
        </template>
      </APIReferenceListContent>
    </ul>
  </div>
</template>
