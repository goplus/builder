<!--
  Result Wrapper for list content, taking care of:
  - Loading
  - Error
  - Empty list
  Recommend to use together with [`useQuery`](@/utils/exception) hook.
-->

<script setup lang="ts" generic="T extends unknown[] | ByPage<unknown>">
import { computed } from 'vue'
import type { QueryRet } from '@/utils/exception'
import { UILoading, UIError, UIEmpty } from '@/components/ui'
import type { ByPage } from '@/apis/common'

const props = defineProps<{
  queryRet: QueryRet<T>
  height?: number
}>()

const isEmpty = computed(() => {
  const data = props.queryRet.data.value
  if (data == null) return false
  if (Array.isArray(data)) return data.length === 0
  return data.data.length === 0
})

const extraStyle = computed(() => {
  return props.height != null ? { height: `${props.height}px` } : {}
})
</script>

<template>
  <UILoading v-if="queryRet.isLoading.value" :mask="false" :style="extraStyle" />
  <!-- TODO: support simpler UIError & UIEmpty? -->
  <UIError v-else-if="queryRet.error.value != null" :retry="queryRet.refetch" :style="extraStyle">
    {{ $t(queryRet.error.value.userMessage) }}
  </UIError>
  <UIEmpty v-else-if="isEmpty" size="large" :style="extraStyle" />
  <template v-else-if="queryRet.data.value != null">
    <slot :data="queryRet.data.value"></slot>
  </template>
</template>
