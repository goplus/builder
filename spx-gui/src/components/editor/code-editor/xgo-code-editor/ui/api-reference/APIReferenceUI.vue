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
  color: string
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
}>()

const itemsForDisplay = computed<DefinitionDocumentationItem[] | null>((oldValue) => {
  // Ignore intermediate empty data to keep UI stable
  return props.controller.items ?? oldValue ?? null
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
  >
    <UIError v-if="err != null">
      {{ $t(err.userMessage) }}
    </UIError>
    <template v-else>
      <ul class="flex-none flex flex-col gap-3 border-r border-dividing-line-2 px-1 py-3">
        <li
          v-for="c in categoriesComputed"
          :key="c.id"
          class="h-13 w-13 cursor-pointer flex flex-col items-center justify-center rounded-1 transition-[color,background-color] duration-100"
          :class="c.id === activeCategoryIdRef ? 'bg-(--category-color) text-grey-100' : 'text-(--category-color)'"
          :style="{ '--category-color': c.color }"
          @click="handleCategoryClick(c.id)"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="h-6 w-6" v-html="c.icon"></div>
          <p class="mt-0.5 text-center text-10/[1.6]">{{ $t(c.label) }}</p>
        </li>
      </ul>
      <ul ref="itemsWrapperRef" class="flex-[1_1_0] min-w-0 overflow-y-auto px-4 pb-3 [scrollbar-width:thin]">
        <li v-for="c in categoriesForItems" :key="c.id" :data-category-id="c.id" class="category-wrapper">
          <section
            v-for="sc in c.subCategories"
            :key="sc.id"
            class="subcategory-wrapper border-b border-dashed border-grey-500"
          >
            <h5 class="sticky top-0 z-10 bg-grey-100 py-3 text-12/1.5 text-hint-2">{{ $t(sc.label) }}</h5>
            <ul class="flex flex-col gap-middle pb-5">
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
.category-wrapper:last-child .subcategory-wrapper:last-child {
  border-bottom: none;
}
</style>
