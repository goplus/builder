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
import { UIError } from '@/components/ui'
import { stringifyDefinitionId, type DefinitionDocumentationItem } from '../../common'
import type { APIReferenceController, APIReferenceItem } from '.'
import APIReferenceItemComp from './APIReferenceItem.vue'
import { useRegisterUpdateRouteLoaded } from '@/utils/route-loading'

const props = defineProps<{
  controller: APIReferenceController
  variant?: 'sidebar' | 'strip' | 'tutorial-side'
  filterText?: string | null
  allowedNames?: string[] | null
  allowedOverviews?: string[] | null
}>()

const stripExpanded = ref(false)
const isTutorialVariant = computed(() => props.variant === 'strip' || props.variant === 'tutorial-side')

const itemsForDisplay = computed<DefinitionDocumentationItem[] | null>((oldValue) => {
  // Ignore intermediate empty data to keep UI stable
  return props.controller.items ?? oldValue ?? null
})

const normalizedAllowedNames = computed(() => {
  const names = props.allowedNames ?? []
  return names.map((name) => normalizeAPIName(name)).filter((name) => name !== '')
})

const normalizedFilterText = computed(() => normalizeAPIName(props.filterText ?? ''))
const normalizedAllowedOverviews = computed(() => {
  const overviews = props.allowedOverviews ?? []
  return overviews.map((overview) => normalizeAPIName(overview)).filter((overview) => overview !== '')
})

function normalizeAPIName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function getAPINameCandidates(item: DefinitionDocumentationItem) {
  const definitionName = item.definition.name ?? ''
  const methodName = definitionName.split('.').at(-1) ?? definitionName
  return [definitionName, methodName, item.overview].map(normalizeAPIName).filter((name) => name !== '')
}

function isAllowedInTutorial(item: DefinitionDocumentationItem) {
  const names = normalizedAllowedNames.value
  const overviews = normalizedAllowedOverviews.value
  const filterText = normalizedFilterText.value
  if (overviews.length > 0) {
    const normalizedOverview = normalizeAPIName(item.overview)
    return overviews.some((overview) => normalizedOverview.includes(overview) || overview.includes(normalizedOverview))
  }
  if (names.length === 0 && filterText === '') return true
  return getAPINameCandidates(item).some((candidate) => {
    return names.includes(candidate) || filterText.includes(candidate)
  })
}

const filteredItemsForDisplay = computed<DefinitionDocumentationItem[] | null>((oldValue) => {
  const items = itemsForDisplay.value
  if (items == null) return oldValue ?? null
  if (!isTutorialVariant.value) return items
  return items.filter(isAllowedInTutorial)
})

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
  const items = filteredItemsForDisplay.value
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
    class="flex min-h-0"
    :class="{
      'api-reference-strip': variant === 'strip',
      'api-reference-strip-expanded': stripExpanded,
      'api-reference-tutorial-side': variant === 'tutorial-side'
    }"
  >
    <UIError v-if="err != null">
      {{ $t(err.userMessage) }}
    </UIError>
    <template v-else>
      <button
        v-if="variant === 'strip'"
        data-test-id="api-reference-strip-toggle"
        class="api-reference-strip-toggle"
        type="button"
        @click="stripExpanded = !stripExpanded"
      >
        {{ stripExpanded ? $t({ en: 'Collapse', zh: '收起' }) : $t({ en: 'Expand', zh: '展开' }) }}
      </button>
      <ul
        v-if="variant !== 'strip' && variant !== 'tutorial-side'"
        class="flex-none flex flex-col gap-3 border-r border-dividing-line-2 px-1 py-3"
      >
        <li
          v-for="c in categoriesComputed"
          :key="c.id"
          class="h-13 w-13 cursor-pointer flex flex-col items-center justify-center rounded-md transition-colors duration-100"
          :class="c.id === activeCategoryIdRef ? 'bg-grey-400 text-grey-1000' : 'text-grey-800 hover:bg-grey-300'"
          @click="handleCategoryClick(c.id)"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="h-6 w-6" v-html="c.icon"></div>
          <p class="mt-0.5 text-center text-2xs">{{ $t(c.label) }}</p>
        </li>
      </ul>
      <ul
        ref="itemsWrapperRef"
        class="flex-[1_1_0] min-w-0 overflow-y-auto px-4 pb-3 [scrollbar-width:thin]"
        :class="{ 'api-reference-strip-items': isTutorialVariant }"
      >
        <li
          v-for="c in categoriesForItems"
          :key="c.id"
          :data-category-id="c.id"
          class="[&:last-child>section:last-child]:border-b-0"
        >
          <section
            v-for="sc in c.subCategories"
            :key="sc.id"
            class="border-b border-dashed border-grey-500"
            :class="{ 'api-reference-strip-section': isTutorialVariant }"
          >
            <h5 v-if="!isTutorialVariant" class="sticky top-0 z-10 bg-grey-100 py-3 text-xs text-hint-2">
              {{ $t(sc.label) }}
            </h5>
            <ul class="flex flex-col gap-md pb-5" :class="{ 'api-reference-strip-list': isTutorialVariant }">
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
    </template>
  </section>
