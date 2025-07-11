import { Sprite } from './base'
import { EditorState } from './module_EditorState'

declare const editorCtx: {
  state: EditorState
}

function SpritesPanel() {
  function handleSpriteClick(sprite: Sprite) {
    editorCtx.state.select({ type: 'sprite', id: sprite.id })
  }
}
