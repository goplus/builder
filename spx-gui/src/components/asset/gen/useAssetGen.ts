import { computed, shallowRef, watch, type Ref } from 'vue'
import type { I18n } from '@/utils/i18n'
import { AssetType } from '@/apis/asset'
import type { SpxProject } from '@/models/spx/project'
import type { AssetGenModel } from '@/models/spx/common/asset'
import { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { BackdropGen } from '@/models/spx/gen/backdrop-gen'

export async function addAssetGenResultToProject(gen: AssetGenModel, project: SpxProject) {
  if (gen instanceof SpriteGen) {
    const sprite = gen.result
    if (sprite == null) throw new Error('sprite generation not finished')
    project.addSprite(sprite)
    await sprite.autoFit()
    return sprite
  } else if (gen instanceof BackdropGen) {
    const backdrop = gen.result
    if (backdrop == null) throw new Error('backdrop generation not finished')
    project.stage.addBackdrop(backdrop)
    return backdrop
  }
  throw new Error('unknown asset type')
}

export function useAssetGen(i18n: I18n, project: SpxProject, type: Ref<AssetType>) {
  const assetGen = shallowRef<AssetGenModel | null>(null)

  function createAssetGen(t: AssetType) {
    return {
      [AssetType.Sound]: null,
      [AssetType.Sprite]: new SpriteGen(i18n, project),
      [AssetType.Backdrop]: new BackdropGen(i18n, project)
    }[t]
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
   * Whether the generation process can be canceled (i.e., is still in the prepare phase).
   */
  const cancellable = computed(() => assetGen.value?.isPreparePhase ?? false)

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

  return { assetGen, cancellable, keepAlive, reset }
}
