import { toValue, watchEffect, type WatchSource } from 'vue'
import Sortable from 'sortablejs'

export type SortableOptions = {
  ghostClass?: string
  onSorted: (oldIndex: number, newIndex: number) => void
}

export function useSortable(wrapperSource: WatchSource<HTMLElement | undefined | null>, options: SortableOptions) {
  watchEffect((onCleanup) => {
    const wrapper = toValue(wrapperSource)
    if (wrapper == null) return
    const sortable = Sortable.create(wrapper, {
      animation: 200,
      ghostClass: options.ghostClass,
      onEnd(e) {
        const { oldDraggableIndex, newDraggableIndex } = e
        if (oldDraggableIndex == null || newDraggableIndex == null) return
        options.onSorted(oldDraggableIndex, newDraggableIndex)
      }
    })
    onCleanup(() => sortable.destroy())
  })
}
