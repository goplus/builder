import { reactive } from 'vue'
import { nanoid } from 'nanoid'
import { Disposable } from '@/utils/disposable'
import { validateWidgetName } from '../common/asset-name'
import type { Stage } from '../stage'

export type BaseWidgetInits = {
  id?: string
  x?: number
  y?: number
  size?: number
  visible?: boolean
}

export type BaseRawWidgetConfig = Omit<BaseWidgetInits, 'id'> & {
  type?: string
  builder_id?: string
  name?: string
}

export class BaseWidget extends Disposable {
  id: string
  type: string

  private stage: Stage | null = null
  setStage(stage: Stage | null) {
    this.stage = stage
  }

  name: string
  setName(name: string) {
    const err = validateWidgetName(name, this.stage)
    if (err != null) throw new Error(`invalid name ${name}: ${err.en}`)
    this.name = name
  }

  x: number
  setX(x: number) {
    this.x = x
  }

  y: number
  setY(y: number) {
    this.y = y
  }

  size: number
  setSize(size: number) {
    this.size = size
  }

  visible: boolean
  setVisible(visible: boolean) {
    this.visible = visible
  }

  constructor(name: string, type: string, inits?: BaseWidgetInits) {
    super()
    this.name = name
    this.type = type
    this.x = inits?.x ?? 0
    this.y = inits?.y ?? 0
    this.size = inits?.size ?? 1
    this.visible = inits?.visible ?? false
    this.id = inits?.id ?? nanoid()
    return reactive(this) as this
  }

  static load({ builder_id: id, type, name, ...inits }: BaseRawWidgetConfig) {
    if (name == null) throw new Error('name expected for widget')
    if (type == null) throw new Error('type expected for widget')
    return new BaseWidget(name, type, { ...inits, id })
  }

  export(): BaseRawWidgetConfig {
    return {
      type: this.type,
      name: this.name,
      x: this.x,
      y: this.y,
      size: this.size,
      visible: this.visible,
      builder_id: this.id
    }
  }
}
