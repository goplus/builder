<script setup lang="ts">
import { useAsyncComputed } from '@/utils/utils'
import type { Costume } from '@/models/costume'
import ParamSelector from './param-settings/ParamSelector.vue'
import imgCostume from './param-settings/assets/costume.svg?raw'

const props = withDefaults(
  defineProps<{
    /** The selected costume ID */
    selectedId: string | null
    /** Available costumes to select from */
    costumes: Costume[]
    /** Whether to allow clearing the selection */
    clearable?: boolean
  }>(),
  {
    clearable: true
  }
)

const emit = defineEmits<{
  'update:selectedId': [id: string | null]
}>()

const options = useAsyncComputed((onCleanup) => {
  return Promise.all(
    props.costumes.map(async (c) => {
      const url = await c.img.url(onCleanup)
      return {
        value: c.id,
        label: { en: c.name, zh: c.name },
        image: url
      }
    })
  )
})

const placeholder = {
  label: { en: 'Reference costume', zh: '参考造型' },
  image: imgCostume
}
</script>

<template>
  <ParamSelector
    v-if="options != null"
    :name="{ en: 'Reference costume', zh: '参考造型' }"
    :tips="{ en: 'Please select the reference costume image', zh: '请选择参考造型图片' }"
    :options="options"
    :placeholder="placeholder"
    :clearable="clearable"
    :value="selectedId"
    @update:value="emit('update:selectedId', $event)"
  />
</template>
