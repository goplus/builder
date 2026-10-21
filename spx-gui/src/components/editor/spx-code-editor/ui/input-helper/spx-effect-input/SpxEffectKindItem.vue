<script lang="ts">
function getSpxEffectImage(name: string) {
  return new URL(`./${name}.png`, import.meta.url).href
}
</script>

<script lang="ts" setup>
import { computed } from 'vue'

import { effectKinds } from '@/utils/spx'
import { UIBlockItem, UIBlockItemTitle, UIImg } from '@/components/ui'

const props = defineProps<{ name: string }>()

const item = computed(() => {
  const findItem = effectKinds.find(({ name }) => name === props.name)
  if (!findItem) {
    throw new Error(`${props.name} is not a defined effect kind`)
  }
  return findItem
})

const imgStyle = {
  marginTop: '2px',
  marginBottom: '4px',
  height: '40px',
  width: '40px'
}
</script>

<template>
  <UIBlockItem size="medium">
    <UIImg :style="imgStyle" :src="getSpxEffectImage(item.name)" />
    <UIBlockItemTitle size="medium" :title="$t(item.text)">
      {{ $t(item.text) }}
    </UIBlockItemTitle>
  </UIBlockItem>
</template>
