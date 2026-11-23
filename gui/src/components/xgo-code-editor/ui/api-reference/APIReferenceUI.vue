<script setup lang="ts">
import { computed } from 'vue'
import { ActionException, Cancelled } from '@/utils/exception'
import { useRegisterLoading } from '@/utils/readiness'
import { UIError } from '@/components/ui'
import { stringifyDefinitionId } from '../../definition-id'
import type { APIReferenceController, APIReferenceItem } from '.'
import APIReferenceCategorized from './APIReferenceCategorized.vue'
import APIReferenceItemComp from './APIReferenceItem.vue'

const props = defineProps<{
  controller: APIReferenceController
  simpleMode?: boolean
  disabled?: boolean
}>()

const itemsForDisplay = computed<APIReferenceItem[]>((oldValue) => {
  // Keep browsing stable while loading; completed empty arrays still clear it.
  return props.controller.items ?? oldValue ?? []
})

const categorizationThreshold = 20
const needsCategorization = computed(
  () => itemsForDisplay.value.length >= categorizationThreshold && props.controller.categoryViewInfos != null
)

useRegisterLoading(() => props.controller.items == null && props.controller.error == null)

const err = computed(() => {
  const err = props.controller.error
  if (err == null) return null
  if (err instanceof Cancelled) return null
  return new ActionException(err, { en: 'Failed to load data', zh: '加载数据失败' })
})
</script>

<template>
  <section
    v-radar="{
      name: 'api-references',
      label: 'API References',
      desc: 'All available code snippets at left side of the code editor. Drag-n-drop or click one item to insert corresponding code snippet.'
    }"
    class="flex min-h-0 flex-col"
  >
    <APIReferenceCategorized
      v-if="needsCategorization"
      :controller="controller"
      :items="itemsForDisplay"
      :error="err"
      :simple-mode="simpleMode"
      :disabled="disabled"
    />
    <template v-else>
      <div class="flex-none px-3 py-2">
        <h4 class="text-sm font-medium text-title">{{ $t({ en: 'Code snippets', zh: '代码片段' }) }}</h4>
      </div>
      <UIError v-if="err != null">{{ $t(err.userMessage) }}</UIError>
      <ul
        v-else
        class="relative min-h-0 flex flex-[1_1_0] min-w-0 flex-col gap-md overflow-y-auto px-3 pt-3 pb-3 [scrollbar-width:thin]"
      >
        <APIReferenceItemComp
          v-for="item in itemsForDisplay"
          :key="stringifyDefinitionId(item.definition)"
          :item="item"
          :interaction-disabled="false"
          :block-style="simpleMode"
          :disabled="disabled"
        />
      </ul>
    </template>
  </section>
</template>
