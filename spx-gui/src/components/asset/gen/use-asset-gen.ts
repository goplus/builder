import { type ShallowRef, shallowRef, watch, type Ref } from 'vue'
import { useI18n } from '@/utils/i18n'
import { AssetType } from '@/apis/asset'
import type { SpxProject } from '@/models/spx/project'
import type { AssetGenModel } from '@/models/spx/common/asset'
import { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { BackdropGen } from '@/models/spx/gen/backdrop-gen'

export function useAssetGen<T extends AssetType>(project: SpxProject, type: Ref<T | null>) {
  const i18n = useI18n()
  const assetGen = shallowRef(null) as ShallowRef<AssetGenModel<T> | null>

  function createAssetGen(t: AssetType) {
    if (t === AssetType.Sprite) return new SpriteGen(i18n, project)
    if (t === AssetType.Backdrop) return new BackdropGen(i18n, project)
    return null
  }

  watch(
    type,
    (t, _, onCleanup) => {
      assetGen.value = (t != null ? createAssetGen(t) : null) as AssetGenModel<T> | null
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
    assetGen.value = createAssetGen(t) as AssetGenModel<T> | null
  }

  return { assetGen, keepAlive, reset }
}
