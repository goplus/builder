import { ref } from 'vue'

/**
 * useUndoRedo is a hook to manage undo and redo stacks
 *
 * @template T the type of the items to be stored in the undo stack
 * @param initial the initial item to start with
 * @param limit the maximum number of items to keep in the undo stack
 * @returns
 */
export function useUndoRedo<T>(initial: T | null = null, limit: number = Infinity) {
  const undoStack: T[] = []
  const redoStack: T[] = []
  const undoStackLength = ref(0)
  const redoStackLength = ref(0)
  const updateLength = () => {
    undoStackLength.value = undoStack.length
    redoStackLength.value = redoStack.length
  }

  return {
    undoStackLength,
    redoStackLength,
    setInitial: (_initial: T) => {
      initial = _initial
    },
    /**
     * undo the last action
     * @returns the current item after undo
     */
    undo: () => {
      if (undoStack.length <= 0) {
        return initial
      }
      const item = undoStack.pop()!
      redoStack.push(item!)
      updateLength()
      return undoStack[undoStack.length - 1] ?? initial
    },
    /**
     * redo the last action
     * @returns the current item after redo
     */
    redo: () => {
      if (redoStack.length <= 0) {
        return undoStack[undoStack.length - 1] ?? initial
      }
      const item = redoStack.pop()!
      undoStack.push(item!)
      updateLength()
      return item
    },
    /**
     * record a new item
     * @param item the new item
     */
    record: (item: T) => {
      undoStack.push(item)
      redoStack.length = 0
      if (undoStack.length > limit) {
        undoStack.shift()
      }
      updateLength()
    },
    /**
     * clear all undo and redo stacks
     */
    clear: () => {
      undoStack.length = 0
      redoStack.length = 0
      updateLength()
    },
    /**
     * get the current item
     */
    current() {
      return undoStack[undoStack.length - 1] ?? initial
    }
  }
}
