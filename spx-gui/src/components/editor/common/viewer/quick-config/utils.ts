import { ref, type Ref } from 'vue'
import { RotationStyle, type Sprite } from '@/models/spx/sprite'
import type { Action, History } from '@/components/editor/history'
import type { Widget } from '@/models/spx/widget'

interface ILocalConfigProvider {
  id: string

  get x(): number
  get y(): number
  get size(): number
  get visible(): boolean

  setX(x: number): void
  setY(y: number): void
  setSize(size: number): void
}

interface LocalConfigChanges {
  x?: number
  y?: number
  size?: number
  visible?: boolean
}

export class LocalConfig<T = unknown> {
  constructor(
    private provider: ILocalConfigProvider,
    private history: History,
    private action: Action
  ) {}

  protected changes = ref({}) as Ref<LocalConfigChanges & Partial<T>>

  get id() {
    return this.provider.id
  }

  get x() {
    return this.changes.value.x ?? this.provider.x
  }
  setX(x: number) {
    this.changes.value.x = x
  }

  get y() {
    return this.changes.value.y ?? this.provider.y
  }
  setY(y: number) {
    this.changes.value.y = y
  }

  get size() {
    return this.changes.value.size ?? this.provider.size
  }
  setSize(size: number) {
    this.changes.value.size = size
  }

  get visible() {
    return this.provider.visible
  }

  sync() {
    this.history.doAction(this.action, () => {
      Object.keys(this.changes.value).forEach((key) => this.applyChanges(key))
      this.changes.value = {}
    })
  }

  protected applyChanges(key: string) {
    switch (key) {
      case 'x':
        this.provider.setX(this.x)
        break
      case 'y':
        this.provider.setY(this.y)
        break
      case 'size':
        this.provider.setSize(this.size)
        break
    }
  }
}

export class SpriteLocalConfig extends LocalConfig<{
  heading?: number
  rotationStyle?: RotationStyle
}> {
  constructor(
    private sprite: Sprite,
    history: History
  ) {
    super(sprite, history, { name: { en: `Configure sprite ${sprite.name}`, zh: `修改精灵 ${sprite.name} 配置` } })
  }

  get heading() {
    return this.changes.value.heading ?? this.sprite.heading
  }
  setHeading(heading: number) {
    this.changes.value.heading = heading
  }

  get rotationStyle() {
    return this.changes.value.rotationStyle ?? this.sprite.rotationStyle
  }
  setRotationStyle(rotationStyle: RotationStyle) {
    this.changes.value.rotationStyle = rotationStyle
  }

  get defaultCostume() {
    return this.sprite.defaultCostume
  }

  override applyChanges(key: string) {
    super.applyChanges(key)
    switch (key) {
      case 'heading':
        this.sprite.setHeading(this.heading)
        break
      case 'rotationStyle':
        this.sprite.setRotationStyle(this.rotationStyle)
        break
    }
  }
}

export class WidgetLocalConfig extends LocalConfig {
  constructor(
    private widget: Widget,
    history: History
  ) {
    super(widget, history, { name: { en: `Configure widget ${widget.name}`, zh: `修改组件 ${widget.name} 配置` } })
  }

  get label() {
    return this.widget.label
  }

  get target() {
    return this.widget.target
  }

  get variableName() {
    return this.widget.variableName
  }
}
