import { ref, shallowRef, watch, type Ref, type ShallowRef } from 'vue'
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

export function useAssetSuggestions(
  type: AssetType,
  keyword: () => string,
  enabled: () => boolean
): {
  suggestions: ShallowRef<AssetData[]>
  isLoading: Ref<boolean>
  selected: ShallowRef<AssetData | null>
  toggle: (asset: AssetData) => void
} {
  const suggestions = shallowRef<AssetData[]>([])
  const isLoading = ref(false)
  const selected = shallowRef<AssetData | null>(null)

  const doSearch = debounce(async (keyword: string) => {
    isLoading.value = true
    try {
      const result = await listAsset({
        keyword,
        type,
        pageSize: 4,
        pageIndex: 1,
        visibility: Visibility.Public,
        owner: ownerAll
      })
      suggestions.value = result.data
    } catch {
      suggestions.value = []
    } finally {
      isLoading.value = false
    }
  }, 500)

  watch(
    [keyword, enabled],
    ([kw, isEnabled]) => {
      if (!isEnabled || kw.trim() === '') {
        doSearch.cancel()
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
