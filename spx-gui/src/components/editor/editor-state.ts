import { ref, watch, type Ref, type WatchSource } from 'vue'
import type { RouteLocationAsRelativeGeneric, RouteLocationNormalizedGeneric } from 'vue-router'
import { shiftPath, type PathSegments } from '@/utils/route'
import { Disposable } from '@/utils/disposable'
import type { ResourceModel } from '@/models/common/resource-model'
import type { Project } from '@/models/project'
import { Stage } from '@/models/stage'
import { Sprite } from '@/models/sprite'
import { Sound } from '@/models/sound'
import { Backdrop } from '@/models/backdrop'
import { isWidget } from '@/models/widget'
import { Costume } from '@/models/costume'
import { Animation } from '@/models/animation'
import { StageEditorState, type Selected as StageEditorSelected } from './stage/StageEditor.vue'
import { SpriteEditorState, type Selected as SpriteEditorSelected } from './sprite/SpriteEditor.vue'
import { Runtime } from './runtime'
import * as editing from './editing'

export type SelectedType = 'stage' | 'sprite' | 'sound'

export type Selected =
  | {
      type: 'stage'
      stageSelected: StageEditorSelected
    }
  | {
      type: 'sprite'
      sprite: Sprite | null
      spriteSelected: SpriteEditorSelected | null
    }
  | {
      type: 'sound'
      sound: Sound | null
    }

export interface IRouter {
  currentRoute: Ref<Pick<RouteLocationNormalizedGeneric, 'fullPath' | 'params' | 'query' | 'hash'>>
  push(to: RouteLocationAsRelativeGeneric): Promise<unknown>
}

export enum EditMode {
  Default = 'default',
  Map = 'map'
}

export class EditorState extends Disposable {
  constructor(
    private project: Project,
    isOnline: WatchSource<boolean>,
    signedInUsername: WatchSource<string | null>,
    localCacheKey: string,
    localStorage?: editing.LocalStorage
  ) {
    super()
    this.addDisposable((this.runtime = new Runtime(project)))
    this.addDisposable(
      (this.editing = new editing.Editing(project, isOnline, signedInUsername, localCacheKey, localStorage))
    )
    this.addDisposable((this.stageState = new StageEditorState(() => project.stage)))

    this.addDisposer(() => this.spriteState?.dispose())

    this.addDisposer(
      watch(
        () => this.selected,
        (selected) => {
          if (selected.type === 'sprite' && selected.sprite == null && this.project.sprites.length > 0) {
            this.select({ type: 'sprite', id: this.project.sprites[0].id })
          }
          if (selected.type === 'sound' && selected.sound == null && this.project.sounds.length > 0) {
            this.select({ type: 'sound', id: this.project.sounds[0].id })
          }
        },
        { immediate: true }
      )
    )
  }

  runtime: Runtime
  editing: editing.Editing
  stageState: StageEditorState
  spriteState: SpriteEditorState | null = null
  private selectedEditModeRef = ref<EditMode>(EditMode.Default)
  private selectedTypeRef = ref<SelectedType>('sprite')
  private selectedSpriteIdRef = ref<string | null>(null)
  private selectedSoundIdRef = ref<string | null>(null)

  get selectedEditMode() {
    return this.selectedEditModeRef.value
  }

  get selectedSprite() {
    if (this.selectedTypeRef.value !== 'sprite') return null
    return this.project.sprites.find((s) => s.id === this.selectedSpriteIdRef.value) ?? null
  }

  get selectedCostume() {
    if (this.selectedTypeRef.value !== 'sprite' || this.spriteState == null) return null
    return this.spriteState.selectedCostume
  }

  get selectedAnimation() {
    if (this.selectedTypeRef.value !== 'sprite' || this.spriteState == null) return null
    return this.spriteState.selectedAnimation
  }

  get selectedSound() {
    if (this.selectedTypeRef.value !== 'sound') return null
    return this.project.sounds.find((s) => s.id === this.selectedSoundIdRef.value) ?? null
  }

  get selectedWidget() {
    if (this.selectedTypeRef.value !== 'stage') return null
    return this.stageState.selectedWidget
  }

  get selectedBackdrop() {
    if (this.selectedTypeRef.value !== 'stage') return null
    return this.stageState.selectedBackdrop
  }

