import { DiagnosticSeverity, type Diagnostic, type Position, type Range } from '../../common'

type OffsetRange = { start: number; end: number }
type Edit = OffsetRange & { text: string }

export type EditingDiagnosticPresentationOptions = {
  diagnostics: Diagnostic[]
  baseline: Diagnostic[]
  baselineSource: string
  source: string
  call: OffsetRange
  baselineCall: OffsetRange
  /** Current-source enclosing block; null disables suppression beyond the call. */
  block: OffsetRange | null
  /** Offsets of each edit refer to the source immediately before that edit. */
  edits: Edit[]
  /** Revealing errors does not discard unaffected baseline errors lost during parser recovery. */
  defer?: boolean
}

// The pinned language server does not identify parser diagnostics separately.
// Only these parser recovery messages may affect presentation outside the edited call.
function isParserRecovery(message: string) {
  return (
    /^expected (?:operand|statement|declaration|type|'[),;\]}]'), found (?:'[^'\r\n]+'|[A-Za-z_]\w*|newline)$/.test(
      message
    ) || /^missing ','(?: before newline)? in argument list$/.test(message)
  )
}

function offsetAt(source: string, position: Position): number | null {
  if (position.line < 1 || position.column < 1) return null
  const lines = source.split('\n')
  const line = lines[position.line - 1]
  if (line == null) return null
  const width = line.endsWith('\r') ? line.length - 1 : line.length
  if (position.column > width + 1) return null
  let offset = position.column - 1
  for (let i = 0; i < position.line - 1; i++) offset += lines[i].length + 1
  return offset
}

function positionAt(source: string, offset: number): Position {
  let line = 1
  let start = 0
  for (let i = 0; i < offset; i++) {
    if (source[i] === '\n') {
      line++
      start = i + 1
    }
  }
  return { line, column: offset - start + 1 }
}

function offsets(source: string, range: Range): OffsetRange | null {
  const start = offsetAt(source, range.start)
  const end = offsetAt(source, range.end)
  if (start == null || end == null || end < start) return null
  return { start, end }
}

function mapOffsets(range: OffsetRange, edits: Edit[], source: string): OffsetRange | null {
  let { start, end } = range
  for (const edit of edits) {
    const delta = edit.text.length - (edit.end - edit.start)
    if (edit.end <= start) {
      start += delta
      end += delta
    } else if (edit.start < end) return null
  }
  if (start < 0 || end < start || end > source.length) return null
  return { start, end }
}

function toRange(source: string, range: OffsetRange): Range {
  return { start: positionAt(source, range.start), end: positionAt(source, range.end) }
}

function sameDiagnostic(first: Diagnostic, second: Diagnostic) {
  const a = first.sourceRange ?? first.range
  const b = second.sourceRange ?? second.range
  return (
    first.origin === second.origin &&
    first.severity === second.severity &&
    first.message === second.message &&
    a.start.line === b.start.line &&
    a.start.column === b.start.column &&
    a.end.line === b.end.line &&
    a.end.column === b.end.column
  )
}

function inside(offset: number, range: OffsetRange) {
  return offset >= range.start && offset <= range.end
}

function insideRecoveryBlock(range: OffsetRange, block: OffsetRange, source: string) {
  if (range.start < block.end) return range.start >= block.start
  // Recovery at EOF can point immediately after the unchanged closing brace.
  return (
    range.start === block.end &&
    range.end === range.start &&
    source[block.end - 1] === '}' &&
    /^[\t \r]*(?:\n|$)/.test(source.slice(block.end))
  )
}

function validRange(range: OffsetRange, source: string) {
  return range.start >= 0 && range.end >= range.start && range.end <= source.length
}

function matchesEdits(baselineSource: string, source: string, edits: Edit[]) {
  let edited = baselineSource
  for (const edit of edits) {
    if (!validRange(edit, edited)) return false
    edited = edited.slice(0, edit.start) + edit.text + edited.slice(edit.end)
  }
  return edited === source
}

function mapBaselineDiagnostic(diagnostic: Diagnostic, baselineSource: string, source: string, edits: Edit[]) {
  const original = offsets(baselineSource, diagnostic.sourceRange ?? diagnostic.range)
  if (original == null) return null
  const mapped = mapOffsets(original, edits, source)
  if (mapped == null) return null
  const rendered = offsets(baselineSource, diagnostic.range)
  const mappedRendered = rendered == null ? mapped : mapOffsets(rendered, edits, source) ?? mapped
  return { ...diagnostic, range: toRange(source, mappedRendered), sourceRange: toRange(source, mapped) }
}

/** Remap intact baseline spans while a new background check is pending. */
export function mapBaselineDiagnostics(baseline: Diagnostic[], baselineSource: string, source: string, edits: Edit[]) {
  if (!matchesEdits(baselineSource, source, edits)) return []
  const result: Diagnostic[] = []
  for (const diagnostic of baseline) {
    const mapped = mapBaselineDiagnostic(diagnostic, baselineSource, source, edits)
    if (mapped != null) result.push(mapped)
  }
  return result
}

export function presentEditingDiagnostics({
  diagnostics,
  baseline,
  baselineSource,
  source,
  call,
  baselineCall,
  block,
  edits,
  defer = true
}: EditingDiagnosticPresentationOptions): Diagnostic[] {
  if (
    !validRange(call, source) ||
    !validRange(baselineCall, baselineSource) ||
    !matchesEdits(baselineSource, source, edits)
  )
    return diagnostics
  const mappedBaseline: Array<{ diagnostic: Diagnostic; outsideCall: boolean }> = []
  for (const diagnostic of baseline) {
    if (diagnostic.origin !== 'static') continue
    const original = offsets(baselineSource, diagnostic.sourceRange ?? diagnostic.range)
    if (original == null) continue
    const mapped = mapBaselineDiagnostic(diagnostic, baselineSource, source, edits)
    if (mapped == null) continue
    mappedBaseline.push({
      diagnostic: mapped,
      outsideCall: original.end < baselineCall.start || original.start > baselineCall.end
    })
  }

  const newStaticError = (diagnostic: Diagnostic) =>
    diagnostic.origin === 'static' &&
    diagnostic.severity === DiagnosticSeverity.Error &&
    !mappedBaseline.some((item) => sameDiagnostic(item.diagnostic, diagnostic))
  const hasLocalSyntaxAnchor = diagnostics.some((diagnostic) => {
    const range = offsets(source, diagnostic.sourceRange ?? diagnostic.range)
    return (
      newStaticError(diagnostic) && range != null && inside(range.start, call) && isParserRecovery(diagnostic.message)
    )
  })
  const boundedBlock =
    block != null && validRange(block, source) && block.start <= call.start && block.end >= call.end ? block : null
  const presented = diagnostics.filter((diagnostic) => {
    if (!defer || !newStaticError(diagnostic)) return true
    const range = offsets(source, diagnostic.sourceRange ?? diagnostic.range)
    if (range == null) return true
    if (inside(range.start, call)) return false
    return !(
      hasLocalSyntaxAnchor &&
      boundedBlock != null &&
      range.start > call.end &&
      insideRecoveryBlock(range, boundedBlock, source) &&
      isParserRecovery(diagnostic.message)
    )
  })
  if (!hasLocalSyntaxAnchor) return presented

  for (const { diagnostic, outsideCall } of mappedBaseline) {
    if (outsideCall && !presented.some((current) => sameDiagnostic(current, diagnostic))) presented.push(diagnostic)
  }
  return presented
}
