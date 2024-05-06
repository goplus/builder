import { useModal } from '@/components/ui'
import { AssetType } from '@/apis/asset'
import type { Project } from '@/models/project'
import type { Backdrop } from '@/models/backdrop'
import type { Sound } from '@/models/sound'
import type { Sprite } from '@/models/sprite'
import { selectFile } from '@/utils/file'
import { parseScratchFileAssets } from '@/utils/scratch'
import AssetLibraryModal from './library/AssetLibraryModal.vue'
import AssetAddModal from './library/AssetAddModal.vue'
import LoadFromScratchModal from './scratch/LoadFromScratchModal.vue'
import type { AssetModel } from '@/models/common/asset'
import type { ComponentProps, ModalComponentProps } from '../ui/modal/UIModalProvider.vue'
import type { Component } from 'vue'

type Test<C extends Component> = ComponentProps<C> extends ModalComponentProps<infer R> ? R : never
type T = Test<typeof AssetLibraryModal>
export function useAddAssetFromLibrary() {
  const invokeAssetLibraryModal = useModal(AssetLibraryModal)
  return function addAssetFromLibrary<T extends AssetType>(project: Project, type: T) {
    return invokeAssetLibraryModal({ project, type }) as Promise<AssetModel<T>>
  }
}

export function useAddAssetToLibrary() {
  const invokeAddAssetModal = useModal(AssetAddModal)
  return function addAssetToLibrary(asset: Backdrop | Sound | Sprite) {
    return invokeAddAssetModal({ asset }) as Promise<void>
  }
}

export function useLoadFromScratchModal() {
  const invokeModal = useModal(LoadFromScratchModal)

  return async function loadFromScratchModal(project: Project) {
    const file = await selectFile({ accept: '.sb3' })
    const exportedScratchAssets = await parseScratchFileAssets(file)
    return invokeModal({ project, exportedScratchAssets }) as Promise<void>
  }
}
