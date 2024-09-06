import { describe, it, expect } from 'vitest'
import { useUndoRedo } from './useUndoRedo'

describe('useUndoRedo', () => {
  it('should initialize with the correct initial value', () => {
    const { current } = useUndoRedo('initial')
    expect(current()).toBe('initial')
  })

  it('should record new items and update undo stack', () => {
    const { record, current, undoStackLength, redoStackLength } = useUndoRedo('initial')
    record('item1')
    expect(current()).toBe('item1')
    expect(undoStackLength.value).toBe(1)
    expect(redoStackLength.value).toBe(0)
  })

  it('should undo the last action', () => {
    const { record, undo, current, undoStackLength, redoStackLength } = useUndoRedo('initial')
    record('item1')
    record('item2')
    expect(undo()).toBe('item1')
    expect(current()).toBe('item1')
    expect(undoStackLength.value).toBe(1)
    expect(redoStackLength.value).toBe(1)
  })

  it('should redo the last undone action', () => {
    const { record, undo, redo, current, undoStackLength, redoStackLength } = useUndoRedo('initial')
    record('item1')
    record('item2')
    undo()
    expect(redo()).toBe('item2')
    expect(current()).toBe('item2')
    expect(undoStackLength.value).toBe(2)
    expect(redoStackLength.value).toBe(0)
  })

  it('should clear all stacks', () => {
    const { record, clear, undoStackLength, redoStackLength } = useUndoRedo('initial')
    record('item1')
    clear()
    expect(undoStackLength.value).toBe(0)
    expect(redoStackLength.value).toBe(0)
  })

  it('should return the correct current item', () => {
    const { record, current } = useUndoRedo('initial')
    record('item1')
    expect(current()).toBe('item1')
    record('item2')
    expect(current()).toBe('item2')
  })

  it('should set a new initial value', () => {
    const { setInitial, current } = useUndoRedo('initial')
    setInitial('newInitial')
    expect(current()).toBe('newInitial')
  })

  it('should handle recording items beyond the limit', () => {
    const { record, current, undo, undoStackLength } = useUndoRedo('initial', 3)
    record('item1')
    record('item2')
    record('item3')
    record('item4')
    expect(current()).toBe('item4')
    expect(undoStackLength.value).toBe(3)
	expect(undo()).toBe('item3')
	expect(undo()).toBe('item2')
	expect(undo()).toBe('initial')
  })

  it('should handle multiple undos and redos', () => {
    const { record, undo, redo } = useUndoRedo('initial')
    record('item1')
    record('item2')
    record('item3')
    expect(undo()).toBe('item2')
    expect(undo()).toBe('item1')
    expect(undo()).toBe('initial')
    expect(redo()).toBe('item1')
    expect(redo()).toBe('item2')
    expect(redo()).toBe('item3')
  })

  it('should handle undo with no items in the stack', () => {
    const { undo, current } = useUndoRedo('initial')
    expect(undo()).toBe('initial')
    expect(current()).toBe('initial')
  })

  it('should handle redo with no items in the stack', () => {
    const { redo, current } = useUndoRedo('initial')
    expect(redo()).toBe('initial')
    expect(current()).toBe('initial')
  })

  it('should clear redo stack when recording a new item', () => {
	const { record, redo, redoStackLength } = useUndoRedo('initial')
	record('item1')
	record('item2')
	redo()
	record('item3')
	expect(redoStackLength.value).toBe(0)
  })
})
