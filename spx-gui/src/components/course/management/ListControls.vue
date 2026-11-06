<script lang="ts" setup>
import { UIIcon, UISelect, UISelectOption, UITextInput } from '@/components/ui'
import type { ListSortBy } from './list-view'

defineProps<{
  query: string
  sortBy: ListSortBy
  placeholder: string
}>()

const emit = defineEmits<{
  'update:query': [query: string]
  'update:sortBy': [sortBy: ListSortBy]
}>()

function handleSortByUpdate(value: string | null) {
  if (value === 'order' || value === 'title' || value === 'updatedAt') emit('update:sortBy', value)
}
</script>

<template>
  <div class="flex items-center gap-3">
    <UITextInput
      v-radar="{ name: 'search-input', desc: 'Input to search by title' }"
      class="w-72"
      clearable
      :value="query"
      :placeholder="placeholder"
      @update:value="(v) => emit('update:query', v)"
    >
      <template #prefix><UIIcon type="search" /></template>
    </UITextInput>
    <UISelect
      v-radar="{ name: 'sort-select', desc: 'Select how to sort the list' }"
      class="ml-auto w-36"
      :value="sortBy"
      @update:value="handleSortByUpdate"
    >
      <UISelectOption value="order">{{ $t({ en: 'Display order', zh: '显示顺序' }) }}</UISelectOption>
      <UISelectOption value="title">{{ $t({ en: 'Name', zh: '名称' }) }}</UISelectOption>
      <UISelectOption value="updatedAt">{{ $t({ en: 'Last edited', zh: '最后编辑' }) }}</UISelectOption>
    </UISelect>
  </div>
</template>
