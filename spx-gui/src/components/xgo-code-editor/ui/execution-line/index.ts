import { shallowRef } from 'vue'
import type { Position } from '../../common'

export class ExecutionLineController {
  private positionRef = shallowRef<Position | null>(null)

  get position() {
    return this.positionRef.value
  }

  setPosition(position: Position | null) {
    this.positionRef.value = position
  }
}