  /** The current selection */
  get selected(): Selected {
    switch (this.selectedTypeRef.value) {
      case 'stage':
        return { type: 'stage', stageSelected: this.stageState.selected }
      case 'sound':
        return { type: 'sound', sound: this.selectedSound }
      case 'sprite': {
        const sprite = this.selectedSprite
        if (sprite == null || this.spriteState == null) return { type: 'sprite', sprite: null, spriteSelected: null }
        return { type: 'sprite', sprite, spriteSelected: this.spriteState.selected }
      }
      default:
        throw new Error(`Unknown selected type: ${this.selectedTypeRef.value}`)
    }
  }

  selectEditMode(editMode: EditMode) {
    this.selectedEditModeRef.value = editMode
  }

  select(target: { type: 'stage' } | { type: 'sprite'; id?: string | null } | { type: 'sound'; id?: string | null }) {
    switch (target.type) {
      case 'stage':
        this.selectedTypeRef.value = 'stage'
        break
      case 'sprite':
        this.selectedTypeRef.value = 'sprite'
        if (target.id != null && target.id !== this.selectedSpriteIdRef.value) {
          let prevSelected: SpriteEditorSelected | undefined
          if (this.spriteState != null) {
            prevSelected = this.spriteState?.selected
            this.spriteState.dispose()
          }
          this.selectedSpriteIdRef.value = target.id
          if (this.selectedSprite == null) {
            this.spriteState = null
            return
          }
          const getSprite = () => this.project.sprites.find((s) => s.id === target.id) ?? null
          this.spriteState = new SpriteEditorState(getSprite, prevSelected)
        }
        break
      case 'sound':
        this.selectedTypeRef.value = 'sound'
        if (target.id != null && target.id !== this.selectedSoundIdRef.value) {
          this.selectedSoundIdRef.value = target.id
        }
        break
      default:
        throw new Error(`Unknown target type: ${(target as any).type}`)
    }
  }

  selectByName(
    target: { type: 'stage' } | { type: 'sprite'; name?: string | null } | { type: 'sound'; name?: string | null }
  ) {
    switch (target.type) {
      case 'stage':
        this.select({ type: 'stage' })
        break
      case 'sprite': {
        const id = this.project.sprites.find((s) => s.name === target.name)?.id ?? null
        this.select({ type: 'sprite', id })
        break
      }
      case 'sound': {
        const id = this.project.sounds.find((s) => s.name === target.name)?.id ?? null
        this.select({ type: 'sound', id })
        break
      }
      default:
        throw new Error(`Unknown target type: ${(target as any).type}`)
    }
  }

  selectSprite(spriteId: string) {
    this.select({ type: 'sprite', id: spriteId })
  }

  selectSound(soundId: string) {
    this.select({ type: 'sound', id: soundId })
  }

  selectWidget(widgetId: string) {
    this.select({ type: 'stage' })
    this.stageState.selectWidget(widgetId)
  }

  selectBackdrop(backdropId: string) {
    this.select({ type: 'stage' })
    this.stageState.selectBackdrop(backdropId)
  }

  selectCostume(spriteId: string, costumeId: string) {
    this.select({ type: 'sprite', id: spriteId })
    if (this.spriteState == null) throw new Error('Sprite state expected')
    this.spriteState.selectCostume(costumeId)
  }

  selectAnimation(spriteId: string, animationId: string) {
    this.select({ type: 'sprite', id: spriteId })
    if (this.spriteState == null) throw new Error('Sprite state expected')
    this.spriteState.selectAnimation(animationId)
  }

  selectResource(resource: ResourceModel) {
    if (resource instanceof Sprite) return this.select({ type: 'sprite', id: resource.id })
    if (resource instanceof Sound) return this.select({ type: 'sound', id: resource.id })
    if (resource instanceof Stage) return this.select({ type: 'stage' })
    if (resource instanceof Backdrop) return this.selectBackdrop(resource.id)
    if (isWidget(resource)) return this.selectWidget(resource.id)
    if (resource instanceof Costume) {
      if (!(resource.parent instanceof Sprite)) throw new Error('Expect costume in a sprite')
      return this.selectCostume(resource.parent.id, resource.id)
    }
    if (resource instanceof Animation) {
      if (resource.sprite == null) throw new Error('Expect animation in a sprite')
      return this.selectAnimation(resource.sprite.id, resource.id)
    }
  }

