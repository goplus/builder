import { ref, watch, type Ref } from 'vue'
import { debounce, throttle } from 'lodash'
import { RotationStyle, type Sprite } from '@/models/sprite'
import type { Action, Project } from '@/models/project'
import type { Widget } from '@/models/widget'
import { Disposable } from '@/utils/disposable'
import type { ConfigType } from './QuickConfigWrapper.vue'

interface ILocalConfigSetter {
  id: string
  setX(x: number): void
  setY(y: number): void
  setSize(size: number): void
}

export class LocalConfig extends Disposable {
  constructor(
    private likeLocalConfig: ILocalConfigSetter,
    protected project: Project,
    private action: Action
  ) {
    super()
    this.id = this.likeLocalConfig.id
  }

  id: string

  private configTypesRef: Ref<ConfigType[]> = ref(['default'])
  get configTypes() {
    return this.configTypesRef.value
  }
  updateConfigType = throttle(
    (configType: ConfigType | ConfigType[] = []) =>
      (this.configTypesRef.value = ['default' as ConfigType].concat(configType)),
    150
  )

  private xRef: Ref<number> = ref(0)
  get x() {
    return this.xRef.value
  }
  setX(x: number, updateConfigType = true) {
    this.xRef.value = x
    if (updateConfigType) this.updateConfigType('pos')
  }

  private yRef: Ref<number> = ref(0)
  get y() {
    return this.yRef.value
  }
  setY(y: number, updateConfigType = true) {
    this.yRef.value = y
    if (updateConfigType) this.updateConfigType('pos')
  }
  syncPos = this.doAction(() => (this.likeLocalConfig.setX(this.x), this.likeLocalConfig.setY(this.y)))

  private sizeRef: Ref<number> = ref(0)
  get size() {
    return this.sizeRef.value
  }
  setSize(size: number, updateConfigType = true) {
    this.sizeRef.value = size
    if (updateConfigType) this.updateConfigType('size')
  }
  syncSize = this.doAction(() => this.likeLocalConfig.setSize(this.size))

  protected doAction(updater: () => void, withDebounce = true) {
    const warpped = () => this.project.history.doAction(this.action, updater)
    return withDebounce ? debounce(warpped, 300) : warpped
  }
}

export class SpriteLocalConfig extends LocalConfig {
  constructor(
    private sprite: Sprite,
    project: Project
  ) {
    super(sprite, project, { name: { en: `Configure sprite ${sprite.name}`, zh: `修改精灵 ${sprite.name} 配置` } })
    this.addDisposer(
      watch(
        () => sprite.rotationStyle,
        (rotationStyle, old) => this.setRotationStyle(rotationStyle, old != null),
        { immediate: true }
      )
    )
    this.addDisposer(
      watch(
        () => sprite.x,
        (x, old) => this.setX(x, old != null),
        { immediate: true }
      )
    )
    this.addDisposer(
      watch(
        () => sprite.y,
        (y, old) => this.setY(y, old != null),
        { immediate: true }
      )
    )
    this.addDisposer(
      watch(
        () => sprite.heading,
        (heading, old) => this.setHeading(heading, old != null && this.rotationStyle === RotationStyle.Normal),
        { immediate: true }
      )
    )
    this.addDisposer(
      watch(
        () => sprite.size,
        (size, old) => this.setSize(size, old != null),
        { immediate: true }
      )
    )
  }

  private headingRef: Ref<number> = ref(0)
  get heading() {
    return this.headingRef.value
  }
  setHeading(heading: number, updateConfigType = true) {
    this.headingRef.value = heading
    if (updateConfigType) this.updateConfigType('rotate')
  }
  syncHeading = this.doAction(() => this.sprite.setHeading(this.heading))

  private rotationStyleRef: Ref<RotationStyle> = ref(RotationStyle.Normal)
  get rotationStyle() {
    return this.rotationStyleRef.value
  }
  setRotationStyle(rotationStyle: RotationStyle, updateConfigType = true) {
    this.rotationStyleRef.value = rotationStyle
    if (updateConfigType) this.updateConfigType()
  }
  syncRotationStyle = this.doAction(() => this.sprite.setRotationStyle(this.rotationStyle))

  syncToSprite(updater: (sprite: Sprite) => void) {
    return this.doAction(() => updater(this.sprite), false)()
  }
}

export class WidgetLocalConfig extends LocalConfig {
  constructor(
    private widget: Widget,
    project: Project
  ) {
    super(widget, project, { name: { en: `Configure widget ${widget.name}`, zh: `修改控件 ${widget.name} 配置` } })

    this.addDisposer(
      watch(
        () => widget.x,
        (x, old) => this.setX(x, old != null),
        { immediate: true }
      )
    )
    this.addDisposer(
      watch(
        () => widget.y,
        (y, old) => this.setY(y, old != null),
        { immediate: true }
      )
    )
    this.addDisposer(
      watch(
        () => widget.size,
        (size, old) => this.setSize(size, old != null),
        { immediate: true }
      )
    )
  }
}
