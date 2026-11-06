import { shallowRef } from 'vue'

/** Reactive availability of the Course editor's ruler tool. */
export class Ruler {
  private enabledRef = shallowRef(false)

  get enabled() {
    return this.enabledRef.value
  }

  enable() {
    this.enabledRef.value = true
  }

  disable() {
    this.enabledRef.value = false
  }
}
