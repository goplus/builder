import { computed, ref, watch, type Ref, type WatchSource } from 'vue'
import type { RouteLocationAsRelativeGeneric, RouteLocationNormalizedGeneric } from 'vue-router'
import { shiftPath, type PathSegments } from '@/utils/route'
import { Disposable } from '@/utils/disposable'
import type { I18n } from '@/utils/i18n'
import { CloudHelpers } from '@/models/common/cloud'
import type { Files } from '@/models/common/file'
import type { ResourceModel } from '@/models/spx/common/resource'
import type { SpxProject } from '@/models/spx/project'
import { Stage } from '@/models/spx/stage'
import { Sprite } from '@/models/spx/sprite'
import { Sound } from '@/models/spx/sound'
import { Backdrop } from '@/models/spx/backdrop'
import { isWidget } from '@/models/spx/widget'
import { Costume } from '@/models/spx/costume'
import { Animation } from '@/models/spx/animation'
import type { IProject, Metadata, ProjectSerialized } from '@/models/project'
import { StageEditorState, type Selected as StageEditorSelected } from './stage/StageEditor.vue'
import { SpriteEditorState, type Selected as SpriteEditorSelected } from './sprite/SpriteEditor.vue'
import { Runtime } from './runtime'
import * as editing from './editing'
import { History } from './history'
import { GenState } from './gen'

export type SelectedType = 'stage' | 'sprite'

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

export interface IRouter {
  currentRoute: Ref<Pick<RouteLocationNormalizedGeneric, 'fullPath' | 'params' | 'query' | 'hash'>>
  push(to: RouteLocationAsRelativeGeneric): Promise<unknown>
}

export enum EditMode {
  Default = 'default',
  Map = 'map'
}

class SpxProjectWithGens implements IProject {
  constructor(
    private project: SpxProject,
    private genState: GenState
  ) {}
  get mutex() {
    return this.project.mutex
  }
  get owner() {
    return this.project.owner
  }
  get name() {
    return this.project.name
  }
  setMetadata(metadata: Metadata) {
    return this.project.setMetadata(metadata)
  }
  private filesComputed = computed(() => {
    const files: Files = {}
    const projectFiles = this.project.exportFiles()
    Object.assign(files, projectFiles)
    const genFiles = this.genState.export()
    Object.assign(files, genFiles)
    return files
  })
  exportFiles() {
    return this.filesComputed.value
  }
  async loadFiles(files: Files): Promise<void> {
    await Promise.all([this.project.loadFiles(files), this.genState.load(files)])
  }
  async load({ metadata, files }: ProjectSerialized) {
    await Promise.all([this.project.load({ metadata, files }), this.genState.load(files)])
  }
  async export(signal?: AbortSignal): Promise<ProjectSerialized> {
    const files: Files = {}
    const { metadata, files: projectFiles } = await this.project.export(signal)
    Object.assign(files, projectFiles)
    const genFiles = this.genState.export()
    Object.assign(files, genFiles)
    return { metadata, files }
  }
}

export class EditorState extends Disposable {
  constructor(
    i18n: I18n,
    readonly project: SpxProject,
    isOnline: WatchSource<boolean>,
    signedInUsername: string | null,
    cloudHelpers: CloudHelpers,
    localCache: editing.ILocalCache
  ) {
    super()
    this.addDisposable((this.runtime = new Runtime(project)))
    this.history = new History(project)
    this.addDisposable((this.genState = new GenState(i18n, project)))
    const projectWithGens = new SpxProjectWithGens(project, this.genState)
    this.addDisposable(
      (this.editing = new editing.Editing(projectWithGens, cloudHelpers, localCache, isOnline, signedInUsername))
    )
    this.addDisposable(
      (this.stageState = new StageEditorState(
        () => project.stage,
        () => project.sounds
      ))
    )

    this.addDisposer(() => this.spriteState?.dispose())

    this.addDisposer(
      watch(
        () => this.selected,
        (selected) => {
          if (selected.type === 'sprite' && selected.sprite == null && this.project.sprites.length > 0) {
            this.select({ type: 'sprite', id: this.project.sprites[0].id })
          }
        },
        { immediate: true }
      )
    )
  }

  runtime: Runtime
  history: History
  genState: GenState
  editing: editing.Editing
  stageState: StageEditorState
  spriteState: SpriteEditorState | null = null

  private selectedEditModeRef = ref<EditMode>(EditMode.Default)
  private selectedTypeRef = ref<SelectedType>('sprite')
  private selectedSpriteIdRef = ref<string | null>(null)

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

  select(target: { type: 'stage' } | { type: 'sprite'; id?: string | null }) {
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
      default:
        throw new Error(`Unknown target type: ${(target as any).type}`)
    }
  }

  selectByName(target: { type: 'stage' } | { type: 'sprite'; name?: string | null }) {
    switch (target.type) {
      case 'stage':
        this.select({ type: 'stage' })
        break
      case 'sprite': {
        const id = this.project.sprites.find((s) => s.name === target.name)?.id ?? null
        this.select({ type: 'sprite', id })
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
    this.select({ type: 'stage' })
    this.stageState.selectSound(soundId)
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
    if (resource instanceof Sound) return this.selectSound(resource.id)
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
      // For instance, navigating from `sounds` to `map` might otherwise cause the history stack to shift from
      // `map/sounds` to `map/sprites/default/code`, increasing the cost of stack maintenance.
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
      // Backward compat: old top-level `sounds/…` routes → `stage/sounds/…`
      case 'sounds':
        this.select({ type: 'stage' })
        this.stageState.selectByRoute(['sounds', ...extra])
        return
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
        // Scenario: Sprite -> Stage -> Map -> Click Back.
        // With watch: Back to Stage. Without watch: Back to Sprite.
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
