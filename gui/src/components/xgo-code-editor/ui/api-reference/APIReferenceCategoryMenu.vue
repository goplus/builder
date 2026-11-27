<script lang="ts">
import { defineComponent, h, ref, watch } from 'vue'
import { usePopupReady } from '@/components/ui/utils'

const CategoryMenuPanel = defineComponent({
  setup(_, { expose, slots }) {
    const panelRef = ref<HTMLUListElement | null>(null)
    const popupReady = usePopupReady()
    expose({ hasFocus: () => panelRef.value?.contains(document.activeElement) ?? false })

    // Once the menu is ready, focus the active category or the first enabled one.
    // TODO: Consider adding opt-in autoFocus to UIDropdown, like UIModal, with a configurable target.
    watch(
      () => (popupReady.value ? panelRef.value : null),
      (panel) => {
        if (panel == null) return
        const button =
          panel.querySelector<HTMLButtonElement>('[aria-pressed="true"]:not(:disabled)') ??
          panel.querySelector<HTMLButtonElement>('button:not(:disabled)')
        button?.focus()
      },
      { flush: 'post' }
    )

    return () => h('ul', { ref: panelRef }, slots.default?.())
  }
})
</script>

<script setup lang="ts">
import { UIDropdown, UIIcon, UITooltip } from '@/components/ui'
import type { APICategoryViewInfo } from '.'
import type { SearchState } from './use-api-reference-search'

const props = defineProps<{
  /** Categories in display order. */
  categories: APICategoryViewInfo[]
  /** The category highlighted for the visible list, or null if none is active. */
  activeCategoryId: string | null
  /** Null while browsing. Completed searches provide the displayed results for each category. */
  searchState: SearchState | null
}>()

function getResultCount(id: string) {
  const group = props.searchState?.data.value?.groups.find((group) => group.id === id)
  return group?.subCategories.reduce((count, subCategory) => count + subCategory.items.length, 0) ?? 0
}

const visible = ref(false)
const emit = defineEmits<{ select: [id: string] }>()

const categoryToggleRef = ref<HTMLButtonElement | null>(null)
const categoryMenuRef = ref<{ hasFocus(): boolean } | null>(null)

// Restore focus to the trigger on close if it is still inside the menu.
// TODO: Consider making focus restoration opt-in on UIDropdown.
watch(visible, (open) => {
  if (!open && categoryMenuRef.value?.hasFocus()) {
    categoryToggleRef.value?.focus()
  }
})

function selectCategory(id: string) {
  emit('select', id)
  visible.value = false
}
</script>

<template>
  <UIDropdown v-model:visible="visible" trigger="manual" placement="right-start" :offset="{ x: 8, y: 0 }">
    <template #trigger>
      <UITooltip :disabled="visible">
        <template #trigger>
          <button
            ref="categoryToggleRef"
            v-radar="{ name: 'api-categories', desc: 'Choose a snippet category to browse' }"
            type="button"
            class="size-7 shrink-0 cursor-pointer appearance-none flex items-center justify-center rounded-sm border-none p-0 transition-colors duration-100"
            :class="
              visible
                ? 'bg-primary-200 text-primary-main hover:bg-primary-100 active:bg-primary-300'
                : 'bg-transparent text-grey-800 hover:bg-grey-300 active:bg-grey-400'
            "
            :aria-expanded="visible"
            @click="visible = !visible"
          >
            <UIIcon class="size-4" type="filter" />
          </button>
        </template>
        {{ $t({ en: 'Snippet categories', zh: '代码片段分类' }) }}
      </UITooltip>
    </template>
    <CategoryMenuPanel
      ref="categoryMenuRef"
      v-radar="{ name: 'api-category-list', desc: 'Available snippet categories' }"
      class="w-40 flex flex-col gap-1 p-1.5"
    >
      <li v-for="c in categories" :key="c.id">
        <button
          v-radar="{
            name: 'api-category',
            label: $t(c.label),
            attrs: { name: c.id },
            desc: searchState?.isLoading.value
              ? $t({ en: 'Searching…', zh: '正在查找…' })
              : searchState?.data.value != null
                ? $t({
                    en: `${getResultCount(c.id)} matching snippets`,
                    zh: `匹配到 ${getResultCount(c.id)} 个代码片段`
                  })
                : searchState == null
                  ? $t({ en: 'Click to view snippets in this category', zh: '点击查看该分类下的代码片段' })
                  : ''
          }"
          type="button"
          class="h-8 w-full appearance-none flex items-center gap-2 rounded-sm border-none px-2 text-xs transition-colors duration-100 enabled:cursor-pointer disabled:cursor-not-allowed disabled:text-disabled-text"
          :class="
            c.id === activeCategoryId
              ? 'bg-grey-400 text-grey-1000'
              : 'bg-transparent text-grey-800 enabled:hover:bg-grey-300 enabled:active:bg-grey-400'
          "
          :disabled="searchState != null && (searchState.isLoading.value || getResultCount(c.id) === 0)"
          :aria-pressed="c.id === activeCategoryId"
          @click="selectCategory(c.id)"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="size-4 shrink-0 [&>svg]:h-full [&>svg]:w-full" v-html="c.icon"></span>
          {{ $t(c.label) }}
          <span v-if="searchState?.data.value != null" class="ml-auto text-hint-2">
            {{ getResultCount(c.id) }}
          </span>
        </button>
      </li>
    </CategoryMenuPanel>
  </UIDropdown>
</template>
