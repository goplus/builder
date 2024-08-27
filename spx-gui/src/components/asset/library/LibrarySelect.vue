<template>
  <n-select
    v-model:value="value"
    :options="options"
    class="select"
    :placeholder="
      $t({
        en: 'Sort by',
        zh: '选择排序方式'
      })
    "
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { NSelect } from 'naive-ui'
import { useSearchCtx } from './SearchContextProvider.vue'
import { useI18n } from '@/utils/i18n'
import type { ListAssetParamOrderBy } from '@/apis/asset'

const { t } = useI18n()
const searchCtx = useSearchCtx()

const value = ref<string | null>(null)
const options = [
  {
    label: t({ en: 'Sort by time ascending', zh: '按时间升序排序' }),
    value: 'timeAsc'
  },
  {
    label: t({ en: 'Sort by time descending', zh: '按时间降序排序' }),
    value: 'timeDesc'
  },
  {
    label: t({ en: 'Sort by name ascending', zh: '按名称升序排序' }),
    value: 'nameAsc'
  },
  {
    label: t({ en: 'Sort by name descending', zh: '按名称降序排序' }),
    value: 'nameDesc'
  }
]
watch(value, (newValue) => {
  searchCtx.orderBy = newValue as ListAssetParamOrderBy
})
</script>
<style lang="scss" scoped></style>
