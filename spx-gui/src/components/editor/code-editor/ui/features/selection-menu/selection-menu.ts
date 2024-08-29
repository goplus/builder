import { editor as IEditor, Emitter, type IDisposable, Selection } from 'monaco-editor'
import { reactive } from 'vue'
import type { EditorMenuItem } from '@/components/editor/code-editor/ui/EditorMenu.vue'
import { debounce } from '@/utils/utils'

interface SelectionMenuItem extends EditorMenuItem {
  action: () => void
}

export class SelectionMenu implements IDisposable {
  public editor: IEditor.IStandaloneCodeEditor
  private _onSelection = new Emitter<{ selection: Selection; content: string }>()
  public onSelection = this._onSelection.event
  public SelectionMenuState = reactive<{
    menuItems: Array<SelectionMenuItem>
    visible: boolean
    menuVisible: boolean
    position: {
      top: number
      left: number
    }
    selectedContent: string
  }>({
    menuVisible: false,
    position: {
      top: 0,
      left: 0
    },
    visible: false,
    menuItems: [],
    selectedContent: ''
  })
  private setSelectedContent = debounce(this._setSelectedContent, 300)
  constructor(editor: IEditor.IStandaloneCodeEditor) {
    this.editor = editor
    this.editor.onDidChangeCursorSelection((e: IEditor.ICursorSelectionChangedEvent) => {
      // todo: monaco allow multiple cursors, may have multiple selection, current only get one selection
      // determine selection is from user mouse or keyboard typing, not from paste, undo, redo, flash content, etc.
      if (e.reason !== IEditor.CursorChangeReason.Explicit) return
      const selection = this.editor.getSelection()
      const model = this.editor.getModel()
      if (!selection || !model) return
      this.hideMenu()
      const selectedContent = model.getValueInRange(selection)
      if (!selectedContent || !selectedContent.trim()) return
      this.setSelectedContent(selection, selectedContent)
    })

    this.editor.onMouseDown(() => {
      this.hideMenu()
    })
  }

  _setSelectedContent(selection: Selection, content: string) {
    this.SelectionMenuState.selectedContent = content
    this.showMenu()
    this._onSelection.fire({ selection, content })
  }

  showMenu() {
    this.SelectionMenuState.visible = true
  }

  hideMenu() {
    this.SelectionMenuState.visible = false
  }

  dispose() {
    this._onSelection.dispose()
  }
}
