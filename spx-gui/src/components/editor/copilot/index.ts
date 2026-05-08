import dayjs from 'dayjs'
import { z } from 'zod'
import { onScopeDispose, watch } from 'vue'
import { useCopilot } from '@/components/copilot/context'
import { codeFilePathSchema, parseProjectIdentifier, projectIdentifierSchema } from '@/components/copilot/common'
import { type ICopilotContextProvider, type ToolDefinition } from '@/components/copilot/copilot'
import { skillSpxProject, skillXgoLanguage } from '@/components/copilot/skills/built-in'
import { cloudHelpers, type CloudHelpers } from '@/models/common/cloud'
import { SpxProject } from '@/models/spx/project'
import type { Sprite } from '@/models/spx/sprite'
import { Disposable } from '@/utils/disposable'
import { useEditorCtx, type EditorCtx } from '../EditorContextProvider.vue'
import {
  CodeEditor,
  getCodeFilePath,
  isSelectionEmpty,
  textDocumentId2CodeFileName,
  useCodeEditor,
  type TextDocument
} from '../spx-code-editor'
import * as codeLink from './CodeLink'
import * as codeChange from './CodeChange.vue'
import CodeBlock from './CodeBlock.vue'

class Retriever {
  constructor(
    private editorCtx: EditorCtx,
    private helpers: CloudHelpers
  ) {}

  async getProject(project: string | undefined, signal?: AbortSignal): Promise<SpxProject> {
    const currentProject = this.editorCtx.project
    if (project == null) {
      return currentProject
    }
    const { owner, name } = parseProjectIdentifier(project)
    if (currentProject != null && currentProject.owner === owner && currentProject.name === name) {
      return currentProject
    }
    const loadedProject = new SpxProject()
    const serialized = await this.helpers.load(owner, name, true, signal)
    await loadedProject.load(serialized)
    return loadedProject
  }
}

function getProjectContent(project: SpxProject) {
  const physics = project.stage.physics
  return `\
### Sprites (num: ${project.sprites.length})
${project.sprites.map((sprite) => `- ${sprite.name}`).join('\n')}
### Sounds (num: ${project.sounds.length})
${project.sounds.map((sound) => `- ${sound.name}`).join('\n')}
### Backdrops (num: ${project.stage.backdrops.length})
${project.stage.backdrops.map((backdrop) => `- ${backdrop.name}`).join('\n')}
### Widgets (num: ${project.stage.widgets.length})
${project.stage.widgets.map((widget) => `- ${widget.name}`).join('\n')}
### Physics: ${physics.enabled ? 'Enabled' : 'Disabled'}`
}

function getSpriteContent(sprite: Sprite) {
  return {
    name: sprite.name,
    costumes: sprite.costumes.map((costume) => costume.name),
    animations: sprite.animations.map((animation) => animation.name),
    heading: sprite.heading,
    x: sprite.x,
    y: sprite.y,
    size: sprite.size,
    rotationStyle: sprite.rotationStyle,
    visible: sprite.visible,
    codeLinesNum: sprite.code.split(/\r?\n/).length
  }
}

type LineRangeParams = {
  lineStart?: number
  lineEnd?: number
}

function processCode(code: string, { lineStart = 1, lineEnd }: LineRangeParams) {
  const allLines = code.split(/\r?\n/)
  const sampledLines = allLines.slice(lineStart - 1, lineEnd).reduce<Record<string, string>>((result, line, index) => {
    result[index + lineStart] = line
    return result
  }, {})
  return {
    lineCount: allLines.length,
    sampledLines
  }
}

const getProjectMetadataParamsSchema = z.object({
  project: projectIdentifierSchema
})

class GetProjectMetadataTool implements ToolDefinition {
  name = 'get_project_metadata'
  description = 'Get metadata of a project.'
  parameters = getProjectMetadataParamsSchema

  constructor(private retriever: Retriever) {}

  async implementation({ project }: z.infer<typeof getProjectMetadataParamsSchema>, signal?: AbortSignal) {
    const loadedProject = await this.retriever.getProject(project, signal)
    const { owner, remixedFrom, visibility, description, instructions } = loadedProject
    return { owner, remixedFrom, visibility, description, instructions }
  }
}

const getProjectContentParamsSchema = z.object({
  project: projectIdentifierSchema
})