</template>

<style scoped>
.api-reference-strip {
  position: relative;
  border-top: 1px solid var(--ui-color-grey-400);
  background: var(--ui-color-grey-100);
}

.api-reference-tutorial-side {
  position: relative;
  border-left: 1px solid var(--ui-color-grey-400);
  background: var(--ui-color-grey-100);
}

.api-reference-strip-expanded {
  flex-basis: 340px !important;
  min-height: 320px !important;
}

.api-reference-strip-toggle {
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 1;
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--ui-color-grey-500);
  border-radius: var(--ui-border-radius-sm);
  background: var(--ui-color-grey-100);
  color: var(--ui-color-title);
  font-size: 12px;
  cursor: pointer;
  box-shadow: var(--ui-box-shadow-control);
}

.api-reference-strip-toggle:hover {
  border-color: var(--ui-color-primary-main);
}

.api-reference-strip-items {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 24px 22px;
}

.api-reference-tutorial-side .api-reference-strip-items {
  flex-direction: column;
  gap: 6px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 10px 8px;
}

.api-reference-strip-expanded .api-reference-strip-items {
  overflow-x: hidden;
  overflow-y: auto;
  padding-top: 44px;
}

.api-reference-strip-section {
  border-bottom: 0;
  flex: none;
}

.api-reference-tutorial-side .api-reference-strip-section {
  width: 100%;
}

.api-reference-strip-list {
  flex-wrap: wrap;
  flex-direction: row;
  column-gap: 18px;
  row-gap: 12px;
  padding-bottom: 0;
}

.api-reference-tutorial-side .api-reference-strip-list {
  width: 100%;
  flex-direction: column;
  flex-wrap: nowrap;
  gap: 6px;
}

.api-reference-strip-expanded .api-reference-strip-section {
  width: 100%;
}

.api-reference-strip-expanded .api-reference-strip-list {
  align-content: flex-start;
}

.api-reference-strip :deep(.api-reference-item),
.api-reference-tutorial-side :deep(.api-reference-item) {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 52px;
  margin-block: 6px;
  padding: 8px 14px 8px 32px;
  border: 1px solid var(--ui-color-grey-500);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
  cursor: grab;
}

.api-reference-tutorial-side :deep(.api-reference-item) {
  min-height: 32px;
  margin-block: 2px;
  padding: 4px 6px 4px 20px;
}

.api-reference-strip :deep(.api-reference-item)::before,
.api-reference-tutorial-side :deep(.api-reference-item)::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 50%;
  width: 8px;
  height: 20px;
  background-image: radial-gradient(circle, var(--ui-color-grey-700) 1.5px, transparent 1.5px);
  background-size: 4px 5px;
  transform: translateY(-50%);
  opacity: 0.65;
}

.api-reference-tutorial-side :deep(.api-reference-item)::before {
  left: 8px;
  height: 15px;
  background-size: 4px 4px;
}

.api-reference-strip :deep(.api-reference-item:hover),
.api-reference-tutorial-side :deep(.api-reference-item:hover) {
  border-color: var(--ui-color-primary-main);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}

.api-reference-strip :deep(.api-reference-item.before-dragging),
.api-reference-tutorial-side :deep(.api-reference-item.before-dragging) {
  cursor: grabbing;
  transform: translateY(1px);
}

.api-reference-strip :deep(.api-reference-item .overview),
.api-reference-tutorial-side :deep(.api-reference-item .overview) {
  font-size: var(--tutorial-code-font-size, 24px);
  line-height: 1.5;
}

.api-reference-tutorial-side :deep(.api-reference-item .overview) {
  font-size: 11px;
  line-height: 1.3;
}

.api-reference-tutorial-side :deep(.api-reference-item .overview > code) {
  overflow: visible;
  text-overflow: clip;
}
</style>
