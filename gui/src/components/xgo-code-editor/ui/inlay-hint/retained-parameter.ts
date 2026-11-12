import type { Position } from '../../common'
import { InlayHintKind, type InlayHintItem } from '../../inlay-hint'
import type { monaco } from '../../monaco'
import { findCalls, type CallContext } from '../call-context'

export type PresentedInlayHintItem = InlayHintItem & { retained?: boolean }

export type CallParameterBinding = {
  source: string
  call: CallContext
  hints: Array<{ slot: number; item: InlayHintItem; anchor: number }>
  requiredSlots: number[]
}

function offsetAt(source: string, position: Position): number | null {
  const lines = source.split('\n')
  if (position.line < 1 || position.line > lines.length) return null
  const line = lines[position.line - 1]
  if (position.column < 1 || position.column > line.length + 1) return null
  let offset = position.column - 1
  for (let i = 0; i < position.line - 1; i++) offset += lines[i].length + 1
  return offset
}

function positionAt(source: string, offset: number): Position {
  const lines = source.slice(0, offset).split('\n')
  return { line: lines.length, column: lines[lines.length - 1].length + 1 }
}

function rawArgumentRange(source: string, call: CallContext, slot: number) {
  const start =
    slot > 0 ? call.commas[slot - 1] + 1 : call.parenthesized ? source.indexOf('(', call.calleeEnd) + 1 : call.calleeEnd
  const end = slot < call.commas.length ? call.commas[slot] : call.end - (call.parenthesized ? 1 : 0)
  return { start, end }
}

function editingSlot(source: string, call: CallContext, start: number, end: number) {
  return call.arguments.findIndex((_, slot) => {
    const range = rawArgumentRange(source, call, slot)
    return range.start <= start && end <= range.end
  })
}

function bindingForCall(source: string, call: CallContext, hints: InlayHintItem[]): CallParameterBinding | null {
  const requiredSlots = call.arguments.flatMap((argument, slot) => (argument.start < argument.end ? [slot] : []))
  if (requiredSlots.length === 0) return null
  // A legal trailing comma has no argument to bind; an interior hole may have shifted recovery hints.
  if (
    call.arguments.some(
      (argument, slot) => argument.start === argument.end && !(call.parenthesized && slot === call.arguments.length - 1)
    )
  )
    return null
  const mapped: CallParameterBinding['hints'] = []
  for (const item of hints) {
    if (item.kind !== InlayHintKind.Parameter) continue
    const offset = offsetAt(source, item.position)
    const slot = call.arguments.findIndex((argument) => argument.start < argument.end && argument.start === offset)
    if (slot === -1) continue
    if (mapped.some((hint) => hint.slot === slot)) return null
    mapped.push({ slot, item, anchor: call.arguments[slot].start })
  }
  return mapped.length === 0 ? null : { source, call, hints: mapped, requiredSlots }
}

/** Bind observed labels to lexical argument slots, including slots whose labels the provider omitted. */
export function createCallParameterBinding(
  source: string,
  hints: InlayHintItem[],
  startOffset: number,
  endOffset: number
): CallParameterBinding | null {
  const calls = findCalls(source)
    .filter((call) => editingSlot(source, call, startOffset, endOffset) !== -1)
    .sort((a, b) => a.end - a.start - (b.end - b.start))
  for (const call of calls) {
    const binding = bindingForCall(source, call, hints)
    if (binding != null) return binding
  }
  return null
}

