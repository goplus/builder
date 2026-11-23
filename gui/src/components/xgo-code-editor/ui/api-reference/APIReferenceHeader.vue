<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { UIIcon, UITextInput, UITooltip } from '@/components/ui'
import type { SearchState } from './use-api-reference-search'

defineProps<{
  searchState: SearchState | null
}>()

const query = defineModel<string>('query', { required: true })
const emit = defineEmits<{ submit: [] }>()

const isSearchExpanded = ref(false)
const searchInputRef = ref<InstanceType<typeof UITextInput> | null>(null)
const searchToggleRef = ref<HTMLButtonElement | null>(null)

function handleSearchEnter(event: KeyboardEvent) {
  if (event.isComposing) event.preventDefault()
}

function closeSearch() {
  query.value = ''
  isSearchExpanded.value = false
  searchToggleRef.value?.focus()
}

async function toggleSearch() {
  if (isSearchExpanded.value) return closeSearch()
  isSearchExpanded.value = true
  // Expanding search mounts the input before it can receive focus.
  await nextTick()
  searchInputRef.value?.focus()
}

function handleSearchEscape(event: KeyboardEvent) {
  if (event.isComposing) return
  closeSearch()
}
</script>

<template>
  <div class="flex-none px-3 py-2">
    <div class="flex items-center justify-between gap-2">
      <h4 class="text-sm font-medium text-title">{{ $t({ en: 'Code snippets', zh: '代码片段' }) }}</h4>
      <div class="flex items-center gap-1">
        <UITooltip>
          <template #trigger>
            <button
              ref="searchToggleRef"
              v-radar="{ name: 'toggle-api-search', desc: 'Show or hide the code snippet search field' }"
              type="button"
              class="size-7 shrink-0 cursor-pointer appearance-none flex items-center justify-center rounded-sm border-none p-0 transition-colors duration-100"
              :class="
                isSearchExpanded
                  ? 'bg-primary-200 text-primary-main hover:bg-primary-100 active:bg-primary-300'
                  : 'bg-transparent text-grey-800 hover:bg-grey-300 active:bg-grey-400'
              "
              :aria-expanded="isSearchExpanded"
              @click="toggleSearch"
            >
              <UIIcon class="size-4" type="search" />
            </button>
          </template>
          {{
            $t(isSearchExpanded ? { en: 'Hide search', zh: '收起搜索' } : { en: 'Search snippets', zh: '搜索代码片段' })
          }}
        </UITooltip>
        <slot name="category-menu" />
      </div>
    </div>
    <form
      v-if="isSearchExpanded"
      class="mt-2 flex"
      :aria-label="$t({ en: 'Search snippets', zh: '搜索代码片段' })"
      :aria-busy="searchState?.isLoading.value ?? false"
      @submit.prevent="emit('submit')"
    >
      <UITextInput
        ref="searchInputRef"
        v-model:value="query"
        v-radar="{ name: 'search-api-reference', desc: 'Search snippet names and functions in English or Chinese' }"
        class="min-w-0 flex-1"
        :placeholder="$t({ en: 'Search by name or function', zh: '搜索名称或功能' })"
        :maxlength="512"
        clearable
        @keydown.enter="handleSearchEnter"
        @keydown.esc.stop="handleSearchEscape"
      >
        <template #prefix><UIIcon type="search" /></template>
      </UITextInput>
    </form>
  </div>
</template>
