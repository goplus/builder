<script lang="ts" setup generic="T">
/**
 * A sorted list in sections, with an optional index beside it which follows the scroll: it marks the section being
 * looked at, and jumps to a section when clicked.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from '@/utils/i18n'
import type { ListIndexEntry, ListSection } from './list-view'

const props = defineProps<{
  sections: ListSection<T>[]
  /** Every entry the index can have; entries without a section are shown disabled. */
  index: ListIndexEntry[]
  showIndex: boolean
}>()

defineSlots<{
  default(props: { section: ListSection<T> }): unknown
}>()

const i18n = useI18n()
const contentRef = ref<HTMLElement>()
const activeKey = ref<string | null>(null)
const sectionKeys = computed(() => new Set(props.sections.map((section) => section.key)))

/** The elements of the sections, found again only when the sections change, not on each scroll. */
let sectionElements: HTMLElement[] = []
function findSectionElements() {
  sectionElements = Array.from(contentRef.value?.querySelectorAll<HTMLElement>('[data-section-key]') ?? [])
}

/** The section being looked at: the last whose top has reached the top of the list or of the viewport. */
function updateActiveKey(scroller: Element | null) {
  const content = contentRef.value
  if (content == null) return
  const elements = sectionElements
  if (scroller != null && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
    // At the end, a last section too short to reach the top is the one being looked at.
    activeKey.value = elements.at(-1)?.dataset.sectionKey ?? null
    return
  }
  // A section jumped to stops with its top a little below this line (`scroll-mt-4`), which is allowed for.
  const line = Math.max(content.getBoundingClientRect().top, 0) + 24
  let active = elements[0]
  for (const element of elements) {
    if (element.getBoundingClientRect().top > line) break
    active = element
  }
  activeKey.value = active?.dataset.sectionKey ?? null
}

/**
 * Until when the scroll is the one a jump started, which keeps the section jumped to marked: one near the end may stop
 * below the others' tops, where the scroll would mark another. `scrollend` ends it early where it is supported.
 */
let jumpingUntil = 0

/** The element a scroll moved, if it holds the list; scrolls elsewhere, as in a drawer, are none of the list's. */
function getListScroller(e: Event) {
  const scroller = e.target instanceof Element ? e.target : document.scrollingElement
  if (scroller == null || contentRef.value == null || !scroller.contains(contentRef.value)) return null
  return scroller
}

let frame: number | null = null
function handleScroll(e: Event) {
  if (Date.now() < jumpingUntil) return
  if (frame != null) return
  const scroller = getListScroller(e)
  if (scroller == null) return
  frame = requestAnimationFrame(() => {
    frame = null
    updateActiveKey(scroller)
  })
}

watch(
  () => props.showIndex,
  (showIndex, _, onCleanup) => {
    if (!showIndex) return
    // The page scrolls in an element of its own, so scrolls are listened to wherever they happen.
    const handleScrollEnd = (e: Event) => {
      if (getListScroller(e) != null) jumpingUntil = 0
    }
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true })
    document.addEventListener('scrollend', handleScrollEnd, { capture: true, passive: true })
    onCleanup(() => {
      document.removeEventListener('scroll', handleScroll, { capture: true })
      document.removeEventListener('scrollend', handleScrollEnd, { capture: true })
    })
  },
  { immediate: true }
)

onMounted(() => {
  findSectionElements()
  updateActiveKey(null)
})
watch(
  () => props.sections,
  () => {
    findSectionElements()
    requestAnimationFrame(() => updateActiveKey(null))
  },
  { flush: 'post' }
)

function jumpTo(key: string) {
  const element = sectionElements.find((e) => e.dataset.sectionKey === key)
  if (element == null) return
  activeKey.value = key
  jumpingUntil = Date.now() + 1000
  element.scrollIntoView({ block: 'start', behavior: 'smooth' })
}
</script>

<template>
  <div class="flex gap-6">
    <div ref="contentRef" class="min-w-0 flex-1 flex flex-col gap-8">
      <section v-for="section in sections" :key="section.key" :data-section-key="section.key" class="scroll-mt-4">
        <h3 class="m-0 mb-3 text-lg text-title">{{ i18n.t(section.label) }}</h3>
        <slot :section="section"></slot>
      </section>
    </div>
    <nav
      v-if="showIndex"
      v-radar="{ name: 'section-index', desc: 'Index of the sections, click an entry to jump to its section' }"
      class="sticky top-4 shrink-0 self-start flex flex-col items-stretch gap-0.5 rounded-lg bg-grey-100 p-1"
    >
      <button
        v-for="entry in index"
        :key="entry.key"
        v-radar="{ name: 'section-index-entry', desc: 'Click to jump to the section', attrs: { name: entry.key } }"
        type="button"
        class="min-w-7 cursor-pointer rounded border-none px-1.5 py-0.5 text-xs/4 transition-colors duration-150 disabled:cursor-default disabled:text-grey-500"
        :class="
          entry.key === activeKey
            ? 'bg-primary-main text-grey-100'
            : 'bg-transparent text-grey-800 hover:bg-grey-400 disabled:hover:bg-transparent'
        "
        :disabled="!sectionKeys.has(entry.key)"
        @click="jumpTo(entry.key)"
      >
        {{ i18n.t(entry.label) }}
      </button>
    </nav>
  </div>
</template>