class GetProjectContentTool implements ToolDefinition {
  name = 'get_project_content'
  description = 'Get content of a project.'
  parameters = getProjectContentParamsSchema

  constructor(private retriever: Retriever) {}

  async implementation({ project }: z.infer<typeof getProjectContentParamsSchema>, signal?: AbortSignal) {
    const loadedProject = await this.retriever.getProject(project, signal)
    return getProjectContent(loadedProject)
  }
}

const getSpriteContentParamsSchema = z.object({
  project: projectIdentifierSchema,
  spriteName: z.string().describe('Name of the sprite')
})

class GetSpriteContentTool implements ToolDefinition {
  name = 'get_sprite_content'
  description = 'Get content of a sprite in a project.'
  parameters = getSpriteContentParamsSchema

  constructor(private retriever: Retriever) {}

  async implementation({ project, spriteName }: z.infer<typeof getSpriteContentParamsSchema>, signal?: AbortSignal) {
    const loadedProject = await this.retriever.getProject(project, signal)
    const sprite = loadedProject.sprites.find((item) => item.name === spriteName)
    if (sprite == null) throw new Error(`Sprite "${spriteName}" not found in project "${project}"`)
    return getSpriteContent(sprite)
  }
}

const lineStartSchema = z.number().default(1).describe('Line number to start from, 1-based')
const lineEndSchema = z.number().optional().describe('Line number to end at, 1-based')

const getProjectCodeParamsSchema = z.object({
  project: projectIdentifierSchema,
  file: codeFilePathSchema,
  lineStart: lineStartSchema,
  lineEnd: lineEndSchema
})

class GetProjectCodeTool implements ToolDefinition {
  name = 'get_project_code'
  description = 'Get code content of a file in project.'
  parameters = getProjectCodeParamsSchema

  constructor(private retriever: Retriever) {}

  async implementation(
    { project, file, lineStart, lineEnd }: z.infer<typeof getProjectCodeParamsSchema>,
    signal?: AbortSignal
  ) {
    const loadedProject = await this.retriever.getProject(project, signal)
    if (loadedProject.stage.codeFilePath === file) return processCode(loadedProject.stage.code, { lineStart, lineEnd })
    const sprite = loadedProject.sprites.find((item) => item.codeFilePath === file)
    if (sprite == null) throw new Error(`Code file ${file} not found in project ${project}`)
    return processCode(sprite.code, { lineStart, lineEnd })
  }
}

const getCodeDiagnosticsParamsSchema = z.object({})

class GetCodeDiagnosticsTool implements ToolDefinition {
  name = 'get_code_diagnostics'
  description = 'Get code diagnostics (errors or warnings) of current editing project.'
  parameters = getCodeDiagnosticsParamsSchema

  constructor(private codeEditor: CodeEditor) {}

  async implementation(_: z.infer<typeof getCodeDiagnosticsParamsSchema>, signal?: AbortSignal) {
    return this.codeEditor.diagnosticWorkspace(signal)
  }
}

class ProjectContextProvider implements ICopilotContextProvider {
  constructor(private editorCtx: EditorCtx) {}

  provideContext(): string {
    const project = this.editorCtx.project
    return `# Current project
The user is now working on project: ${project.displayName} (${project.owner}/${project.name})
Class framework ID: spx
## Project content
${getProjectContent(project)}`
  }
}

class SpriteContextProvider implements ICopilotContextProvider {
  constructor(private editorCtx: EditorCtx) {}

  provideContext(): string {
    const sprite = this.editorCtx.state.selectedSprite
    if (sprite == null) return ''
    return `# Current sprite content
${JSON.stringify(getSpriteContent(sprite))}`
  }
}

class CodeContextProvider implements ICopilotContextProvider {
  constructor(private codeEditor: CodeEditor) {}

  private sampleCode(activeTextDocument: TextDocument, line: number) {
    const threshold = 10
    const lineStart = Math.max(line - threshold, 1)
    const lineEnd = lineStart + threshold * 2
    return processCode(activeTextDocument.getValue(), { lineStart, lineEnd })
  }

