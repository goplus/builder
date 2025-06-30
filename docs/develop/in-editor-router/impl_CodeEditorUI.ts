import { ResourceIdentifier, ResourceModel } from './base'
import { EditorState } from './module_EditorState'

declare const editorCtx: {
  state: EditorState
}

declare const builtInCommandGoToResource: any

declare function getResourceModel(resourceId: ResourceIdentifier): ResourceModel

class CodeEditorUI {

  registerCommand(command: any, options: any) {
    // Implementation for registering a command
  }

  init() {
    this.registerCommand(builtInCommandGoToResource, {
      icon: 'goto',
      title: { en: 'View detail', zh: '查看详情' },
      handler: async (resourceId: ResourceIdentifier) => {
        const resource = getResourceModel(resourceId)
        editorCtx.state.selectByResource(resource)
      }
    })
  }
}
