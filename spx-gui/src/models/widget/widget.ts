import { reactive } from 'vue'
import { Disposable } from '@/utils/disposable'
import { validateWidgetName } from '../common/asset-name'
import type { Stage } from '../stage'
import { nanoid } from 'nanoid'

export type BaseWidgetInits = {
  id?: string
  x?: number
  y?: number
  size?: number
  visible?: boolean
}

export type BaseRawWidgetConfig = Omit<BaseWidgetInits, 'id'> & {
  builder_id?: string
  name?: string
}

export class BaseWidget extends Disposable {
  id: string

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

  constructor(name: string, inits?: BaseWidgetInits) {
    super()
    this.name = name
    this.x = inits?.x ?? 0
    this.y = inits?.y ?? 0
    this.size = inits?.size ?? 1
    this.visible = inits?.visible ?? false
    this.id = inits?.id ?? nanoid()
    return reactive(this) as this
  }

  static load({ builder_id: id, name, ...inits }: BaseRawWidgetConfig) {
    if (name == null) throw new Error('name expected for widget')
    return new BaseWidget(name, { ...inits, id })
  }

  export(): BaseRawWidgetConfig {
    return {
      name: this.name,
      x: this.x,
      y: this.y,
      size: this.size,
      visible: this.visible,
      builder_id: this.id
    }
  }
}
