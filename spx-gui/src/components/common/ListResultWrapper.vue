<!--
  Result Wrapper for list content, taking care of:
  - Loading
  - Error
  - Empty list
  Recommend to use together with [`useQuery`](@/utils/exception) hook.
-->

<script setup lang="ts" generic="T extends unknown[] | ByPage<unknown>">
import { computed, useSlots } from 'vue'
import type { QueryRet } from '@/utils/query'
import { UILoading, UIError, UIEmpty } from '@/components/ui'
import type { ByPage } from '@/apis/common'

const props = defineProps<{
  queryRet: QueryRet<T>
  height?: number
  /** Type of the list content */
  contentType?: 'project' | 'recording'
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

const slots = useSlots()
</script>

<template>
  <UILoading v-if="queryRet.isLoading.value" :mask="false" :style="extraStyle" />
  <UIError v-else-if="queryRet.error.value != null" :retry="queryRet.refetch" :style="extraStyle">
    {{ $t(queryRet.error.value.userMessage) }}
  </UIError>
  <template v-else-if="isEmpty">
    <template v-if="!!slots.empty">
      <slot name="empty" :style="extraStyle"></slot>
    </template>
    <UIEmpty v-else size="large" :style="extraStyle" :img="contentType === 'project' ? 'game' : undefined">
      <template v-if="contentType === 'project'">
        {{ $t({ en: 'No projects', zh: '没有项目' }) }}
      </template>
      <template v-else-if="contentType === 'recording'">
        {{ $t({ en: 'No recordings', zh: '没有录屏' }) }}
      </template>
      <template v-else>
        {{ $t({ en: 'No data', zh: '没有结果' }) }}
      </template>
    </UIEmpty>
  </template>
  <template v-else-if="queryRet.data.value != null">
    <slot :data="queryRet.data.value"></slot>
  </template>
</template>
