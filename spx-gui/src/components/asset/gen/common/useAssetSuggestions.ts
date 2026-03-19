import { ref, shallowRef, watch } from 'vue'
import { debounce } from 'lodash'
import type { I18n } from '@/utils/i18n'
import { listAsset, Visibility, type AssetData, type AssetType } from '@/apis/asset'
import { ArtStyle, Perspective, ownerAll } from '@/apis/common'
import type { BackdropSettings, SpriteSettings } from '@/apis/aigc'
import {
  artStyleOptions,
  perspectiveOptions,
  spriteCategoryOptions,
  backdropCategoryOptions
} from './param-settings/data'

export function useAssetSuggestions(type: AssetType, keyword: () => string, enabled: () => boolean) {
  const suggestions = shallowRef<AssetData[]>([])
  // `isLoading` is not used for now, but we keep it here for potential future use (e.g., showing loading state in the UI).
  const isLoading = ref(false)
  const selected = shallowRef<AssetData | null>(null)
  let abortCtrl: AbortController | null = null

  const doSearch = debounce(async (kw: string) => {
    abortCtrl?.abort()
    const ctrl = new AbortController()
    abortCtrl = ctrl
    isLoading.value = true
    try {
      const result = await listAsset({
        keyword: kw,
        type,
        pageSize: 4,
        pageIndex: 1,
        visibility: Visibility.Public,
        owner: ownerAll
      })
      if (ctrl.signal.aborted) return
      suggestions.value = result.data
      isLoading.value = false
    } catch {
      if (ctrl.signal.aborted) return
      suggestions.value = []
      isLoading.value = false
    }
  }, 500)

  watch(
    [keyword, enabled],
    ([kw, isEnabled]) => {
      if (!isEnabled || kw.trim() === '') {
        doSearch.cancel()
        abortCtrl?.abort()
        abortCtrl = null
        suggestions.value = []
        selected.value = null
        isLoading.value = false
        return
      }
      doSearch(kw.trim())
    },
    { immediate: true }
  )

  function toggle(asset: AssetData) {
    selected.value = selected.value?.id === asset.id ? null : asset
  }

  return { suggestions, isLoading, selected, toggle }
}

/**
 * Build a search keyword from gen settings.
 * Combines description with non-unspecified category/artStyle/perspective labels.
 */
// TODO: refine the keyword building logic.
export function buildGenSettingsKeyword(i18n: I18n, settings: SpriteSettings | BackdropSettings) {
  const desc = settings.description.trim()
  if (desc === '') return ''

  const parts: string[] = [desc]

  const categoryOption =
    spriteCategoryOptions.find((o) => o.value === settings.category) ??
    backdropCategoryOptions.find((o) => o.value === settings.category)
  if (categoryOption != null) {
    parts.push(i18n.t(categoryOption.label))
  }
  if (settings.artStyle != null && settings.artStyle !== ArtStyle.Unspecified) {
    const option = artStyleOptions.find((o) => o.value === settings.artStyle)
    if (option != null) parts.push(i18n.t(option.label))
  }
  if (settings.perspective != null && settings.perspective !== Perspective.Unspecified) {
    const option = perspectiveOptions.find((o) => o.value === settings.perspective)
    if (option != null) parts.push(i18n.t(option.label))
  }
  return parts.join(' ')
}
