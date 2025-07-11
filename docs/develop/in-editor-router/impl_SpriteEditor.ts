import { Sprite, shiftSegment } from './base'
import { SpriteAnimationsState } from './module_AnimationsEditor'
import { SpriteCostumesState } from './module_CostumesEditor'

type Selected = {
  type: 'code'
} | {
  type: 'costumes'
  state: SpriteCostumesState
} | {
  type: 'animations'
  state: SpriteAnimationsState
}

export class SpriteState {

  private selectedType: 'code' | 'costumes' | 'animations' = 'code'
  private costumesState = new SpriteCostumesState(this.sprite)
  private animationsState = new SpriteAnimationsState(this.sprite)

  get selected(): Selected {
    switch (this.selectedType) {
      case 'code':
        return { type: 'code' }
      case 'costumes':
        return { type: 'costumes', state: this.costumesState }
      case 'animations':
        return { type: 'animations', state: this.animationsState }
    }
  }

  select(type: 'code' | 'costumes' | 'animations') {
    this.selectedType = type
  }

  selectByRoute(path: string) {
    const [type, extra] = shiftSegment(path)
    switch (type) {
      case 'code':
        this.select('code')
        break
      case 'costumes':
        this.select('costumes')
        this.costumesState.selectByRoute(extra)
        break
      case 'animations':
        this.select('animations')
        this.animationsState.selectByRoute(extra)
        break
      default:
        throw new Error(`Unknown sprite state type: ${type}`)
    }
  }

  getRoute(): string {
    switch (this.selected.type) {
      case 'code':
        return 'code'
      case 'costumes':
        return `costumes/${this.costumesState.getRoute()}`
      case 'animations':
        return `animations/${this.animationsState.getRoute()}`
    }
  }

  constructor(private sprite: Sprite) {}
}


function SpriteEditor(props: {
  state: SpriteState
}) {
  const state = props.state
  function handleTabSelect(type: 'code' | 'costumes' | 'animations') {
    props.state.select(type)
  }

  const selected = state.selected
  if (selected.type === 'code') {
    return `<CodeEditor />`
  } else if (selected.type === 'costumes') {
    return `<CostumesEditor state="${selected.state}" />`
  } else if (selected.type === 'animations') {
    return `<AnimationsEditor state="${selected.state}" />`
  } else {
    return `<div>Unknown selected type</div>`
  }
}
