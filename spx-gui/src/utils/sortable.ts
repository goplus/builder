import { nextTick, ref, toValue, watch, watchEffect, type WatchSource } from 'vue'
import Sortable from 'sortablejs'
import { getCleanupSignal } from './disposable'

export type DragSortableOptions = {
  /** Class name for the drop placeholder */
  ghostClass?: string
  /** Function to call when the list is sorted */
  onSorted: (oldIndex: number, newIndex: number) => void
}

const draggingItemRef = ref<unknown | null>(null)

export function useDragSortable(
  listSource: WatchSource<unknown[] | null>,
  wrapperSource: WatchSource<HTMLElement | undefined | null>,
  options: DragSortableOptions
) {
  watchEffect(async (onCleanup) => {
    const list = toValue<unknown[] | null>(listSource)
    if (list == null || list.length === 0) return
    await nextTick() // Ensure DOM updated for list change

    const wrapper = toValue<HTMLElement | undefined | null>(wrapperSource)
    if (wrapper == null) return

    const sortable = Sortable.create(wrapper, {
      scroll: true,
      scrollSensitivity: 30,
      revertOnSpill: true,
      animation: 200,
      ghostClass: options.ghostClass,
      onStart(e) {
        const idx = Array.from(wrapper.children).indexOf(e.item)
        if (idx === -1) return
        draggingItemRef.value = list[idx]
      },
      onEnd(e) {
        draggingItemRef.value = null
        const { oldDraggableIndex, newDraggableIndex } = e
        if (oldDraggableIndex == null || newDraggableIndex == null) return
        if (oldDraggableIndex === newDraggableIndex) return
        options.onSorted(oldDraggableIndex, newDraggableIndex)
      }
    })
    onCleanup(() => sortable.destroy())
  })
}

export type DragDroppableOptions = {
  /** Class to add when an acceptable dragging is ongoing */
  acceptClass: string
  /** Class to add when an acceptable item is dragged over */
  overClass: string
  /** Function to check if dragging item is acceptable */
  accept: (item: unknown) => boolean
  /** Function to call when an acceptable item is dropped */
  onDrop: (item: unknown) => void
}

export function useDragDroppable(elSource: WatchSource<HTMLElement | undefined | null>, options: DragDroppableOptions) {
  watchEffect(async (onCleanup) => {
    const el = toValue<HTMLElement | undefined | null>(elSource)
    if (el == null) return

    const signal = getCleanupSignal(onCleanup)
    // Track the number of dragged-over events
    let overCount = 0

    el.addEventListener(
      'dragenter',
      (e) => {
        const item = draggingItemRef.value
        if (item == null) return
        if (!options.accept(item)) return
        e.preventDefault()
        if (overCount === 0) el.classList.add(options.overClass)
        overCount++
      },
      { signal }
    )

    el.addEventListener(
      'dragleave',
      (e) => {
        const item = draggingItemRef.value
        if (item == null) return
        if (!options.accept(item)) return
        e.preventDefault()
        overCount--
        if (overCount === 0) el.classList.remove(options.overClass)
      },
      { signal }
    )

    el.addEventListener(
      'drop',
      (e) => {
        overCount = 0
        el.classList.remove(options.overClass)
        const item = draggingItemRef.value
        if (item == null) return
        if (!options.accept(item)) return
        e.preventDefault()
        options.onDrop(item)
      },
      { signal }
    )

    onCleanup(
      watch(
        draggingItemRef,
        (item, _, onCleanup) => {
          if (item == null) return
          if (!options.accept(item)) return
          el.classList.add(options.acceptClass)
          onCleanup(() => el.classList.remove(options.acceptClass))
        },
        { immediate: true }
      )
    )
  })
}
