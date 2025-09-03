/**
 * 历史状态管理器
 * 用于实现undo/redo功能，将画板状态保存到sessionStorage
 */
export interface HistoryState {
  svgContent: string
  timestamp: number
  description?: string
}

// 画布恢复回调函数类型
export type CanvasRestoreCallback = (svgContent: string) => Promise<void> | void

export class HistoryManager {
  private readonly storageKey: string
  private readonly maxHistorySize: number
  private currentIndex: number = -1
  private restoreCallback: CanvasRestoreCallback | null = null
  private initialState: string = '' // 保存初始空白状态
  
  constructor(storageKey: string = 'paintboard_history', maxHistorySize: number = 64) {
    this.storageKey = storageKey
    this.maxHistorySize = maxHistorySize
    this.initializeHistory()
  }

  /**
   * 设置画布恢复回调函数
   * @param callback 用于恢复画布状态的回调函数
   */
  setRestoreCallback(callback: CanvasRestoreCallback): void {
    this.restoreCallback = callback
  }

  /**
   * 设置初始空白状态
   * @param svgContent 初始状态的SVG内容（通常是空白画布）
   */
  setInitialState(svgContent: string): void {
    this.initialState = svgContent
  }

  /**
   * 初始化历史记录
   */
  private initializeHistory(): void {
    const history = this.getHistoryFromStorage()
    if (history.length > 0) {
      this.currentIndex = history.length - 1
    }
  }

  /**
   * 从sessionStorage获取历史记录
   */
  private getHistoryFromStorage(): HistoryState[] {
    try {
      const stored = sessionStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.warn('Failed to load history from sessionStorage:', error)
      return []
    }
  }

  /**
   * 保存历史记录到sessionStorage
   */
  private saveHistoryToStorage(history: HistoryState[]): void {
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(history))
    } catch (error) {
      console.warn('Failed to save history to sessionStorage:', error)
    }
  }

  /**
   * 添加新的历史状态
   */
  addState(svgContent: string, description?: string): void {
    console.log(svgContent,'svgContent')
    if (!svgContent || svgContent.trim() === '') {
      return
    }

    const history = this.getHistoryFromStorage()
    
    // 创建新的历史状态
    const newState: HistoryState = {
      svgContent,
      timestamp: Date.now(),
      description
    }

    // 如果当前不在历史记录的末尾，移除当前位置之后的所有记录
    if (this.currentIndex < history.length - 1) {
      history.splice(this.currentIndex + 1)
    }

    // 添加新状态
    history.push(newState)
    console.log(history.length,'history')
    this.currentIndex = history.length - 1

    // 限制历史记录大小
    if (history.length > this.maxHistorySize) {
      const removeCount = history.length - this.maxHistorySize
      history.splice(0, removeCount)
      this.currentIndex -= removeCount
    }

    this.saveHistoryToStorage(history)
  }

  /**
   * 撤销操作
   */
  async undo(): Promise<boolean> {
    if (!this.canUndo()) {
      return false
    }

    const history = this.getHistoryFromStorage()
    
    // 如果当前在第一个历史记录，撤销到初始空白状态
    if (this.currentIndex === 0) {
      this.currentIndex = -1
      if (this.restoreCallback) {
        try {
          await this.restoreCallback(this.initialState)
          return true
        } catch (error) {
          console.error('Failed to restore initial state during undo:', error)
          // 回滚索引
          this.currentIndex = 0
          return false
        }
      }
      return false
    }

    // 正常撤销到上一个历史记录
    this.currentIndex--
    const previousState = history[this.currentIndex]
    
    if (previousState && this.restoreCallback) {
      try {
        await this.restoreCallback(previousState.svgContent)
        return true
      } catch (error) {
        console.error('Failed to restore canvas state during undo:', error)
        // 回滚索引
        this.currentIndex++
        return false
      }
    }
    
    return false
  }

  /**
   * 重做操作
   */
  async redo(): Promise<boolean> {
    if (!this.canRedo()) {
      return false
    }

    this.currentIndex++
    const history = this.getHistoryFromStorage()
    const nextState = history[this.currentIndex]
    
    if (nextState && this.restoreCallback) {
      try {
        await this.restoreCallback(nextState.svgContent)
        return true
      } catch (error) {
        console.error('Failed to restore canvas state during redo:', error)
        // 回滚索引
        this.currentIndex--
        return false
      }
    }
    
    return false
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    // 只要有历史记录就可以撤销（包括撤销到初始空白状态）
    return this.currentIndex >= 0
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    const history = this.getHistoryFromStorage()
    return this.currentIndex < history.length - 1
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): HistoryState | null {
    if (this.currentIndex < 0) {
      return null
    }
    
    const history = this.getHistoryFromStorage()
    return history[this.currentIndex] || null
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.currentIndex = -1
    this.saveHistoryToStorage([])
  }

  /**
   * 获取历史记录信息
   */
  getHistoryInfo(): {
    currentIndex: number
    totalCount: number
    canUndo: boolean
    canRedo: boolean
  } {
    const history = this.getHistoryFromStorage()
    return {
      currentIndex: this.currentIndex,
      totalCount: history.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    }
  }
}
