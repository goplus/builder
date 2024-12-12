import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { timeout } from '@/utils/utils'
import { type Action, type BaseContext, type Selection, type Position } from '../../common'
import { builtInCommandCopy, type CodeEditorUI, builtInCommandCut, builtInCommandPaste, type InternalAction } from '..'
import { makeContentWidgetEl } from '../CodeEditorUI.vue'
import { toMonacoPosition, type monaco, isSelectionEmpty, fromMonacoPosition, fromMonacoSelection } from '../common'

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

  private currentMenuDataRef = shallowRef<MenuData | null>(null)
  get currentMenuData() {
    return this.currentMenuDataRef.value
  }

  get currentTriggerData(): TriggerData | null {
    if (isSelectionEmpty(this.ui.selection)) return null
    return { selection: this.ui.selection! }
  }

  menuTriggerWidgetEl = makeContentWidgetEl()

  private menuTriggerWidget = {
    getId: () => `context-menu-trigger-for-${this.ui.id}`,
    getDomNode: () => this.menuTriggerWidgetEl,
    getPosition: () => {
      const monaco = this.ui.monaco
      const triggerData = this.currentTriggerData
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

  private lastShowMenuCtrl: AbortController | null = null
  private hideMenu() {
    if (this.lastShowMenuCtrl != null) this.lastShowMenuCtrl.abort()
    this.currentMenuDataRef.value = null
  }
  private async showMenu(
    position: AbsolutePosition,
    fetchMenu?: (ctx: ContextMenuContext) => Promise<MenuItem[]> | undefined
  ) {
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) return
    if (this.lastShowMenuCtrl != null) this.lastShowMenuCtrl.abort()
    this.lastShowMenuCtrl = new AbortController()
    const signal = this.lastShowMenuCtrl.signal
    const items = await fetchMenu?.({ textDocument, signal })
    signal.throwIfAborted()
    const groups = [this.builtinMenuItems]
    const resolvedItems = items?.map((item) => this.ui.resolveAction(item)).filter((i) => i != null)
    if (resolvedItems != null && resolvedItems?.length > 0) {
      groups.unshift(resolvedItems as InternalMenuItem[])
    }
    this.currentMenuDataRef.value = { groups, position }
  }

  showMenuForTriggerClick(clickPosition: AbsolutePosition, selection: Selection) {
    return this.showMenu(clickPosition, (ctx) => this.providerRef.value?.provideSelectionContextMenu(ctx, selection))
  }

  private async showMenuForRightClick(e: monaco.editor.IEditorMouseEvent) {
    await timeout(0) // wait for selection to be updated for CONTENT_EMPTY click
    const clickPosition = { top: e.event.posy, left: e.event.posx }
    const selection = this.ui.editor.getSelection()
    if (selection == null) return
    if (selection.isEmpty()) {
      const position = selection.getPosition()
      return this.showMenu(clickPosition, (ctx) =>
        this.providerRef.value?.provideContextMenu(ctx, fromMonacoPosition(position))
      )
    }
    return this.showMenu(clickPosition, (ctx) =>
      this.providerRef.value?.provideSelectionContextMenu(ctx, fromMonacoSelection(selection))
    )
  }

  executeMenuItem(item: MenuItem) {
    this.hideMenu()
    return this.ui.executeCommand(item.command, ...item.arguments)
  }

  init() {
    const { editor, monaco } = this.ui

    editor.addContentWidget(this.menuTriggerWidget)
    this.addDisposer(() => editor.removeContentWidget(this.menuTriggerWidget))
    this.addDisposer(
      watch(
        () => this.menuTriggerWidget.getPosition(),
        () => editor.layoutContentWidget(this.menuTriggerWidget)
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
