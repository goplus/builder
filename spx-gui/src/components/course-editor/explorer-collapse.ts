/**
 * Which rows of the course explorer the author has folded away.
 *
 * Only rows that hold others can be folded, and their keys are structural — a resource kind's folder, the
 * heading of unused records — rather than particular to one course, so the choice is kept for the tab instead
 * of per course: opening another course, or coming back after a reload, finds the tree the way it was left.
 * Rows start expanded, so what is stored is the folded ones, and the usual case stores an empty list.
 */

import { computed } from 'vue'
import { userSessionStorageRef } from '@/utils/user-storage'

/** Where the folded rows are remembered; per tab, and scoped to the signed-in user by the storage helper. */
const storageKey = 'builder-course-editor-collapsed-nodes'

/**
 * The folded rows of the course explorer, and a way to fold or unfold one.
 *
 * @returns `collapsed`, the keys (`course-tree.ts#getNodeKey`) of the rows that are folded, and `toggle`, which
 *   folds a row that is open and opens a row that is folded.
 *
 * Called by: components/course-editor/CourseExplorer.vue (once, for the whole tree),
 * components/course-editor/explorer-collapse.test.ts.
 */
export function useCollapsedNodes() {
  const keys = userSessionStorageRef<string[]>(storageKey, [])
  const collapsed = computed(() => new Set(keys.value))
  function toggle(key: string) {
    const next = new Set(keys.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    keys.value = [...next]
  }
  return { collapsed, toggle }
}
