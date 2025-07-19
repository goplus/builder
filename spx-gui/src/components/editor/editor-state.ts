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
import type { UserInfo } from '@/stores/user/signed-in'
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

export class EditorState extends Disposable {
  constructor(
    private project: Project,
    isOnline: WatchSource<boolean>,
    userInfo: WatchSource<UserInfo | null>,
    localCacheKey: string,
    localStorage?: editing.LocalStorage
  ) {
    super()
    this.addDisposable((this.runtime = new Runtime(project)))
    this.addDisposable((this.editing = new editing.Editing(project, isOnline, userInfo, localCacheKey, localStorage)))
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
  private selectedTypeRef = ref<SelectedType>('sprite')
  private selectedSpriteIdRef = ref<string | null>(null)
  private selectedSoundIdRef = ref<string | null>(null)

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
    const [segment, extra] = shiftPath(path)
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
    const selected = this.selected
    switch (selected.type) {
      case 'stage':
        return ['stage', ...this.stageState.getRoute()]
      case 'sprite': {
        const sprite = selected.sprite
        if (sprite == null || this.spriteState == null) return ['sprites']
        return ['sprites', sprite.name, ...this.spriteState.getRoute()]
      }
      case 'sound': {
        const sound = selected.sound
        if (sound == null) return ['sounds']
        return ['sounds', sound.name]
      }
    }
  }

  private updateRouter(router: IRouter, replace: boolean) {
    const routePath = this.getRoute()
    const currentRoute = router.currentRoute.value
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
          const inEditorPath = currentRoute.params.inEditorPath
          const inEditorSections = typeof inEditorPath === 'string' ? [inEditorPath] : inEditorPath ?? []
          this.selectByRoute(inEditorSections)
        },
        { immediate: true }
      )
    )

    // Sync from selected state to router
    this.addDisposer(
      watch(
        () => this.selected,
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
