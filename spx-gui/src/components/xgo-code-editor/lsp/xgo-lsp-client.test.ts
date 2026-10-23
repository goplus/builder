import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { parseGoxMod } from '@/utils/xgo/gox-mod'
import { fromText } from '@/models/common/file'
import { ResourceReferenceKind } from '../common'
import type { IXGoProject } from '../project'
import type { PropertyRenamedEvent } from './types'
import type { MainMessage, WorkerMessage } from './worker'
import { XGoLSPClient } from './xgo-lsp-client'

function createProject(
  source = 'project .gox App example.com/framework',
  paths = ['main.gox', 'nested/Actor.gox', 'main.spx', 'index.json', 'gox.mod']
): IXGoProject {
  const files = Object.fromEntries(paths.map((path) => [path, fromText(path, path)]))
  return {
    classFramework: parseGoxMod(source).projects[0],
    getCodeFiles: () => ['main.gox', 'nested/Actor.gox'],
    getCodeOwner: () => null,
    exportFiles: () => files
  }
}

async function startClient(project = createProject()) {
  const sent: MainMessage[] = []
  const workers: LanguageWorker[] = []
  class LanguageWorker extends EventTarget {
    constructor() {
      super()
      workers.push(this)
    }
    terminate() {}
    postMessage(message: MainMessage) {
      sent.push(message)
      if (message.type !== 'lsp' || !('id' in message.message)) return
      const reply: WorkerMessage = {
        type: 'lsp',
        message: {
          jsonrpc: '2.0',
          id: message.message.id,
          result: message.message.method === 'initialize' ? { capabilities: {} } : null
        }
      }
      queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data: reply })))
    }
  }
  vi.stubGlobal('Worker', LanguageWorker)
  const client = new XGoLSPClient(project)
  onTestFinished(() => client.dispose())
  client.init()
  await client.textDocumentHover({}, { textDocument: { uri: 'file:///main.gox' }, position: { line: 0, character: 0 } })
  const files = sent.filter((message) => message.type === 'files').at(-1)!.files
  return { files, client, worker: workers[0], sent }
}

describe('XGo language client', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('serializes framework configuration before sending it to the Worker', async () => {
    const { sent } = await startClient(
      createProject(`// Application framework
project main.spx Game github.com/goplus/spx/v3 math
class -embed *.spx SpriteImpl
import ai github.com/goplus/builder/tools/ai
`)
    )
    expect(sent[0]).toEqual({
      type: 'initialize',
      classFrameworkConfig:
        'project main.spx Game github.com/goplus/spx/v3 math\nclass -embed *.spx SpriteImpl\nimport ai github.com/goplus/builder/tools/ai\n'
    })
  })

  it('synchronizes gox files and JSON metadata by default', async () => {
    const { files } = await startClient()
    expect(Object.keys(files)).toEqual(['main.gox', 'nested/Actor.gox', 'index.json'])
  })

  it('includes the project and work class sources of the project framework', async () => {
    const paths = [
      'main.scene',
      'nested/Second.scene',
      'nested/Actor.actor',
      'main_other.gox',
      'nested/Widget_other.gox',
      'script.gox',
      'assets/index.json',
      'assets/image.png',
      'gox.mod',
      'unregistered.spx'
    ]
    const { files } = await startClient(
      createProject(
        `project main.scene Scene example.com/scene
class *.actor Actor
`,
        paths
      )
    )
    expect(Object.keys(files)).toEqual(paths.slice(0, 7))
  })

  it('does not treat an implicit project registration as matching all files', async () => {
    const { files } = await startClient(createProject('project example.com/implicit'))
    expect(Object.keys(files)).toEqual(['main.gox', 'nested/Actor.gox', 'index.json'])
  })

  it.each(['Game', 'Course'])(
    'uses the configured %s project class for properties and rename events',
    async (className) => {
      const { client, worker } = await startClient(createProject(`project .gox ${className} example.com/framework`))
      const getProperties = vi.spyOn(client, 'workspaceExecuteCommandXGoGetProperties').mockResolvedValue([])
      await client.getProperties({}, '')
      expect(getProperties).toHaveBeenLastCalledWith({}, { target: className })
      await client.getProperties({}, 'Actor')
      expect(getProperties).toHaveBeenLastCalledWith({}, { target: 'Actor' })

      const events: PropertyRenamedEvent[] = []
      client.onPropertyRenamed((event) => events.push(event))
      for (const target of [className, 'Actor']) {
        const message: WorkerMessage = {
          type: 'lsp',
          message: {
            jsonrpc: '2.0',
            method: 'textDocument/xgo.propertyRenamed',
            params: { target, oldName: 'score', newName: 'points' }
          }
        }
        worker.dispatchEvent(new MessageEvent('message', { data: message }))
      }
      expect(events).toEqual([
        { target: '', oldName: 'score', newName: 'points' },
        { target: 'Actor', oldName: 'score', newName: 'points' }
      ])
    }
  )

  it('identifies resource links by their resource URI', async () => {
    const client = new XGoLSPClient(createProject())
    onTestFinished(() => client.dispose())
    const range = { start: { line: 0, character: 5 }, end: { line: 0, character: 11 } }
    vi.spyOn(client, 'textDocumentDocumentLink').mockResolvedValue([
      { target: 'spx://resources/sounds/beep', range, data: { kind: ResourceReferenceKind.StringLiteral } },
      { target: 'spx://resources/videos/intro', range, data: { kind: ResourceReferenceKind.AutoBinding } },
      { target: 'file:///other.gox', range, data: { kind: ResourceReferenceKind.StringLiteral } },
      { target: 'file:///README.md', range },
      { target: 'github.com/goplus/spx/v3?Game', range }
    ])
    expect(await client.getResourceReferences({}, { uri: 'file:///main.gox' })).toEqual([
      {
        resource: { uri: 'spx://resources/sounds/beep' },
        range: { start: { line: 1, column: 6 }, end: { line: 1, column: 12 } },
        kind: ResourceReferenceKind.StringLiteral
      },
      {
        resource: { uri: 'spx://resources/videos/intro' },
        range: { start: { line: 1, column: 6 }, end: { line: 1, column: 12 } },
        kind: ResourceReferenceKind.AutoBinding
      }
    ])
  })
})
