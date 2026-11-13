import { watch } from 'vue'
import type { OnCleanup } from '@/utils/disposable'
import { I18n } from '@/utils/i18n'
import type { SpxProject } from '@/models/spx/project'
import { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { BackdropGen } from '@/models/spx/gen/backdrop-gen'
import type { AssetGenModel } from '@/models/spx/common/asset'

export interface GenHelpers {
  isPersisted(gen: AssetGenModel): boolean
  persist(gen: AssetGenModel): void
  getPos(gen: AssetGenModel): Promise<{ x: number; y: number } | null>
}

/** Init a sprite-gen instance for asset generation modals, and handle its lifecycle properly. */
export function initSpriteGen(i18n: I18n, project: SpxProject, helpers: GenHelpers, onCleanup: OnCleanup) {
  const g = new SpriteGen(i18n, project)
  const unwatch = watch(
    () => g.isPreparePhase,
    (isPreparePhase) => {
      // Persist the gen when prepare phase is over, which means
      // the user has confirmed the basic settings and starts to generate the content.
      if (!isPreparePhase) helpers.persist(g)
    }
  )
  onCleanup(() => {
    unwatch()
    if (helpers.isPersisted(g)) return
    g.cancel()
    g.dispose()
  })
  return g
}

/** Init a backdrop-gen instance for asset generation modals, and handle its lifecycle properly. */
export function initBackdropGen(i18n: I18n, project: SpxProject, onCleanup: OnCleanup) {
  const g = new BackdropGen(i18n, project)
  onCleanup(() => {
    g.cancel()
    g.dispose()
  })
  return g
}
