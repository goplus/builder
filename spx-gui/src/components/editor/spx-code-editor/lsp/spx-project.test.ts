import { describe, expect, it, vi } from 'vitest'
import { fromText } from '@/models/common/file'
import { SpxProject } from '@/models/spx/project'
import { History } from '@/components/editor/history'
import { XGoLSPClient } from '@/components/xgo-code-editor'
import { SpxCodeEditorProject } from '../spx-project'

describe('SPX language client', () => {
  it('loads SPX sources together with gox files and JSON metadata', async () => {
    const project = new SpxProject()
    const adapter = new SpxCodeEditorProject(project, new History(project))
    const files = {
      'main.spx': fromText('main.spx', ''),
      'assets/index.json': fromText('index.json', '{}'),
      'Other.gox': fromText('Other.gox', ''),
      'assets/image.png': fromText('image.png', '')
    }
    const loaded: string[] = []
    for (const [path, file] of Object.entries(files)) {
      vi.spyOn(file, 'arrayBuffer').mockImplementation(async () => {
        loaded.push(path)
        return new ArrayBuffer(0)
      })
    }
    vi.spyOn(adapter, 'exportFiles').mockReturnValue(files)
    const client = new XGoLSPClient(adapter)
    await client.loadFiles(new AbortController().signal)
    expect(loaded).toEqual(['main.spx', 'assets/index.json', 'Other.gox'])
    client.dispose()
    project.dispose()
  })
})
