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
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch, watchEffect } from 'vue'
import { type LocaleMessage } from '@/utils/i18n'
import { ActionException, Cancelled } from '@/utils/exception'
import { getCleanupSignal } from '@/utils/disposable'
import { timeout, untilTaskScheduled } from '@/utils/utils'
import { UIButton, UIDropdown, UIError, UIIcon, UITextInput, UITooltip } from '@/components/ui'
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

const isSearchDemo = new URLSearchParams(location.search).get('snippetSearchDemo') === '1'
const searchQuery = ref('')
const isSearchExpanded = ref(false)
const searchInputRef = ref<InstanceType<typeof UITextInput>>()
const searchToggleRef = ref<HTMLButtonElement>()
const submittedSearchQuery = ref('')
const isSearching = computed(() => submittedSearchQuery.value !== '')
const searchResults = shallowRef<APIReferenceItem[]>([])
const isSearchPending = ref(false)
const showSearchLoading = ref(false)
const searchFailed = ref(false)
const canSubmitSearch = computed(
  () => searchQuery.value.trim() !== '' && (props.controller.items?.length ?? 0) > 0 && !isSearchPending.value
)
const searchResultsWrapperRef = ref<HTMLElement>()
let searchVersion = 0
let searchController: AbortController | null = null
let searchLoadingTimer: ReturnType<typeof setTimeout> | null = null

function resetSearch() {
  searchVersion++
  searchController?.abort(new Cancelled('search changed'))
  searchController = null
  if (searchLoadingTimer != null) clearTimeout(searchLoadingTimer)
  searchLoadingTimer = null
  submittedSearchQuery.value = ''
  searchResults.value = []
  isSearchPending.value = false
  showSearchLoading.value = false
  searchFailed.value = false
}

async function submitSearch() {
  if (!canSubmitSearch.value) return
  const query = searchQuery.value.trim()
  const items = props.controller.items ?? []
  const version = ++searchVersion
  const controller = new AbortController()
  searchController = controller
  submittedSearchQuery.value = query
  searchResults.value = []
  searchFailed.value = false
  isSearchPending.value = true
  showSearchLoading.value = false
  if (isCategoryMenuVisible.value) void setCategoryMenuVisible(false)
  searchLoadingTimer = setTimeout(() => {
    if (version === searchVersion) showSearchLoading.value = true
  }, 200)
  try {
    const results = await searchAPIReferenceItems(items, query)
    if (isSearchDemo) await timeout(600, controller.signal)
    if (version === searchVersion) searchResults.value = results
  } catch {
    if (version === searchVersion) searchFailed.value = true
  } finally {
    if (version === searchVersion) {
      searchController = null
      if (searchLoadingTimer != null) clearTimeout(searchLoadingTimer)
      searchLoadingTimer = null
      isSearchPending.value = false
      showSearchLoading.value = false
    }
  }
}

function handleSearchEnter(event: KeyboardEvent) {
  if (event.isComposing || event.keyCode === 229) event.preventDefault()
}

watch([searchQuery, () => props.controller, () => props.controller.items], resetSearch, { flush: 'sync' })
onBeforeUnmount(resetSearch)

function closeSearch() {
  searchQuery.value = ''
  isSearchExpanded.value = false
  searchToggleRef.value?.focus()
}

async function toggleSearch() {
  if (isSearchExpanded.value) return closeSearch()
  isSearchExpanded.value = true
  await nextTick()
  searchInputRef.value?.focus()
}

function handleSearchEscape(event: KeyboardEvent) {
  if (event.isComposing) return
  if (isCategoryMenuVisible.value) void setCategoryMenuVisible(false)
  else closeSearch()
}

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

const searchResultGroups = computed(() => {
  const groups = (categoriesComputed.value ?? []).map((category) => ({
    ...category,
    subCategories: category.subCategories.map((subCategory) => ({
      ...subCategory,
      items: [] as APIReferenceItem[]
    }))
  }))
  for (const item of searchResults.value) {
    // Assign shared APIs to their first available category path so results stay unique.
    for (const [mainId, subId] of item.categories) {
      const subCategory = groups.find((group) => group.id === mainId)?.subCategories.find((group) => group.id === subId)
      if (subCategory == null) continue
      subCategory.items.push(item)
      break
    }
  }
  return groups
    .map((group) => ({
      ...group,
      subCategories: group.subCategories.filter((subCategory) => subCategory.items.length > 0),
      resultCount: group.subCategories.reduce((count, subCategory) => count + subCategory.items.length, 0)
    }))
    .filter((group) => group.resultCount > 0)
})

