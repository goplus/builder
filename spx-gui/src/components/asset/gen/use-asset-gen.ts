import { shallowRef, watch, type Ref } from 'vue'
import { useI18n } from '@/utils/i18n'
import { AssetType } from '@/apis/asset'
import type { SpxProject } from '@/models/spx/project'
import type { AssetGenModel } from '@/models/spx/common/asset'
import { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { BackdropGen } from '@/models/spx/gen/backdrop-gen'

export function useAssetGen(project: SpxProject, type: Ref<AssetType>) {
  const i18n = useI18n()
  const assetGen = shallowRef<AssetGenModel | null>(null)

  function createAssetGen(t: AssetType): AssetGenModel | null {
    if (t === AssetType.Sprite) return new SpriteGen(i18n, project)
    if (t === AssetType.Backdrop) return new BackdropGen(i18n, project)
    return null
  }

  watch(
    type,
    (t, _, onCleanup) => {
      assetGen.value = createAssetGen(t)
      onCleanup(() => {
        assetGen.value?.cancel()
        assetGen.value?.dispose()
      })
    },
    { immediate: true }
  )

  /**
   * Prevent assetGen from being canceled & disposed automatically.
   * This is useful when the user chooses to collapse the generation process
   * and we need to keep the assetGen instance alive and related tasks running.
   */
  function keepAlive(gen: AssetGenModel) {
    if (assetGen.value !== gen) return
    assetGen.value = null
  }

  function reset(t: AssetType) {
    assetGen.value?.cancel()
    assetGen.value?.dispose()
    assetGen.value = createAssetGen(t)
  }

  return { assetGen, keepAlive, reset }
}
