import { describe, expect, it } from 'vitest'
import { DiagnosticSeverity, type Diagnostic, type Position } from '../../common'
import {
  mapBaselineDiagnostics,
  presentEditingDiagnostics,
  type EditingDiagnosticPresentationOptions
} from './presentation'

function position(source: string, offset: number): Position {
  const preceding = source.slice(0, offset).split('\n')
  return { line: preceding.length, column: preceding[preceding.length - 1].length + 1 }
}

function problem(source: string, target: string, message: string, options: Partial<Diagnostic> = {}): Diagnostic {
  const offset = source.indexOf(target)
  if (offset < 0) throw new Error(`Missing fixture target: ${target}`)
  return {
    origin: 'static',
    severity: DiagnosticSeverity.Error,
    range: { start: position(source, offset), end: position(source, offset + target.length) },
    message,
    ...options
  }
}

function fixture(): EditingDiagnosticPresentationOptions {
  const baselineSource = 'onStart {\n\tglide 100,50,1\n\tprintln unknownName\n\tprintln "done"\n}\nprintln afterBlock\n'
  const start = baselineSource.indexOf('50')
  const edits = [{ start, end: start + 2, text: '' }]
  const source = baselineSource.slice(0, start) + baselineSource.slice(start + 2)
  const baselineCall = {
    start: baselineSource.indexOf('glide'),
    end: baselineSource.indexOf('\n', baselineSource.indexOf('glide'))
  }
  const call = { start: baselineCall.start, end: baselineCall.end - 2 }
  const block = { start: source.indexOf('{'), end: source.indexOf('}') + 1 }
  const comma = source.indexOf(',,') + 1
  const anchor = problem(source, ',,', "expected operand, found ','", {
    range: { start: position(source, comma), end: position(source, comma + 1) }
  })
  return {
    baselineSource,
    source,
    edits,
    baselineCall,
    call,
    block,
    baseline: [problem(baselineSource, 'unknownName', 'undefined: unknownName')],
    diagnostics: [
      anchor,
      problem(source, 'println "done"', "expected ';', found println"),
      problem(source, '}', "expected operand, found '}'")
    ]
  }
}

