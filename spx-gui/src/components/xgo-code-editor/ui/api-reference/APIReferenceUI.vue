<script lang="ts">
type SubCategory = {
  id: string
  label: LocaleMessage
  items: APIReferenceItem[]
}

type MainCategory = {
  id: string
  label: LocaleMessage
  icon: string
  subCategories: SubCategory[]
}

function belongs(item: APIReferenceItem, mcid: string, scid: string) {
  return item.categories.some((c) => c[0] === mcid && c[1] === scid)
}
</script>

<script setup lang="ts">
import { throttle } from 'lodash'
import { computed, ref, shallowRef, watch, watchEffect } from 'vue'
import { type LocaleMessage } from '@/utils/i18n'
import { ActionException, Cancelled } from '@/utils/exception'
import { getCleanupSignal } from '@/utils/disposable'
import { untilTaskScheduled } from '@/utils/utils'
import { UIError, UIIcon, UITextInput, UITooltip } from '@/components/ui'
import { stringifyDefinitionId } from '../../common'
import type { APIReferenceController, APIReferenceItem } from '.'
import APIReferenceItemComp from './APIReferenceItem.vue'
import { searchAPIReferenceItems } from './search'
import { useRegisterUpdateRouteLoaded } from '@/utils/route-loading'

const props = defineProps<{
  controller: APIReferenceController
}>()

const itemsForDisplay = computed<APIReferenceItem[] | null>((oldValue) => {
  // Ignore intermediate empty data to keep UI stable
  return props.controller.items ?? oldValue ?? null
})

const searchQuery = ref('')
const isSearching = computed(() => searchQuery.value.trim() !== '')
const searchResults = computed(() => searchAPIReferenceItems(itemsForDisplay.value ?? [], searchQuery.value))
const searchResultsWrapperRef = ref<HTMLElement>()

watch(
  searchResults,
  () => {
    if (searchResultsWrapperRef.value != null) searchResultsWrapperRef.value.scrollTop = 0
  },
  { flush: 'post' }
)

const loaded = ref(false)
// APIReferenceUI internally delays rendering of some data, which causes dependent modules to not work properly (e.g., tutorial)
// Register a provider with PageLoaded to notify dependent modules that APIReferenceUI has finished loading
useRegisterUpdateRouteLoaded(loaded)

const err = computed(() => {
  const err = props.controller.error
  if (err == null) return null
  if (err instanceof Cancelled) return null
  return new ActionException(err, { en: 'Failed to load data', zh: '加载数据失败' })
})

const categoriesComputed = computed<MainCategory[] | null>((oldValue) => {
  const items = itemsForDisplay.value
  const categoryViewInfos = props.controller.categoryViewInfos
  // Ignore intermediate empty data to keep UI stable
  if (items == null || categoryViewInfos == null) return oldValue ?? null
  const result: MainCategory[] = []
  for (const mcvi of categoryViewInfos) {
    const scs: SubCategory[] = []
    for (const scvi of mcvi.subCategories) {
      const scItems = items.filter((item) => belongs(item, mcvi.id, scvi.id))
      if (scItems.length === 0) continue
      scs.push({ ...scvi, items: scItems })
    }
    if (scs.length === 0) continue
    result.push({ ...mcvi, subCategories: scs })
  }
  return result
})

// Initially display only items of the first category to improve rendering performance. After a delay, display all items.
// Delay is applied only for the first update (from empty to non-empty).
const categoriesForItems = shallowRef(categoriesComputed.value ?? [])
watch(categoriesComputed, async (categories, oldValue, onCleanUp) => {
  if (categories == null) return oldValue ?? null
  if (categoriesForItems.value.length > 0) {
    categoriesForItems.value = categories
    return
  }
  categoriesForItems.value = categories.slice(0, 1)
  await untilTaskScheduled('background', getCleanupSignal(onCleanUp))
  categoriesForItems.value = categories
  loaded.value = true
})

const activeCategoryIdRef = ref<string | null>(null)

watch(
  categoriesComputed,
  (categories) => {
    if (categories == null) return
    if (categories.some((c) => c.id === activeCategoryIdRef.value)) return
    activeCategoryIdRef.value = categories[0]?.id ?? null
  },
  { immediate: true }
)

const itemsWrapperRef = ref<HTMLElement>()
const categoriesWrapperRef = ref<HTMLElement>()

watch(
  activeCategoryIdRef,
  () => {
    categoriesWrapperRef.value
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  },
  { flush: 'post' }
)

const scrolling = ref(false)

// Update `activeCategoryId` & `scrolling` when scrolling
watchEffect((onCleanup) => {
  const itemsWrapper = itemsWrapperRef.value
  if (itemsWrapper == null) return
  const signal = getCleanupSignal(onCleanup)
  let clearScrollingTimer: ReturnType<typeof setTimeout> | null = null

  const handleScroll = throttle(() => {
    scrolling.value = true
    if (clearScrollingTimer != null) clearTimeout(clearScrollingTimer)
    clearScrollingTimer = setTimeout(() => {
      scrolling.value = false
    }, 200)

    const scrollTop = itemsWrapper.scrollTop
    const categories = categoriesComputed.value ?? []
    const categoryWrappers = itemsWrapper.querySelectorAll('[data-category-id]')
    if (categoryWrappers.length <= 1) return
    // The final category may be too short to reach the top of the scroll area.
    if (scrollTop + itemsWrapper.clientHeight >= itemsWrapper.scrollHeight - 1) {
      activeCategoryIdRef.value = categories[categories.length - 1].id
      return
    }
    for (let i = 1; i < categoryWrappers.length; i++) {
      if ((categoryWrappers[i] as HTMLElement).offsetTop > scrollTop) {
        activeCategoryIdRef.value = categories[i - 1].id
        break
      }
      if (i === categoryWrappers.length - 1) {
        activeCategoryIdRef.value = categories[i].id
      }
    }
  }, 100)
  itemsWrapper.addEventListener('scroll', handleScroll, { signal })
})

