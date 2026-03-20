import { ref, shallowRef, watch, type WatchSource } from 'vue'
import { debounce } from 'lodash'
import { listAsset, Visibility, type AssetData, type AssetType } from '@/apis/asset'
import { ownerAll } from '@/apis/common'

export function useAssetSuggestions(type: AssetType, keyword: WatchSource<string>, enabled: WatchSource<boolean>) {
  const suggestions = shallowRef<AssetData[]>([])
  const isLoading = ref(false)
  const selected = shallowRef<AssetData | null>(null)
  let abortCtrl: AbortController | null = null

  const doSearch = debounce(async (kw: string) => {
    abortCtrl?.abort()
    const ctrl = new AbortController()
    abortCtrl = ctrl
    isLoading.value = true
    try {
      const result = await listAsset(
        {
          keyword: kw,
          type,
          pageSize: 4,
          pageIndex: 1,
          visibility: Visibility.Public,
          owner: ownerAll
        },
        ctrl.signal
      )
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
      suggestions.value = []
      selected.value = null
      if (!isEnabled || kw.trim() === '') {
        doSearch.cancel()
        abortCtrl?.abort()
        abortCtrl = null
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