  private selectByRoute(path: PathSegments) {
    let [segment, extra] = shiftPath(path)

    switch (segment) {
      // Temporarily retain `sounds` and `stage` routes for `map` mode.
      // Although this deviates from the plan (where `map` mode only supports `sprites`),
      // it is done to minimize the complexity of handling additional route redirects.
      // For instance, navigating from `Sound` to `Map` might otherwise cause the history stack to shift from `map/sound` to `map/sprites/default/code`,
      // increasing the cost of stack maintenance.
      case EditMode.Map:
        this.selectEditMode(EditMode.Map)
        break
      default:
        this.selectEditMode(EditMode.Default)
        break
    }

    if (this.selectedEditMode !== EditMode.Default) {
      ;[segment, extra] = shiftPath(extra)
    }

    switch (segment) {
      case 'stage':
        this.select({ type: 'stage' })
        this.stageState.selectByRoute(extra)
        return
      case 'sounds': {
        const [soundName] = shiftPath(extra)
        this.selectByName({ type: 'sound', name: soundName })
        return
      }
      case 'sprites':
      default: {
        const [spriteName, inSpriteRoute] = shiftPath(extra)
        this.selectByName({ type: 'sprite', name: spriteName })
        this.spriteState?.selectByRoute(inSpriteRoute)
        return
      }
    }
  }

  private getRoute(): PathSegments {
    const pathSegments = []
    const selected = this.selected
    const editMode = this.selectedEditMode

    if (editMode !== EditMode.Default) {
      pathSegments.push(editMode)
    }

    switch (selected.type) {
      case 'stage':
        pathSegments.push('stage', ...this.stageState.getRoute())
        break
      case 'sprite': {
        const sprite = selected.sprite
        pathSegments.push('sprites')
        if (sprite != null && this.spriteState != null) {
          pathSegments.push(sprite.name, ...this.spriteState.getRoute())
        }
        break
      }
      case 'sound': {
        const sound = selected.sound
        pathSegments.push('sounds')
        if (sound != null) {
          pathSegments.push(sound.name)
        }
        break
      }
    }

    return pathSegments
  }

  private updateRouter(router: IRouter, replace: boolean) {
    const routePath = this.getRoute()
    const currentRoute = router.currentRoute.value

    // Vue Router currently calculates the scroll position on every router.push navigation,
    // which triggers layout recalculations that can negatively impact performance.
    // See details in https://github.com/vuejs/router/issues/2393.
    // TODO: We need to monitor the issue and update Vue Router when it is fixed.

    // Vue Router checks if we are already on the same route, and prevents redundant navigation.
    // So we do not need to check it manually to avoid infinite loops.
    router.push({
      params: {
        ...currentRoute.params,
        inEditorPath: routePath
      },
      query: currentRoute.query,
      replace
    })
  }

  syncWithRouter(router: IRouter) {
    // Sync from router to selected state
    this.addDisposer(
      watch(
        router.currentRoute,
        (currentRoute) => {
          const { inEditorPath, projectName } = currentRoute.params
          if (projectName !== this.project.name) return // if project changed, do nothing. new `EditorState` instance will be constructed
          const inEditorSections = typeof inEditorPath === 'string' ? [inEditorPath] : inEditorPath ?? []
          this.selectByRoute(inEditorSections)
        },
        { immediate: true }
      )
    )

    // Sync from selected state to router
    this.addDisposer(
      watch(
        // Why watch?
        // We can switch to map without watching, but we need the map route in the history stack.
        // This requires responding to changes in `selectedEditMode`.
        // Scenario: Sound -> Stage -> Map -> Click Back.
        // With watch: Back to Stage. Without watch: Back to Sound.
        () => [this.selected, this.selectedEditMode],
        (_, __, onCleanup) => {
          // If `selected` changes, push new route
          this.updateRouter(router, false)
          onCleanup(
            watch(
              () => this.getRoute(),
              // If route changes without `selected` changing, replace current route
              () => this.updateRouter(router, true)
            )
          )
        },
        { immediate: true }
      )
    )
  }
}