const categoryMenuItems = computed(() =>
  (categoriesComputed.value ?? []).map((category) => ({
    ...category,
    resultCount: searchResultGroups.value.find((group) => group.id === category.id)?.resultCount ?? 0
  }))
)

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
const activeSearchCategoryIdRef = ref<string | null>(null)
const currentActiveCategoryId = computed(() =>
  isSearching.value ? activeSearchCategoryIdRef.value : activeCategoryIdRef.value
)

watch(
  searchResultGroups,
  (groups) => {
    activeSearchCategoryIdRef.value = groups[0]?.id ?? null
    if (searchResultsWrapperRef.value != null) searchResultsWrapperRef.value.scrollTop = 0
  },
  { immediate: true, flush: 'post' }
)

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
const currentItemsWrapper = computed(() => (isSearching.value ? searchResultsWrapperRef.value : itemsWrapperRef.value))
const isCategoryMenuVisible = ref(false)
const categoryToggleRef = ref<HTMLButtonElement>()
const categoryMenuRef = ref<HTMLElement>()

async function setCategoryMenuVisible(visible: boolean) {
  const hadFocus = categoryMenuRef.value?.contains(document.activeElement)
  isCategoryMenuVisible.value = visible
  if (!visible) {
    if (hadFocus) categoryToggleRef.value?.focus()
    return
  }
  await nextTick()
  await untilTaskScheduled('user-visible')
  if (!isCategoryMenuVisible.value) return
  const button =
    categoryMenuRef.value?.querySelector<HTMLButtonElement>('[aria-pressed="true"]:not(:disabled)') ??
    categoryMenuRef.value?.querySelector<HTMLButtonElement>('button:not(:disabled)')
  button?.focus()
}

const scrolling = ref(false)

// Update `activeCategoryId` & `scrolling` when scrolling
watchEffect((onCleanup) => {
  const itemsWrapper = currentItemsWrapper.value
  if (itemsWrapper == null) return
  const searching = isSearching.value
  const signal = getCleanupSignal(onCleanup)
  let clearScrollingTimer: ReturnType<typeof setTimeout> | null = null

  const handleScroll = throttle(() => {
    if (itemsWrapper !== currentItemsWrapper.value || itemsWrapper.clientHeight === 0) return
    scrolling.value = true
    if (clearScrollingTimer != null) clearTimeout(clearScrollingTimer)
    clearScrollingTimer = setTimeout(() => {
      scrolling.value = false
    }, 200)

    const scrollTop = itemsWrapper.scrollTop
    const categoryWrappers = Array.from(itemsWrapper.querySelectorAll<HTMLElement>('[data-category-id]'))
    let active = categoryWrappers[0]
    if (active == null) return
    // The final category may be too short to reach the top of the scroll area.
    if (
      itemsWrapper.scrollHeight > itemsWrapper.clientHeight &&
      scrollTop + itemsWrapper.clientHeight >= itemsWrapper.scrollHeight - 1
    ) {
      active = categoryWrappers[categoryWrappers.length - 1]
    } else {
      for (const category of categoryWrappers) {
        if (category.offsetTop > scrollTop + 1) break
        active = category
      }
    }
    if (searching) activeSearchCategoryIdRef.value = active.dataset.categoryId ?? null
    else activeCategoryIdRef.value = active.dataset.categoryId ?? null
  }, 100)
  itemsWrapper.addEventListener('scroll', handleScroll, { signal })
  signal.addEventListener('abort', () => {
    handleScroll.cancel()
    if (clearScrollingTimer != null) clearTimeout(clearScrollingTimer)
    scrolling.value = false
  })
})

