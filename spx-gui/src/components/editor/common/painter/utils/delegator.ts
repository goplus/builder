import paper from 'paper'

// 工具类型定义
export type ToolType = 'line' | 'brush' | 'reshape' | 'eraser' | 'rectangle' | 'circle' | 'fill' | 'text'

// 事件类型定义
export type EventType = 'click' | 'mousedown' | 'mousemove' | 'mouseup' | 'drag'

// 点位置接口
export interface Point {
  x: number
  y: number
}

// 工具处理器接口
export interface ToolHandler {
  handleCanvasClick?: (point: Point | paper.Point) => void
  handleClick?: (point: Point | paper.Point) => void
  handleMouseDown?: (point: Point | paper.Point) => void
  handleMouseMove?: (point: Point | paper.Point) => void
  handleMouseDrag?: (point: Point | paper.Point) => void
  handleMouseUp?: (point: Point | paper.Point) => void
}

// 工具引用映射
export interface ToolRefs {
  line?: ToolHandler
  brush?: ToolHandler
  reshape?: ToolHandler
  eraser?: ToolHandler
  rectangle?: ToolHandler
  circle?: ToolHandler
  fill?: ToolHandler
  text?: ToolHandler
}

/**
 * 画布事件委托器
 * 负责根据当前选中的工具和事件类型，将事件分发给对应的工具处理器
 */
export class CanvasEventDelegator {
  private toolRefs: ToolRefs = {}
  private currentTool: ToolType | null = null

  /**
   * 设置工具引用
   */
  setToolRefs(refs: ToolRefs): void {
    this.toolRefs = refs
  }

  /**
   * 设置当前工具
   */
  setCurrentTool(tool: ToolType | null): void {
    this.currentTool = tool
  }

  /**
   * 获取当前工具
   */
  getCurrentTool(): ToolType | null {
    return this.currentTool
  }

  /**
   * 将鼠标事件坐标转换为画布坐标
   */
  private getCanvasPoint(event: MouseEvent, canvasRef: HTMLCanvasElement | null): paper.Point | null {
    if (!canvasRef) return null
    
    const rect = canvasRef.getBoundingClientRect()
    return new paper.Point(
      event.clientX - rect.left,
      event.clientY - rect.top
    )
  }

  /**
   * 委托画布点击事件
   */
  delegateClick(event: MouseEvent, canvasRef: HTMLCanvasElement | null): void {
    console.log('delegateClick', this.currentTool)
    if (!this.currentTool) return
    
    const point = this.getCanvasPoint(event, canvasRef)
    if (!point) return

    const handler = this.toolRefs[this.currentTool]
    if (!handler) return

    // 优先调用 handleCanvasClick，如果不存在则调用 handleClick
    if (handler.handleCanvasClick) {
      // line 工具需要 {x, y} 格式
      if (this.currentTool === 'line') {
        handler.handleCanvasClick({ x: point.x, y: point.y })
      } else {
        handler.handleCanvasClick(point)
      }
    } else if (handler.handleClick) {
      handler.handleClick(point)
    }
  }

  /**
   * 委托鼠标按下事件
   */
  delegateMouseDown(event: MouseEvent, canvasRef: HTMLCanvasElement | null): void {
    if (!this.currentTool) return
    
    const point = this.getCanvasPoint(event, canvasRef)
    if (!point) return

    const handler = this.toolRefs[this.currentTool]
    if (!handler?.handleMouseDown) return

    // brush 工具需要 {x, y} 格式，其他工具使用 paper.Point
    if (this.currentTool === 'brush') {
      handler.handleMouseDown({ x: point.x, y: point.y })
    } else {
      handler.handleMouseDown(point)
    }
  }

  /**
   * 委托鼠标移动事件
   */
  delegateMouseMove(event: MouseEvent, canvasRef: HTMLCanvasElement | null): void {
    if (!this.currentTool) return
    
    const point = this.getCanvasPoint(event, canvasRef)
    if (!point) return

    const handler = this.toolRefs[this.currentTool]
    if (!handler) return

    // 根据工具类型调用不同的处理方法
    if (this.currentTool === 'line' && handler.handleMouseMove) {
      handler.handleMouseMove({ x: point.x, y: point.y })
    } else if (this.currentTool === 'brush' && handler.handleMouseDrag) {
      handler.handleMouseDrag({ x: point.x, y: point.y })
    } else if (this.currentTool === 'reshape' && handler.handleMouseMove) {
      handler.handleMouseMove(point)
    } else if (this.currentTool === 'circle' && handler.handleMouseMove) {
      handler.handleMouseMove(point)
    }
  }

  /**
   * 委托鼠标释放事件
   */
  delegateMouseUp(event: MouseEvent, canvasRef: HTMLCanvasElement | null): void {
    if (!this.currentTool) return
    
    const point = this.getCanvasPoint(event, canvasRef)
    if (!point) return

    const handler = this.toolRefs[this.currentTool]
    if (!handler?.handleMouseUp) return

    // brush 工具需要 {x, y} 格式，其他工具使用 paper.Point
    if (this.currentTool === 'brush') {
      handler.handleMouseUp({ x: point.x, y: point.y })
    } else {
      handler.handleMouseUp(point)
    }
  }

  /**
   * 委托全局鼠标释放事件（不需要坐标）
   */
  delegateGlobalMouseUp(): void {
    if (!this.currentTool) return
    
    const handler = this.toolRefs[this.currentTool]
    if (!handler?.handleMouseUp) return

    // reshape 工具的全局鼠标释放事件
    if (this.currentTool === 'reshape') {
      handler.handleMouseUp
    }
  }

  /**
   * 通用事件委托方法
   * @param eventType 事件类型
   * @param event 鼠标事件
   * @param canvasRef 画布引用
   */
  delegate(eventType: EventType, event: MouseEvent, canvasRef: HTMLCanvasElement | null): void {
    switch (eventType) {
      case 'click':
        this.delegateClick(event, canvasRef)
        break
      case 'mousedown':
        this.delegateMouseDown(event, canvasRef)
        break
      case 'mousemove':
        this.delegateMouseMove(event, canvasRef)
        break
      case 'mouseup':
        this.delegateMouseUp(event, canvasRef)
        break
      default:
        console.warn(`未支持的事件类型: ${eventType}`)
    }
  }

  /**
   * 检查工具是否支持特定事件
   */
  supportsEvent(tool: ToolType, eventType: EventType): boolean {
    const handler = this.toolRefs[tool]
    if (!handler) return false

    switch (eventType) {
      case 'click':
        return !!(handler.handleCanvasClick || handler.handleClick)
      case 'mousedown':
        return !!handler.handleMouseDown
      case 'mousemove':
        return !!(handler.handleMouseMove || handler.handleMouseDrag)
      case 'mouseup':
        return !!handler.handleMouseUp
      default:
        return false
    }
  }

  /**
   * 获取所有支持的工具类型
   */
  getSupportedTools(): ToolType[] {
    return Object.keys(this.toolRefs) as ToolType[]
  }

  /**
   * 清除所有工具引用
   */
  clearToolRefs(): void {
    this.toolRefs = {}
  }
}

// 创建单例实例
export const canvasEventDelegator = new CanvasEventDelegator()

// 默认导出
export default canvasEventDelegator