  provideContext(): string {
    const codeEditorUI = this.codeEditor.getAttachedUI()
    if (codeEditorUI == null) return ''
    const { activeTextDocument, cursorPosition, selection } = codeEditorUI
    if (activeTextDocument == null) return ''
    const codeFilePath = getCodeFilePath(activeTextDocument.id.uri)
    const cursorPositionStr =
      cursorPosition == null ? 'None' : `Line ${cursorPosition.line}, Column ${cursorPosition.column}`
    const selectionStr =
      selection == null || isSelectionEmpty(selection)
        ? 'None'
        : `From Line ${selection.start.line}, Column ${selection.start.column} to Line ${selection.position.line}, Column ${selection.position.column}`
    let result = `# Current code
The user is now viewing / editing code of file \`${codeFilePath}\`. \
Cursor position: ${cursorPositionStr}. \
Selection: ${selectionStr}.`
    const code = this.sampleCode(activeTextDocument, cursorPosition?.line ?? 1)
    result += `
Code content of \`${codeFilePath}\`:
${JSON.stringify(code)}`
    return result
  }
}

class RuntimeContextProvider implements ICopilotContextProvider {
  constructor(private editorCtx: EditorCtx) {}

  provideContext(): string {
    const runtime = this.editorCtx.state.runtime
    const outputs = runtime.outputs
    if (outputs.length === 0) return ''
    const recentOutputs = outputs.slice(-50)
    const outputsStr = recentOutputs
      .map((output) => {
        const time = dayjs(output.time).format('HH:mm:ss.SSS')
        const kindStr = output.kind === 'error' ? 'ERROR' : 'LOG'
        const sourceStr = output.source
          ? ` [${textDocumentId2CodeFileName(output.source.textDocument).en}:${output.source.range.start.line}]`
          : ''
        return `[${time}] ${kindStr}${sourceStr}: ${output.message.trim()}`
      })
      .join('\n')
    return `# Game runtime output
Recent game runtime outputs (last ${recentOutputs.length} of ${outputs.length}):
${outputsStr}`
  }
}

/** Set up Copilot for SPX Editor, including registering tools and context providers. */
export function useSpxEditorCopilot(): void {
  const d = new Disposable()
  onScopeDispose(() => d.dispose())

  const copilot = useCopilot()
  const editorCtx = useEditorCtx()
  const codeEditor = useCodeEditor()
  const retriever = new Retriever(editorCtx, cloudHelpers)

  d.addDisposer(copilot.registerMarkdownElements({ codeBlock: CodeBlock }))
  d.addDisposer(copilot.registerTool(new GetProjectMetadataTool(retriever)))
  d.addDisposer(copilot.registerTool(new GetProjectContentTool(retriever)))
  d.addDisposer(copilot.registerTool(new GetSpriteContentTool(retriever)))
  d.addDisposer(copilot.registerTool(new GetProjectCodeTool(retriever)))
  d.addDisposer(copilot.registerTool(new GetCodeDiagnosticsTool(codeEditor)))
  d.addDisposer(
    copilot.registerCustomElement({
      tagName: codeLink.tagName,
      description: codeLink.detailedDescription,
      attributes: codeLink.attributes,
      isRaw: codeLink.isRaw,
      component: codeLink.default
    })
  )
  d.addDisposer(
    copilot.registerCustomElement({
      tagName: codeChange.tagName,
      description: codeChange.detailedDescription,
      attributes: codeChange.attributes,
      isRaw: codeChange.isRaw,
      component: codeChange.default
    })
  )
  d.addDisposer(copilot.registerContextProvider(new ProjectContextProvider(editorCtx)))
  d.addDisposer(copilot.registerContextProvider(new SpriteContextProvider(editorCtx)))
  d.addDisposer(copilot.registerContextProvider(new CodeContextProvider(codeEditor)))
  d.addDisposer(copilot.registerContextProvider(new RuntimeContextProvider(editorCtx)))
  d.addDisposer(
    copilot.registerContextProvider({
      providePreloadSkills() {
        return [skillXgoLanguage, skillSpxProject]
      }
    })
  )

  watch(
    () => editorCtx.state.runtime,
    (editorRuntime, _, onCleanup) => {
      const unlisten = editorRuntime.on('didExit', (code) => {
        if (code !== 0) return
        copilot.notifyUserEvent({ en: 'Game exited with code 0', zh: '游戏正常退出' }, `Game exited with code ${code}`)
      })
      onCleanup(unlisten)
    },
    { immediate: true }
  )
}
