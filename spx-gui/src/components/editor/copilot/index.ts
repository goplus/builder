import dayjs from 'dayjs'
import { z } from 'zod'
import { onScopeDispose, watch } from 'vue'
import { useCopilot } from '@/components/copilot/context'
import { codeFilePathSchema, parseProjectIdentifier, projectIdentifierSchema } from '@/components/copilot/common'
import { type ICopilotContextProvider, type ToolDefinition } from '@/components/copilot/copilot'
import { skillSpxProject, skillXgoLanguage } from '@/components/copilot/skills/built-in'
import { cloudHelpers, type CloudHelpers } from '@/models/common/cloud'
import { SpxProject } from '@/models/spx/project'
import { Disposable } from '@/utils/disposable'
import { useEditorCtx, type EditorCtx } from '../EditorContextProvider.vue'
import { CodeEditor, useCodeEditor } from '../spx-code-editor'
import {
  getActiveCodeDiagnosticContext,
  getProjectDiagnosticContext,
  getRuntimeOutputsDiagnosticContext,
  getSpriteDiagnosticContext,
  sampleCode,
  type ProjectContentDiagnosticContext
} from '../diagnostic-context'
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

function formatProjectContent(content: ProjectContentDiagnosticContext) {
  return `\
### Sprites (num: ${content.sprites.length})
${content.sprites.map((name) => `- ${name}`).join('\n')}
### Sounds (num: ${content.sounds.length})
${content.sounds.map((name) => `- ${name}`).join('\n')}
### Backdrops (num: ${content.backdrops.length})
${content.backdrops.map((name) => `- ${name}`).join('\n')}
### Widgets (num: ${content.widgets.length})
${content.widgets.map((name) => `- ${name}`).join('\n')}
### Physics: ${content.physicsEnabled ? 'Enabled' : 'Disabled'}`
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
    return formatProjectContent(getProjectDiagnosticContext(loadedProject).content)
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
    return getSpriteDiagnosticContext(sprite)
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
    if (loadedProject.stage.codeFilePath === file) return sampleCode(loadedProject.stage.code, { lineStart, lineEnd })
    const sprite = loadedProject.sprites.find((item) => item.codeFilePath === file)
    if (sprite == null) throw new Error(`Code file ${file} not found in project ${project}`)
    return sampleCode(sprite.code, { lineStart, lineEnd })
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
    const context = getProjectDiagnosticContext(project)
    return `# Current project
The user is now working on project: ${context.displayName} (${context.identifier ?? `${project.owner}/${project.name}`})
Class framework ID: spx
## Project content
${formatProjectContent(context.content)}`
  }
}

class SpriteContextProvider implements ICopilotContextProvider {
  constructor(private editorCtx: EditorCtx) {}

  provideContext(): string {
    const sprite = this.editorCtx.state.selectedSprite
    if (sprite == null) return ''
    return `# Current sprite content
${JSON.stringify(getSpriteDiagnosticContext(sprite))}`
  }
}

class CodeContextProvider implements ICopilotContextProvider {
  constructor(private codeEditor: CodeEditor) {}

  provideContext(): string {
    const context = getActiveCodeDiagnosticContext(this.codeEditor)
    if (context == null) return ''
    const cursorPositionStr =
      context.cursor == null ? 'None' : `Line ${context.cursor.line}, Column ${context.cursor.column}`
    const selectionStr =
      context.selection == null
        ? 'None'
        : `From Line ${context.selection.start.line}, Column ${context.selection.start.column} to Line ${context.selection.end.line}, Column ${context.selection.end.column}`
    let result = `# Current code
The user is now viewing / editing code of file \`${context.file}\`. \
Cursor position: ${cursorPositionStr}. \
Selection: ${selectionStr}.`
    result += `
Code content of \`${context.file}\`:
${JSON.stringify(context.sample)}`
    return result
  }
}

class RuntimeContextProvider implements ICopilotContextProvider {
  constructor(private editorCtx: EditorCtx) {}

  provideContext(): string {
    const context = getRuntimeOutputsDiagnosticContext(this.editorCtx)
    if (context.outputs.length === 0) return ''
    const outputsStr = context.outputs
      .map((output) => {
        const time = dayjs(output.time).format('HH:mm:ss.SSS')
        const kindStr = output.kind === 'error' ? 'ERROR' : 'LOG'
        const sourceStr = output.file == null ? '' : ` [${output.file}:${output.line}]`
        return `[${time}] ${kindStr}${sourceStr}: ${output.message.trim()}`
      })
      .join('\n')
    return `# Game runtime output
Recent game runtime outputs (last ${context.outputs.length} of ${context.total}):
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