describe('Diagnostics during an isolated call edit', () => {
  it.each([false, true])(
    'handles actual SPX zero-width parser cascades immediately after the closing brace (independent=%s)',
    (independent) => {
      const baselineSource = `onStart => {\n\tglide 100, 200, 1\n${independent ? '\tprintln unknownName\n' : ''}\tprintln "done"\n}\n`
      const start = baselineSource.indexOf('200')
      const edits = [{ start, end: start + 3, text: '' }]
      const source = baselineSource.slice(0, start) + baselineSource.slice(start + 3)
      const baselineCall = { start: baselineSource.indexOf('glide'), end: baselineSource.indexOf('\n', start) }
      const call = { start: baselineCall.start, end: baselineCall.end - 3 }
      const block = { start: source.indexOf('{'), end: source.indexOf('}') + 1 }
      const rawAnchor = { line: 2, column: 13 }
      const endpoint = position(source, block.end)
      const closingBrace = position(source, block.end - 1)
      const diagnostics: Diagnostic[] = [
        {
          origin: 'static',
          severity: DiagnosticSeverity.Error,
          message: "expected operand, found ','",
          sourceRange: { start: rawAnchor, end: rawAnchor },
          range: { start: rawAnchor, end: { line: 2, column: 14 } }
        },
        ...["expected ';', found 'EOF'", "expected '}', found 'EOF'", "missing ',' in argument list"].map(
          (message) => ({
            origin: 'static' as const,
            severity: DiagnosticSeverity.Error,
            message,
            sourceRange: { start: endpoint, end: endpoint },
            range: { start: closingBrace, end: endpoint }
          })
        ),
        {
          origin: 'static',
          severity: DiagnosticSeverity.Error,
          message: 'compileExpr failed: unknown - *ast.BadExpr',
          sourceRange: { start: rawAnchor, end: endpoint },
          range: { start: rawAnchor, end: endpoint }
        }
      ]
      const baseline = independent ? [problem(baselineSource, 'unknownName', 'undefined: unknownName')] : []
      const input = { diagnostics, baseline, baselineSource, source, call, baselineCall, block, edits }
      const editing = presentEditingDiagnostics(input)
      expect(editing.map((item) => item.message)).toEqual(independent ? ['undefined: unknownName'] : [])
      const revealed = presentEditingDiagnostics({ ...input, defer: false })
      expect(revealed.slice(0, diagnostics.length)).toEqual(diagnostics)
      expect(revealed.filter((item) => item.message === 'undefined: unknownName')).toHaveLength(independent ? 1 : 0)
    }
  )

  it('keeps nonzero ranges and positions beyond the closing-brace endpoint visible', () => {
    const input = fixture()
    const endpoint = input.block!.end
    const nonzero = problem(input.source, '}', "expected ';', found 'EOF'", {
      sourceRange: { start: position(input.source, endpoint), end: position(input.source, endpoint + 1) }
    })
    const following = problem(input.source, 'afterBlock', "expected '}', found 'EOF'", {
      sourceRange: { start: position(input.source, endpoint + 1), end: position(input.source, endpoint + 1) }
    })
    const result = presentEditingDiagnostics({ ...input, diagnostics: [...input.diagnostics, nonzero, following] })
    expect(result).toEqual(expect.arrayContaining([nonzero, following]))
  })

  it('does not treat a following same-line statement as the closing-brace recovery endpoint', () => {
    const input = fixture()
    const baselineSource = input.baselineSource.replace('}\nprintln', '}println')
    const source = input.source.replace('}\nprintln', '}println')
    const endpoint = source.indexOf('}') + 1
    const following = problem(source, 'afterBlock', "expected ';', found 'IDENT'", {
      sourceRange: { start: position(source, endpoint), end: position(source, endpoint) }
    })
    const result = presentEditingDiagnostics({
      ...input,
      source,
      baselineSource,
      diagnostics: [input.diagnostics[0], following]
    })
    expect(result).toContain(following)
  })

  it('maps known errors while the next check is pending and drops spans touched by the edit', () => {
    const input = fixture()
    const touched = problem(input.baselineSource, '50', 'edited value error')
    const mapped = mapBaselineDiagnostics([...input.baseline, touched], input.baselineSource, input.source, input.edits)
    expect(mapped).toHaveLength(1)
    expect(mapped[0]).toMatchObject({
      message: 'undefined: unknownName',
      range: problem(input.source, 'unknownName', 'undefined: unknownName').range
    })
  })

  it('fails closed when source versions, edit offsets or tracked call bounds do not agree', () => {
    const input = fixture()
    expect(presentEditingDiagnostics({ ...input, source: `${input.source}\n` })).toBe(input.diagnostics)
    expect(presentEditingDiagnostics({ ...input, edits: [{ start: -1, end: 0, text: '' }] })).toBe(input.diagnostics)
    expect(presentEditingDiagnostics({ ...input, call: { start: 0, end: input.source.length + 1 } })).toBe(
      input.diagnostics
    )
    expect(mapBaselineDiagnostics(input.baseline, input.baselineSource, `${input.source}\n`, input.edits)).toEqual([])
  })

  it('defers new local errors and bounded syntax cascades while preserving an omitted independent error', () => {
    const input = fixture()
    const baseline = structuredClone(input.baseline)
    const diagnostics = structuredClone(input.diagnostics)
    const result = presentEditingDiagnostics(input)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ message: 'undefined: unknownName', range: input.baseline[0].range })
    expect(input.baseline).toEqual(baseline)
    expect(input.diagnostics).toEqual(diagnostics)
  })

  it('reveals current errors without losing the independent baseline error on leave or run', () => {
    const input = fixture()
    const result = presentEditingDiagnostics({ ...input, defer: false })
    expect(result.map((item) => item.message)).toEqual([
      ...input.diagnostics.map((item) => item.message),
      'undefined: unknownName'
    ])
  })

  it('retains new semantic errors, warnings, runtime failures and unknown origins, including inside the call', () => {
    const input = fixture()
    const semantic = problem(input.source, 'println "done"', 'cannot use value as int')
    const warning = problem(input.source, 'glide', 'warning', { severity: DiagnosticSeverity.Warning })
    const runtime = problem(input.source, 'glide', 'runtime failure', { origin: 'runtime' })
    const unknown = problem(input.source, 'glide', 'unknown origin', { origin: undefined })
    const result = presentEditingDiagnostics({
      ...input,
      diagnostics: [...input.diagnostics, semantic, warning, runtime, unknown]
    })
    expect(result).toEqual(expect.arrayContaining([semantic, warning, runtime, unknown]))
  })

  it('keeps syntax diagnostics before the call, beyond its block, or without a known parser-recovery message', () => {
    const input = fixture()
    const before = problem(input.source, 'onStart', "expected statement, found 'IDENT'")
    const after = problem(input.source, 'afterBlock', "expected ';', found 'IDENT'")
    const unknown = problem(input.source, 'println "done"', 'unrecognized parser failure')
    const result = presentEditingDiagnostics({ ...input, diagnostics: [...input.diagnostics, before, after, unknown] })
    expect(result).toEqual(expect.arrayContaining([before, after, unknown]))
  })

  it('does not infer downstream cascades without a current local syntax anchor', () => {
    const input = fixture()
    const local = problem(input.source, 'glide', 'not enough arguments in call to glide')
    const downstream = input.diagnostics[1]
    expect(presentEditingDiagnostics({ ...input, diagnostics: [local, downstream] })).toEqual([downstream])
  })

  it('does not restore old diagnostics after a valid parse or clear current check', () => {
    const input = fixture()
    expect(presentEditingDiagnostics({ ...input, diagnostics: [] })).toEqual([])
    const semantic = problem(input.source, 'glide', 'not enough arguments in call to glide')
    expect(presentEditingDiagnostics({ ...input, diagnostics: [semantic], defer: false })).toEqual([semantic])
  })

  it('deduplicates an independent error that the current report still contains', () => {
    const input = fixture()
    const independent = problem(input.source, 'unknownName', 'undefined: unknownName')
    const result = presentEditingDiagnostics({ ...input, diagnostics: [...input.diagnostics, independent] })
    expect(result).toEqual([independent])
    expect(result[0]).toBe(independent)
  })

  it('maps untouched baseline errors through sequential multiline changes', () => {
    const input = fixture()
    const newline = { start: input.source.indexOf(',,') + 1, end: input.source.indexOf(',,') + 1, text: '\n\t\t' }
    const source = input.source.slice(0, newline.start) + newline.text + input.source.slice(newline.end)
    const comma = source.indexOf('\n\t\t,') + 3
    const syntax = problem(source, '\n\t\t,', "expected operand, found ','", {
      range: { start: position(source, comma), end: position(source, comma + 1) }
    })
    const result = presentEditingDiagnostics({
      ...input,
      source,
      edits: [...input.edits, newline],
      call: { start: input.call.start, end: input.call.end + newline.text.length },
      block: { start: input.block!.start, end: input.block!.end + newline.text.length },
      diagnostics: [syntax]
    })
    expect(result).toHaveLength(1)
    expect(result[0].range.start).toEqual(position(source, source.indexOf('unknownName')))
    expect(result[0].range.end).toEqual(position(source, source.indexOf('unknownName') + 'unknownName'.length))
  })

  it('uses the original source range when a local zero-width error was visually expanded beyond the call', () => {
    const input = fixture()
    const raw = position(input.source, input.call.end)
    const expanded = problem(input.source, 'println unknownName', "expected operand, found 'EOF'", {
      sourceRange: { start: raw, end: raw },
      range: { start: raw, end: position(input.source, input.source.indexOf('println unknownName') + 1) }
    })
    expect(presentEditingDiagnostics({ ...input, diagnostics: [expanded] }).map((item) => item.message)).toEqual([
      'undefined: unknownName'
    ])
  })

  it('does not defer an existing diagnostic matched against its mapped baseline location', () => {
    const input = fixture()
    const existing = problem(input.baselineSource, '100', 'existing local problem')
    const current = problem(input.source, '100', 'existing local problem')
    expect(presentEditingDiagnostics({ ...input, baseline: [existing], diagnostics: [current] })).toEqual([current])
  })

  it('requires an enclosing block for outward suppression and fails closed for invalid ranges', () => {
    const input = fixture()
    const invalid = problem(input.source, 'glide', 'unknown location', {
      range: { start: { line: 1000, column: 1 }, end: { line: 1000, column: 2 } }
    })
    const result = presentEditingDiagnostics({ ...input, block: null, diagnostics: [...input.diagnostics, invalid] })
    expect(result).toEqual(expect.arrayContaining([input.diagnostics[1], input.diagnostics[2], invalid]))
  })
})
