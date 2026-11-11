// Run after build-wasm.sh: node scripts/check-definition-references.mjs
// Uses the same WASM language server as the editor, not mocked reference results.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import '../src/assets/wasm/wasm_exec.js'

const go = new Go()
const bytes = await readFile(new URL('../src/assets/wasm/spxls.wasm', import.meta.url))
const { instance } = await WebAssembly.instantiate(bytes, go.importObject)
void go.run(instance)
SetCustomPkgdataZip(await readFile(new URL('../src/assets/wasm/spxls-pkgdata.zip', import.meta.url)))

const sources = {
  'main.spx': [
    'func factorial(n int) int {',
    ' if n <= 1 { return 1 }',
    ' return n * factorial(n - 1)',
    '}',
    'func even(n int) bool {',
    ' if n == 0 { return true }; return odd(n - 1)',
    '}',
    'func odd(n int) bool {',
    ' if n == 0 { return false }; return even(n - 1)',
    '}',
    'func unused() {}'
  ].join('\n'),
  'Board.spx': 'onStart => {\n println factorial(5)\n println factorial(3)\n println even(4)\n}',
  'assets/index.json': '{}',
  'assets/sprites/Board/index.json': '{}'
}
const files = Object.fromEntries(
  Object.entries(sources).map(([path, code]) => [
    path,
    {
      content: new TextEncoder().encode(code),
      modTime: 1
    }
  ])
)
let nextId = 0
const pending = new Map()
const server = NewXGoLanguageServer(
  () => files,
  (message) => {
    if (message.id == null) return
    const callbacks = pending.get(message.id)
    if (callbacks == null) return
    pending.delete(message.id)
    if (message.error != null) callbacks.reject(new Error(message.error.message))
    else callbacks.resolve(message.result)
  }
)
if (server instanceof Error) throw server

function request(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject })
    const error = server.handleMessage({ jsonrpc: '2.0', id, method, params })
    if (error != null) {
      pending.delete(id)
      reject(error)
    }
  })
}

const timeout = setTimeout(() => {
  console.error('Language server verification timed out')
  process.exit(1)
}, 20000)
try {
  const initialized = await request('initialize', { processId: null, rootUri: 'file:///', capabilities: {} })
  assert.ok(initialized.capabilities.referencesProvider)
  server.handleMessage({ jsonrpc: '2.0', method: 'initialized', params: {} })
  const references = async (line, character) =>
    (await request('textDocument/references', {
      textDocument: { uri: 'file:///main.spx' },
      position: { line, character },
      context: { includeDeclaration: false }
    })) ?? []
  const factorial = await references(0, 6)
  assert.equal(factorial.length, 3)
  assert.equal(factorial.filter((item) => item.uri === 'file:///Board.spx').length, 2)
  assert.ok(factorial.some((item) => item.uri === 'file:///main.spx' && item.range.start.line === 2))
  const definition = await request('textDocument/definition', {
    textDocument: { uri: 'file:///main.spx' },
    position: { line: 2, character: 14 }
  })
  assert.equal((Array.isArray(definition) ? definition[0] : definition).range.start.line, 0)
  const even = await references(4, 6)
  assert.equal(even.length, 2)
  assert.ok(even.some((item) => item.uri === 'file:///main.spx' && item.range.start.line === 8))
  assert.equal((await references(7, 6)).length, 1)
  assert.equal((await references(10, 6)).length, 0)
  const renameParams = { textDocument: { uri: 'file:///main.spx' }, position: { line: 0, character: 6 } }
  assert.ok(await request('textDocument/prepareRename', renameParams))
  const rename = await request('textDocument/rename', { ...renameParams, newName: 'renamedFactorial' })
  assert.equal(rename.changes['file:///main.spx'].length, 2)
  assert.equal(rename.changes['file:///Board.spx'].length, 2)
  for (const edits of Object.values(rename.changes)) {
    assert.ok(edits.every((edit) => edit.newText === 'renamedFactorial'))
  }
  files['main.spx'] = {
    content: new TextEncoder().encode(sources['main.spx'].replace('factorial(n int)', 'factorial(n int, extra int)')),
    modTime: 2
  }
  const afterParameterChange = await references(0, 6)
  assert.equal(afterParameterChange.length, 3)
  assert.equal(afterParameterChange.filter((item) => item.uri === 'file:///Board.spx').length, 2)
  console.warn(
    'PASS: multiple cross-document references, self-recursion, mutual recursion, recursive definition lookup, zero references, rename from declaration, and references after parameter changes'
  )
} finally {
  clearTimeout(timeout)
}
process.exit(0)
