import { Project, Router, Runtime, Sound, Sprite, shiftSegment, watch } from './base'
import { SpriteState } from './module_SpriteEditor'
import { StageState } from './module_StageEditor'

type Selected = {
  type: 'stage'
  state: StageState
} | {
  type: 'sprite'
  sprite: Sprite | null
  state: SpriteState | null
} | {
  type: 'sound'
  sound: Sound | null
}

class EditorState {

  private selectedType: 'stage' | 'sprite' | 'sound' = 'sprite'
  private selectedSpriteId: string | null = null
  private selectedSoundId: string | null = null
  private stageState = new StageState(this.project.stage)
  private spriteState: SpriteState | null = null

  get selectedSprite() {
    return this.project.sprites.find(s => s.id === this.selectedSpriteId) ?? null
  }

  get selectedSound() {
    return this.project.sounds.find(s => s.id === this.selectedSoundId) ?? null
  }

  get selected(): Selected {
    switch (this.selectedType) {
      case 'stage':
        return { type: 'stage', state: this.stageState }
      case 'sound':
        return { type: 'sound', sound: this.selectedSound }
      default:
        const sprite = this.selectedSprite
        if (sprite == null) return { type: 'sprite', sprite: null, state: null }
        return {
          type: 'sprite',
          sprite,
          state: this.spriteState
        }
    }
  }

  select(target: { type: 'stage' } | { type: 'sprite'; id: string } | { type: 'sound'; id: string }): void {
    switch (target.type) {
      case 'stage':
        this.selectedType = 'stage'
        break
      case 'sprite':
        this.selectedType = 'sprite'
        this.selectedSpriteId = target.id
        this.spriteState = new SpriteState(this.selectedSprite!)
        break
      case 'sound':
        this.selectedType = 'sound'
        this.selectedSoundId = target.id
        break
    }
  }

  selectByName(target: { type: 'stage' } | { type: 'sprite'; name: string } | { type: 'sound'; name: string }): void {
    switch (target.type) {
      case 'stage':
        this.select(target)
        break
      case 'sprite':
        const spriteId = this.project.sprites.find(s => s.name === target.name)?.id
        this.select({ type: 'sprite', id: spriteId! })
        break
      case 'sound':
        const soundId = this.project.sounds.find(s => s.name === target.name)?.id
        this.select({ type: 'sound', id: soundId! })
        break
    }
  }

  private selectByRoute(path: string) {
    const [segment, extra] = shiftSegment(path)
    switch (segment) {
      case 'stage':
        this.select({ type: 'stage' })
        return
      case 'sprites':
        const [spriteId, inSpriteRoute] = shiftSegment(extra)
        this.select({ type: 'sprite', id: spriteId })
        this.spriteState!.selectByRoute(inSpriteRoute)
        return
      case 'sounds':
        const [soundId] = shiftSegment(extra)
        this.select({ type: 'sound', id: soundId })
        return
    }
  }

  private getRoute(): string {
    switch (this.selected.type) {
      case 'stage':
        return 'stage'
      case 'sprite':
        return `sprites/${this.selectedSpriteId}/${this.spriteState!.getRoute()}`
      case 'sound':
        return `sounds/${this.selectedSoundId}`
    }
  }

  runtime = new Runtime()

  constructor(private project: Project, private router: Router) {
    this.selectByRoute(router.currentRoute.path)

    watch(() => this.getRoute(), (path) => {
      // TODO: we may want `replace` instead of `push` for resource renaming
      this.router.push(path)
    })
  }
}
