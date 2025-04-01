import { shallowRef } from 'vue'
import type { CodeEditorUI } from '@/components/editor/code-editor/ui/code-editor-ui'
import type { EditorCtx } from '@/components/editor/EditorContextProvider.vue'
/**
 * 全局编辑器服务
 * 提供对 EditorCtx 和 CodeEditorUI 的统一访问
 */

// ---------- 编辑器上下文和 UI 引用 ----------
const editorCtxRef = shallowRef<EditorCtx | null>(null)
const codeEditorUIRef = shallowRef<CodeEditorUI | null>(null)

/**
 * 全局编辑器服务对象
 */
export const editorService = {
  /**
   * 注册编辑器上下文
   * @param ctx 编辑器上下文实例
   */
  registerEditorCtx(ctx: EditorCtx) {
    editorCtxRef.value = ctx
  },

  /**
   * 注销编辑器上下文
   */
  unregisterEditorCtx() {
    editorCtxRef.value = null
  },

  /**
   * 获取编辑器上下文
   * @returns 编辑器上下文实例
   * @throws 如果编辑器上下文不可用
   */
  getEditorCtx(): EditorCtx {
    if (!editorCtxRef.value) {
      throw new Error('EditorCtx 不可用。请确保在编辑器环境中调用此函数。')
    }
    return editorCtxRef.value
  },

  /**
   * 判断编辑器上下文是否可用
   * @returns 编辑器上下文是否可用
   */
  hasEditorCtx(): boolean {
    return editorCtxRef.value !== null
  },

  /**
   * 注册代码编辑器 UI
   * @param ui 代码编辑器 UI 实例
   */
  registerCodeEditorUI(ui: CodeEditorUI) {
    codeEditorUIRef.value = ui
  },

  /**
   * 注销代码编辑器 UI
   */
  unregisterCodeEditorUI() {
    codeEditorUIRef.value = null
  },

  /**
   * 获取代码编辑器 UI
   * @returns 代码编辑器 UI 实例
   * @throws 如果代码编辑器 UI 不可用
   */
  getCodeEditorUI(): CodeEditorUI {
    if (!codeEditorUIRef.value) {
      throw new Error('CodeEditorUI 不可用。请确保在编辑器环境中调用此函数。')
    }
    return codeEditorUIRef.value
  },

  /**
   * 判断代码编辑器 UI 是否可用
   * @returns 代码编辑器 UI 是否可用
   */
  hasCodeEditorUI(): boolean {
    return codeEditorUIRef.value !== null
  }
}

// 导出简化的 getter 函数，方便直接使用
export function getEditorCtx() {
  return editorService.getEditorCtx()
}

export function getCodeEditorUI() {
  return editorService.getCodeEditorUI()
}
