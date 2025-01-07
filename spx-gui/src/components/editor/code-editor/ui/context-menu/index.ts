import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { timeout } from '@/utils/utils'
import { Cancelled } from '@/utils/exception'
import { TaskManager } from '@/utils/task'
import { type Action, type BaseContext, type Selection, type Position, isSelectionEmpty } from '../../common'
import type { monaco } from '../../monaco'
import {
  builtInCommandCopy,
  type CodeEditorUI,
  builtInCommandCut,
  builtInCommandPaste,
  type InternalAction
} from '../code-editor-ui'
import { toMonacoPosition, fromMonacoPosition, fromMonacoSelection } from '../common'

export type ContextMenuContext = BaseContext

export type MenuItem = Action

export type InternalMenuItem = InternalAction

export type MenuGroup = InternalMenuItem[]

export type AbsolutePosition = {
  /** Top position in pixels, relative to the viewport */
  top: number
  /** Left position in pixels, relative to the viewport */
  left: number
}

export type MenuData = {
  groups: MenuGroup[]
  position: AbsolutePosition
}

export type TriggerData = {
  selection: Selection
}

export interface IContextMenuProvider {
  provideContextMenu(ctx: ContextMenuContext, position: Position): Promise<MenuItem[]>
  provideSelectionContextMenu(ctx: ContextMenuContext, selection: Selection): Promise<MenuItem[]>
}

export class ContextMenuController extends Disposable {
  private providerRef = shallowRef<IContextMenuProvider | null>(null)
  registerProvider(provider: IContextMenuProvider) {
    this.providerRef.value = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  private get builtinMenuItems(): InternalMenuItem[] {
    return [builtInCommandCut, builtInCommandCopy, builtInCommandPaste].map(
      (command) =>
        this.ui.resolveAction({
          command,
          arguments: []
        })!
    )
  }

  private menuMgr = new TaskManager(async (signal, aPos: AbsolutePosition, posOrSel: Position | Selection) => {
    const provider = this.providerRef.value
    if (provider == null) throw new Error('No provider registered')
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) throw new Error('No active text document')
    const ctx: ContextMenuContext = { textDocument, signal }
    const items = await (
      'line' in posOrSel
        ? provider.provideContextMenu(ctx, posOrSel)
        : provider.provideSelectionContextMenu(ctx, posOrSel)
    ).catch((err) => {
      if (err instanceof Cancelled) throw err
      console.warn('Error while providing context menu items:', err)
      return []
    })
    const groups = [this.builtinMenuItems]
    const resolvedItems = items?.map((item) => this.ui.resolveAction(item)).filter((i) => i != null)
    if (resolvedItems != null && resolvedItems?.length > 0) {
      groups.unshift(resolvedItems as InternalMenuItem[])
    }
    return { groups, position: aPos }
  })

  get menuData() {
    return this.menuMgr.result.data
  }

  get triggerData(): TriggerData | null {
    if (isSelectionEmpty(this.ui.selection)) return null
    return { selection: this.ui.selection! }
  }

  triggerWidgetEl = document.createElement('div')

  private triggerWidget = {
    getId: () => `context-menu-trigger-for-${this.ui.id}`,
    getDomNode: () => this.triggerWidgetEl,
    getPosition: () => {
      const monaco = this.ui.monaco
      const triggerData = this.triggerData
      let position: monaco.IPosition | null = null
      if (triggerData != null) {
        position = toMonacoPosition({
          line: triggerData.selection.position.line,
          column: 0
        })
      }
      return {
        position,
        preference: [
          monaco.editor.ContentWidgetPositionPreference.ABOVE,
          monaco.editor.ContentWidgetPositionPreference.BELOW
        ]
      }
    }
  } satisfies monaco.editor.IContentWidget

  private hideMenu() {
    this.menuMgr.stop()
  }

  showMenuForTriggerClick(clickPosition: AbsolutePosition, selection: Selection) {
    this.menuMgr.start(clickPosition, selection)
  }

  private async showMenuForRightClick(e: monaco.editor.IEditorMouseEvent) {
    await timeout(0) // wait for selection to be updated for CONTENT_EMPTY click
    const clickPosition = { top: e.event.posy, left: e.event.posx }
    const selection = this.ui.editor.getSelection()
    if (selection == null) return
    if (selection.isEmpty()) {
      const position = selection.getPosition()
      this.menuMgr.start(clickPosition, fromMonacoPosition(position))
      return
    }
    this.menuMgr.start(clickPosition, fromMonacoSelection(selection))
  }

  async executeMenuItem(item: MenuItem) {
    await this.ui.executeCommand(item.command, ...item.arguments)
    this.hideMenu()
  }

  init() {
    const { editor, monaco } = this.ui

    editor.addContentWidget(this.triggerWidget)
    this.addDisposer(() => editor.removeContentWidget(this.triggerWidget))
    this.addDisposer(
      watch(
        () => this.triggerWidget.getPosition(),
        () => editor.layoutContentWidget(this.triggerWidget)
      )
    )

    const MTT = monaco.editor.MouseTargetType
    this.addDisposable(
      editor.onMouseDown((e) => {
        if (e.target.type !== MTT.CONTENT_WIDGET) this.hideMenu()
        if (!e.event.rightButton) return
        switch (e.target.type) {
          case MTT.CONTENT_TEXT:
          case MTT.CONTENT_EMPTY:
            this.showMenuForRightClick(e)
            break
        }
      })
    )

    this.addDisposable(
      editor.onKeyDown((e) => {
        if (e.keyCode === monaco.KeyCode.Escape) this.hideMenu()
      })
    )

    this.addDisposable(
      editor.onContextMenu((e) => {
        e.event.preventDefault()
      })
    )
  }
}
