<script setup lang="ts">
import { throttle } from 'lodash'
import { computed, ref, shallowRef, watch, watchEffect } from 'vue'
import { getCleanupSignal } from '@/utils/disposable'
import type { ActionException } from '@/utils/exception'
import { useRegisterLoading } from '@/utils/readiness'
import { untilTaskScheduled } from '@/utils/utils'
import { UIError } from '@/components/ui'
import type { APIReferenceController, APIReferenceItem } from '.'
import APIReferenceCategoryMenu from './APIReferenceCategoryMenu.vue'
import APIReferenceHeader from './APIReferenceHeader.vue'
import APIReferenceItemComp from './APIReferenceItem.vue'
import APIReferenceListContent, { type MainCategory } from './APIReferenceListContent.vue'
import APIReferenceSearchResults from './APIReferenceSearchResults.vue'
import { groupItems } from './group-api-reference-items'
import { useAPIReferenceSearch } from './use-api-reference-search'

const props = defineProps<{
  controller: APIReferenceController
  items: APIReferenceItem[]
  error: ActionException | null
  simpleMode?: boolean
  disabled?: boolean
}>()

const browseData = computed(() => groupItems(props.items, props.controller.categoryViewInfos ?? [], 'all'))
const browseGroups = computed(() => browseData.value.groups)
const { query, searchState, submit, clear } = useAPIReferenceSearch(() => props.controller, browseGroups)

const renderedBrowseGroups = shallowRef<MainCategory[]>([])
// Tutorials wait for the rendered categories before targeting them.
useRegisterLoading(() => renderedBrowseGroups.value.length < browseGroups.value.length)

// Render the first group before yielding when there are no groups on screen yet.
watch(
  browseGroups,
  async (groups, _, onCleanup) => {
    if (groups.length <= 1 || renderedBrowseGroups.value.length > 0) {
      renderedBrowseGroups.value = groups
      return
    }
    renderedBrowseGroups.value = groups.slice(0, 1)
    const signal = getCleanupSignal(onCleanup)
    try {
      await untilTaskScheduled('background', signal)
    } catch (error) {
      if (!signal.aborted) throw error
    }
    if (signal.aborted) return
    renderedBrowseGroups.value = groups
  },
  { immediate: true }
)

const renderedBrowseData = computed(() => ({
  groups: renderedBrowseGroups.value,
  ungroupedItems: browseData.value.ungroupedItems
}))

const activeBrowseCategoryId = ref<string | null>(null)
const activeSearchCategoryId = ref<string | null>(null)
const browseListRef = ref<HTMLUListElement | null>(null)
const searchResultsRef = ref<InstanceType<typeof APIReferenceSearchResults> | null>(null)
const currentList = computed(() =>
  searchState.value != null
    ? { element: searchResultsRef.value?.listElement ?? null, activeCategoryIdRef: activeSearchCategoryId }
    : { element: browseListRef.value, activeCategoryIdRef: activeBrowseCategoryId }
)
const activeCategoryId = computed(() => currentList.value.activeCategoryIdRef.value)

watch(
  () => searchState.value?.data.value ?? null,
  (data) => {
    activeSearchCategoryId.value = data?.groups[0]?.id ?? null
    const searchListElement = searchResultsRef.value?.listElement
    if (searchListElement != null) searchListElement.scrollTop = 0
  },
  { immediate: true, flush: 'post' }
)

watch(
  browseGroups,
  (groups) => {
    if (groups.some((group) => group.id === activeBrowseCategoryId.value)) return
    activeBrowseCategoryId.value = groups[0]?.id ?? null
  },
  { immediate: true }
)

const isScrolling = ref(false)

watchEffect((onCleanup) => {
  const { element: listElement, activeCategoryIdRef } = currentList.value
  if (listElement == null) return
  const signal = getCleanupSignal(onCleanup)
  let scrollEndTimer: ReturnType<typeof setTimeout> | null = null

  const handleScroll = throttle(() => {
    if (listElement !== currentList.value.element || listElement.clientHeight === 0) return
    isScrolling.value = true
    if (scrollEndTimer != null) clearTimeout(scrollEndTimer)
    scrollEndTimer = setTimeout(() => {
      isScrolling.value = false
    }, 200)

    const scrollTop = listElement.scrollTop
    const categoryElements = listElement.querySelectorAll<HTMLElement>('[data-category-id]')
    let activeCategory = categoryElements[0]
    if (activeCategory == null) return
    // The final category may be too short to reach the top of the scroll area.
    if (
      listElement.scrollHeight > listElement.clientHeight &&
      scrollTop + listElement.clientHeight >= listElement.scrollHeight - 1
    ) {
      activeCategory = categoryElements[categoryElements.length - 1]
    } else {
      for (const category of categoryElements) {
        if (category.offsetTop > scrollTop + 1) break
        activeCategory = category
      }
    }
    activeCategoryIdRef.value = activeCategory.dataset.categoryId ?? null
  }, 100)
  listElement.addEventListener('scroll', handleScroll, { signal })
  signal.addEventListener('abort', () => {
    handleScroll.cancel()
    if (scrollEndTimer != null) clearTimeout(scrollEndTimer)
    isScrolling.value = false
  })
})

function scrollToCategory(id: string) {
  const { element: listElement, activeCategoryIdRef } = currentList.value
  if (listElement == null) return
  const categoryElement = listElement.querySelector<HTMLElement>(`[data-category-id="${id}"]`)
  if (categoryElement == null) return
  activeCategoryIdRef.value = id
  listElement.scrollTo({
    top: categoryElement.offsetTop,
    behavior: 'smooth'
  })
}
</script>

<template>
  <APIReferenceHeader v-model:query="query" :search-state="searchState" @submit-search="submit" @close-search="clear">
    <template v-if="browseGroups.length > 0" #category-menu>
      <APIReferenceCategoryMenu
        :categories="browseGroups"
        :active-category-id="activeCategoryId"
        :search-state="searchState"
        @select="scrollToCategory"
      />
    </template>
  </APIReferenceHeader>
  <UIError v-if="error != null">{{ $t(error.userMessage) }}</UIError>
  <template v-else>
    <APIReferenceSearchResults ref="searchResultsRef" :search-state="searchState" :disabled="disabled" />
    <div
      v-show="searchState == null"
      v-radar="{ name: 'browse-api-references', desc: 'Browse snippets by category', visible: searchState == null }"
      class="flex min-h-0 flex-[1_1_0] flex-col"
    >
      <ul
        ref="browseListRef"
        class="relative min-h-0 flex-[1_1_0] min-w-0 overflow-y-auto px-3 pb-3 [scrollbar-width:thin]"
      >
        <APIReferenceListContent :data="renderedBrowseData">
          <template #default="{ item }">
            <APIReferenceItemComp
              :item="item"
              :interaction-disabled="isScrolling"
              :block-style="simpleMode"
              :disabled="disabled"
            />
          </template>
        </APIReferenceListContent>
      </ul>
    </div>
  </template>
</template>