async function handleCategoryClick(id: string) {
  await nextTick()
  const itemsWrapper = currentItemsWrapper.value
  if (itemsWrapper == null) return
  const categoryWrapper = itemsWrapper.querySelector(`[data-category-id="${id}"]`)
  if (categoryWrapper == null) return
  if (isSearching.value) activeSearchCategoryIdRef.value = id
  else activeCategoryIdRef.value = id
  itemsWrapper.scrollTo({
    top: (categoryWrapper as HTMLElement).offsetTop,
    behavior: 'smooth'
  })
  await setCategoryMenuVisible(false)
}
</script>

<template>
  <section
    v-radar="{
      name: 'API References',
      desc: 'All available code snippets at left side of the code editor. Drag-n-drop or click one item to insert corresponding code snippet.'
    }"
    class="flex min-h-0 flex-col"
  >
    <UIError v-if="err != null">
      {{ $t(err.userMessage) }}
    </UIError>
    <template v-else>
      <div class="flex-none px-3 py-2">
        <div class="flex items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-1.5">
            <h4 class="text-sm font-medium text-title">{{ $t({ en: 'Code snippets', zh: '代码片段' }) }}</h4>
            <span v-if="isSearchDemo" class="rounded-sm bg-primary-200 px-1 text-xs text-primary-700">
              {{ $t({ en: 'Demo', zh: '演示' }) }}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <UITooltip>
              <template #trigger>
                <button
                  ref="searchToggleRef"
                  v-radar="{ name: 'Toggle API search', desc: 'Show or hide the code snippet search field' }"
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
                $t(
                  isSearchExpanded
                    ? { en: 'Hide search', zh: '收起搜索' }
                    : { en: 'Search snippets', zh: '搜索代码片段' }
                )
              }}
            </UITooltip>
            <UIDropdown
              :visible="isCategoryMenuVisible"
              trigger="manual"
              placement="right-start"
              :offset="{ x: 8, y: 0 }"
              @update:visible="setCategoryMenuVisible"
            >
              <template #trigger>
                <UITooltip :disabled="isCategoryMenuVisible">
                  <template #trigger>
                    <button
                      ref="categoryToggleRef"
                      v-radar="{ name: 'API categories', desc: 'Choose a snippet category to browse' }"
                      type="button"
                      class="size-7 shrink-0 cursor-pointer appearance-none flex items-center justify-center rounded-sm border-none p-0 transition-colors duration-100"
                      :class="
                        isCategoryMenuVisible
                          ? 'bg-primary-200 text-primary-main hover:bg-primary-100 active:bg-primary-300'
                          : 'bg-transparent text-grey-800 hover:bg-grey-300 active:bg-grey-400'
                      "
                      :aria-expanded="isCategoryMenuVisible"
                      @click="setCategoryMenuVisible(!isCategoryMenuVisible)"
                    >
                      <UIIcon class="size-4" type="filter" />
                    </button>
                  </template>
                  {{ $t({ en: 'Snippet categories', zh: '代码片段分类' }) }}
                </UITooltip>
              </template>
              <ul
                ref="categoryMenuRef"
                v-radar="{ name: 'API category list', desc: 'Available snippet categories' }"
                class="w-40 flex flex-col gap-1 p-1.5"
              >
                <li v-for="c in categoryMenuItems" :key="c.id">
                  <button
                    v-radar="{
                      name: $t(c.label),
                      desc: isSearchPending
                        ? $t({ en: 'Searching…', zh: '正在查找…' })
                        : isSearching
                          ? $t({ en: `${c.resultCount} matching snippets`, zh: `匹配到 ${c.resultCount} 个代码片段` })
                          : 'Click to view snippets in this category'
                    }"
                    type="button"
                    class="h-8 w-full appearance-none flex items-center gap-2 rounded-sm border-none px-2 text-xs transition-colors duration-100 enabled:cursor-pointer disabled:cursor-not-allowed disabled:text-disabled-text"
                    :class="
                      c.id === currentActiveCategoryId
                        ? 'bg-grey-400 text-grey-1000'
                        : 'bg-transparent text-grey-800 enabled:hover:bg-grey-300 enabled:active:bg-grey-400'
                    "
                    :disabled="isSearching && (isSearchPending || c.resultCount === 0)"
                    :aria-pressed="c.id === currentActiveCategoryId"
                    @click="handleCategoryClick(c.id)"
                  >
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <span class="size-4 shrink-0 [&>svg]:h-full [&>svg]:w-full" v-html="c.icon"></span>
                    {{ $t(c.label) }}
                    <span v-if="isSearching && !isSearchPending" class="ml-auto text-hint-2">{{ c.resultCount }}</span>
                  </button>
                </li>
              </ul>
            </UIDropdown>
          </div>
        </div>
        <form
          v-if="isSearchExpanded"
          class="mt-2 flex items-center gap-2"
          :aria-label="$t({ en: 'Search snippets', zh: '搜索代码片段' })"
          @submit.prevent="submitSearch"
        >
          <UITextInput
            ref="searchInputRef"
            v-model:value="searchQuery"
            v-radar="{ name: 'Search API Reference', desc: 'Search snippet names and functions in English or Chinese' }"
            class="min-w-0 flex-1"
            :placeholder="$t({ en: 'Search by name or function', zh: '搜索名称或功能' })"
            clearable
            @keydown.enter="handleSearchEnter"
            @keydown.esc.stop="handleSearchEscape"
          >
            <template #prefix><UIIcon type="search" /></template>
          </UITextInput>
          <UIButton
            v-radar="{ name: 'Submit snippet search', desc: 'Submit the current snippet search' }"
            class="min-w-14 shrink-0 px-2"
            html-type="submit"
            :disabled="!canSubmitSearch"
          >
            {{ $t(isSearchPending ? { en: 'Searching…', zh: '搜索中…' } : { en: 'Search', zh: '搜索' }) }}
          </UIButton>
        </form>
      </div>
      <p
        v-show="isSearching"
        class="min-h-7 flex-none px-3 pt-0.5 pb-1.5 text-sm text-hint-2"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span v-if="isSearchPending && showSearchLoading" class="inline-flex items-center gap-1.5">
          <UIIcon type="loading" class="text-primary-main motion-reduce:animate-none!" aria-hidden="true" />
          {{ $t({ en: 'Searching…', zh: '正在查找…' }) }}
        </span>
        <template v-else-if="!isSearchPending && isSearching">
          {{
            $t(
              searchFailed
                ? { en: 'Search failed. Try again.', zh: '搜索失败，请重试' }
                : searchResults.length > 0
                  ? {
                      en: searchResults.length === 1 ? 'Matched 1 snippet' : `Matched ${searchResults.length} snippets`,
                      zh: `匹配到 ${searchResults.length} 个代码片段`
                    }
                  : { en: 'No matching snippets', zh: '未找到相关代码片段' }
            )
          }}
        </template>
      </p>
      <div v-if="isSearching" class="flex min-h-0 flex-[1_1_0] flex-col" :aria-busy="isSearchPending">
        <ul
          v-if="!isSearchPending && searchResults.length > 0"
          ref="searchResultsWrapperRef"
          class="relative flex min-h-0 flex-col overflow-y-auto px-3 pb-3 [scrollbar-width:thin]"
        >
          <li v-for="group in searchResultGroups" :key="group.id" :data-category-id="group.id">
            <section v-for="sc in group.subCategories" :key="sc.id">
              <h5 class="sticky top-0 z-10 bg-grey-100 py-2 text-xs text-hint-2">{{ $t(sc.label) }}</h5>
              <ul class="flex flex-col gap-1 pb-4">
                <APIReferenceItemComp
                  v-for="item in sc.items"
                  :key="stringifyDefinitionId(item.definition)"
                  :item="item"
                  :interaction-disabled="false"
                  show-description
                />
              </ul>
            </section>
          </li>
        </ul>
      </div>
      <div v-show="!isSearching" class="flex min-h-0 flex-[1_1_0] flex-col">
        <ul
          ref="itemsWrapperRef"
          class="relative min-h-0 flex-[1_1_0] min-w-0 overflow-y-auto px-3 pb-3 [scrollbar-width:thin]"
        >
          <li v-for="c in categoriesForItems" :key="c.id" :data-category-id="c.id">
            <section v-for="sc in c.subCategories" :key="sc.id">
              <h5 class="sticky top-0 z-10 bg-grey-100 py-2 text-xs text-hint-2">{{ $t(sc.label) }}</h5>
              <ul class="flex flex-col gap-md pb-4">
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
