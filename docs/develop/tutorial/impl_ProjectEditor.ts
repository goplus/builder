import { copilot } from './base'
import { ICopilotContextProvider } from './module_Copilot'

class ProjectInfoProvider implements ICopilotContextProvider {

  constructor(private project: any) {}

  getInfoText(project: unknown): string {
    return '...'
  }

  provideContext(): string {
    const projectInfoText = this.getInfoText(this.project)
    return `
Here's the current project info:
<project-info>
${projectInfoText}
</project-info>
`
  }
}

function ProjectEditor({ project }: any) {

  copilot.registerContextProvider(new ProjectInfoProvider(project))

  copilot.registerToolsProvider({
    provideTools() {
      return [
        {
          type: 'function',
          name: 'readProjectSpriteCode',
          description: 'Reads the code of a sprite from current editing project.',
          parameters: {
            spriteName: { type: 'string', description: 'Name of the sprite' },
          },
          implementation: async function readProjectSpriteCode(params: { spriteName: string }) {
            return project.sprites.find((s: any) => s.name === params.spriteName).code
          },
        }
      ]
    }
  })

  copilot.notifyUserEvent(
    { en: 'Project Editor Opened', zh: '打开项目编辑器' },
    `The user opened project ${project.owner}/${project.name} with the editor.`
  )
}