export function updateCallParameterBinding(
  binding: CallParameterBinding,
  source: string,
  changes: readonly monaco.editor.IModelContentChange[]
): CallParameterBinding | null {
  if (changes.length !== 1) return null
  const change = changes[0]
  const start = offsetAt(binding.source, { line: change.range.startLineNumber, column: change.range.startColumn })
  const end = offsetAt(binding.source, { line: change.range.endLineNumber, column: change.range.endColumn })
  if (start == null || end == null || end < start || editingSlot(binding.source, binding.call, start, end) === -1)
    return null
  if (source !== binding.source.slice(0, start) + change.text + binding.source.slice(end)) return null
  const delta = change.text.length - (end - start)
  const expectedEnd = binding.call.end + delta
  const next = findCalls(source).find(
    (call) =>
      call.calleeStart === binding.call.calleeStart &&
      call.calleeEnd === binding.call.calleeEnd &&
      call.callee === binding.call.callee &&
      call.parenthesized === binding.call.parenthesized &&
      (call.end === expectedEnd ||
        (!call.parenthesized &&
          source.slice(Math.min(call.end, expectedEnd), Math.max(call.end, expectedEnd)).trim() === '')) &&
      call.arguments.length === binding.call.arguments.length &&
      call.commas.length === binding.call.commas.length &&
      call.commas.every(
        (comma, index) => comma === binding.call.commas[index] + (binding.call.commas[index] >= end ? delta : 0)
      )
  )
  if (next == null) return null
  const hints = binding.hints.map((hint) => {
    const argument = next.arguments[hint.slot]
    const range = rawArgumentRange(source, next, hint.slot)
    const shiftedAnchor = hint.anchor <= start ? hint.anchor : hint.anchor >= end ? hint.anchor + delta : start
    const anchor =
      argument.start < argument.end ? argument.start : Math.max(range.start, Math.min(range.end, shiftedAnchor))
    return { ...hint, anchor }
  })
  return { ...binding, source, call: next, hints }
}

export function callHasMissingArguments(binding: CallParameterBinding) {
  return binding.requiredSlots.some((slot) => {
    const argument = binding.call.arguments[slot]
    return argument == null || argument.start === argument.end
  })
}

export function getRetainedParameters(binding: CallParameterBinding): PresentedInlayHintItem[] {
  return binding.hints.flatMap(({ slot, item, anchor }) => {
    const argument = binding.call.arguments[slot]
    return argument == null
      ? []
      : [
          {
            ...item,
            position: positionAt(binding.source, argument.start < argument.end ? argument.start : anchor),
            retained: true
          }
        ]
  })
}

/** A recovery label has no trustworthy parameter index when its call or a nested argument has a hole. */
export function filterIncompleteCallParameterHints(source: string, items: InlayHintItem[]): InlayHintItem[] {
  const calls = findCalls(source)
  const incomplete = calls.filter((call) =>
    call.arguments.some(
      (argument, slot) => argument.start === argument.end && !(call.parenthesized && slot === call.arguments.length - 1)
    )
  )
  if (incomplete.length === 0) return items
  const untrusted = calls.filter((call) =>
    incomplete.some(
      (child) =>
        child === call ||
        call.arguments.some((argument) => argument.start <= child.calleeStart && child.end <= argument.end)
    )
  )
  return items.filter((item) => {
    if (item.kind !== InlayHintKind.Parameter) return true
    const offset = offsetAt(source, item.position)
    if (offset == null) return false
    const owner = calls.find((call) =>
      call.arguments.some((argument) => argument.start < argument.end && argument.start === offset)
    )
    if (owner != null) return !untrusted.includes(owner)
    return !untrusted.some((call) => call.calleeEnd <= offset && offset <= call.end)
  })
}

/** Recovery can attach a first-parameter label to the second surviving argument. Prefer the confirmed slot map. */
export function mergeCallParameterHints(
  binding: CallParameterBinding,
  items: InlayHintItem[]
): PresentedInlayHintItem[] {
  if (!callHasMissingArguments(binding)) return items
  const calls = findCalls(binding.source)
  const remaining = items.filter((item) => {
    if (item.kind !== InlayHintKind.Parameter) return true
    const offset = offsetAt(binding.source, item.position)
    if (offset == null || offset < binding.call.calleeEnd || offset > binding.call.end) return true
    const owner = calls.find((call) =>
      call.arguments.some((argument) => argument.start < argument.end && argument.start === offset)
    )
    return owner != null && owner.calleeStart !== binding.call.calleeStart
  })
  return [...remaining, ...getRetainedParameters(binding)]
}
