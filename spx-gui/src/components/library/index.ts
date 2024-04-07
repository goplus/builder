import { h } from 'vue'
import { useModal } from 'naive-ui'
import { useI18n } from '@/utils/i18n'
import { Cancelled } from '@/utils/exception'
import { AssetType, type AssetData } from '@/apis/asset'
import type { Project } from '@/models/project'
import type { Backdrop } from '@/models/backdrop'
import type { Sound } from '@/models/sound'
import type { Sprite } from '@/models/sprite'
import AssetLibrary from './AssetLibrary.vue'
import AssetAdd from './AssetAdd.vue'

export function useAddAssetFromLibrary() {
  const modalCtrl = useModal()
  const { t } = useI18n()

  return function addAssetFromLibrary(project: Project, type: AssetType): Promise<void> {
    return new Promise<void>((resolve) => {
      const modal = modalCtrl.create({
        title: t({ en: 'Asset Library', zh: '素材库' }),
        content: () => h(AssetLibrary, { type, project }),
        preset: 'dialog',
        onHide() {
          resolve()
          modal.destroy()
        }
      })
    })
  }
}

export function useAddAssetToLibrary() {
  const modalCtrl = useModal()
  const { t } = useI18n()

  return function addAssetToLibrary(asset: Backdrop | Sound | Sprite) {
    return new Promise<AssetData>((resolve, reject) => {
      const modal = modalCtrl.create({
        title: t({ en: 'Add asset to library', zh: '添加到素材库' }),
        content: () =>
          h(AssetAdd, {
            asset,
            onAdded(assetData) {
              resolve(assetData)
              modal.destroy()
            },
            onCancelled() {
              reject(new Cancelled())
              modal.destroy()
            }
          }),
        preset: 'dialog',
        onHide() {
          reject(new Cancelled())
          modal.destroy()
        }
      })
    })
  }
}