function handleCategoryClick(id: string) {
  const itemsWrapper = itemsWrapperRef.value
  if (itemsWrapper == null) return
  const categoryWrapper = itemsWrapper.querySelector(`[data-category-id="${id}"]`)
  if (categoryWrapper == null) return
  itemsWrapper.scrollTo({
    top: (categoryWrapper as HTMLElement).offsetTop,
    behavior: 'smooth'
  })
}
</script>

<template>
  <section
    v-radar="{
      name: 'API References',
      desc: 'All available API reference items at left side of the code editor. Drag-n-drop or click one item to insert corresponding code snippet.'
    }"
    class="flex min-h-0 flex-col"
  >
    <UIError v-if="err != null">
      {{ $t(err.userMessage) }}
    </UIError>
    <template v-else>
      <div class="flex-none border-b border-dividing-line-2 px-3 py-2.5">
        <div class="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h4 class="text-sm font-medium text-title">{{ $t({ en: 'API Reference', zh: 'API 参考' }) }}</h4>
          <span
            v-if="controller.scopeLabel != null"
            class="shrink-0 whitespace-nowrap rounded-sm bg-grey-300 px-1.5 py-0.5 text-2xs text-hint-1"
          >
            {{ $t(controller.scopeLabel) }}
          </span>
        </div>
        <UITextInput
          v-model:value="searchQuery"
          v-radar="{ name: 'Search API Reference', desc: 'Search API names and functions in English or Chinese' }"
          :placeholder="$t({ en: 'Search API names or functions', zh: '搜索 API 名称或功能' })"
          clearable
          @keydown.esc.stop="searchQuery = ''"
        >
          <template #prefix><UIIcon type="search" /></template>
        </UITextInput>
      </div>
      <div v-if="isSearching" class="flex min-h-0 flex-[1_1_0] flex-col">
        <p class="flex-none px-4 py-3 text-xs text-hint-2" role="status" aria-live="polite">
          {{
            $t({
              en: searchResults.length === 1 ? 'Found 1 snippet' : `Found ${searchResults.length} snippets`,
              zh: `找到 ${searchResults.length} 种写法`
            })
          }}
        </p>
        <ul
          v-if="searchResults.length > 0"
          ref="searchResultsWrapperRef"
          class="flex min-h-0 flex-col gap-2 overflow-y-auto px-3 pb-3 [scrollbar-width:thin]"
        >
          <APIReferenceItemComp
            v-for="item in searchResults"
            :key="stringifyDefinitionId(item.definition)"
            :item="item"
            :interaction-disabled="false"
            show-description
          />
        </ul>
        <p v-else class="px-4 py-3 text-sm text-hint-2">
          {{
            $t({
              en: 'No matching APIs. Try another name or function.',
              zh: '没有找到匹配的 API，试试其他名称或功能词。'
            })
          }}
        </p>
      </div>
      <div v-show="!isSearching" class="flex min-h-0 flex-[1_1_0] flex-col">
        <ul
          ref="categoriesWrapperRef"
          class="h-10 flex flex-none items-center gap-1 overflow-x-auto border-b border-dividing-line-2 px-2 [scrollbar-width:none]"
        >
          <li v-for="c in categoriesComputed" :key="c.id" class="flex-none">
            <UITooltip placement="bottom">
              <template #trigger>
                <button
                  v-radar="{ name: $t(c.label), desc: 'Click to view APIs in this category' }"
                  type="button"
                  class="size-7 cursor-pointer appearance-none flex items-center justify-center rounded-sm border-none p-0 transition-colors duration-100"
                  :class="
                    c.id === activeCategoryIdRef
                      ? 'bg-grey-400 text-grey-1000'
                      : 'bg-transparent text-grey-800 hover:bg-grey-300'
                  "
                  :aria-pressed="c.id === activeCategoryIdRef"
                  @click="handleCategoryClick(c.id)"
                >
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <div class="size-4 [&>svg]:h-full [&>svg]:w-full" v-html="c.icon"></div>
                </button>
              </template>
              {{ $t(c.label) }}
            </UITooltip>
          </li>
        </ul>
        <ul
          ref="itemsWrapperRef"
          class="relative min-h-0 flex-[1_1_0] min-w-0 overflow-y-auto px-4 pb-3 [scrollbar-width:thin]"
        >
          <li
            v-for="c in categoriesForItems"
            :key="c.id"
            :data-category-id="c.id"
            class="[&:last-child>section:last-child]:border-b-0"
          >
            <section v-for="sc in c.subCategories" :key="sc.id" class="border-b border-dashed border-grey-500">
              <h5 class="sticky top-0 z-10 bg-grey-100 py-3 text-xs text-hint-2">{{ $t(sc.label) }}</h5>
              <ul class="flex flex-col gap-md pb-5">
                <APIReferenceItemComp
                  v-for="item in sc.items"
                  :key="stringifyDefinitionId(item.definition)"
                  :item="item"
                  :interaction-disabled="scrolling"
                />
              </ul>
            </section>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
