import { ref, watch, type Ref } from 'vue'
import type { Sound } from '@/models/spx/sound'
import { Disposable } from '@/utils/disposable'
import { capture } from '@/utils/exception'
import { shiftPath, type PathSegments } from '@/utils/route'

export class SoundsEditorState extends Disposable {
  constructor(private getSounds: () => Sound[]) {
    super()
    this.selectedIdRef = ref(getSounds()[0]?.id ?? null)

    this.addDisposer(
      watch(
        () => [this.selected, this.getSounds()[0]?.id] as const,
        ([selected, firstSoundId]) => {
          if (selected == null && firstSoundId != null) {
            this.select(firstSoundId)
          }
        }
      )
    )
  }

  private selectedIdRef: Ref<string | null>

  /** The currently selected sound */
  get selected() {
    return this.getSounds().find((sound) => sound.id === this.selectedIdRef.value) ?? null
  }
  /** Select a target (by ID) */
  select(id: string | null) {
    this.selectedIdRef.value = id
  }
  /** Select a target (by name) */
  selectByName(name: string): void {
    const sound = this.getSounds().find((sound) => sound.name === name)
    if (sound == null) {
      capture(new Error(`Sound with name "${name}" not found`))
      return
    }
    this.select(sound.id)
  }
  /** Select a target (by specifying route path) */
  selectByRoute(path: PathSegments) {
    const [name] = shiftPath(path)
    if (name == null) return
    return this.selectByName(name)
  }
  /** Get route path for the current selection */
  getRoute(): PathSegments {
    if (this.selected == null) return []
    return [this.selected.name]
  }
}
