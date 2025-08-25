<template>
  <UIEditorSpriteItem v-radar="radarNodeMeta" :selectable="selectable" :name="costume.name" :color="color">
    <template #img="{ style }">
      <UIImg :style="style" :src="imgSrc" :loading="imgLoading" />
    </template>
    <UICornerIcon
      v-if="removable"
      v-radar="{ name: 'Remove', desc: 'Click to remove the costume' }"
      type="trash"
      :color="color"
      @click="handleRemove"
    />
  </UIEditorSpriteItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIImg, UICornerIcon, UIEditorSpriteItem } from '@/components/ui'
import { useFileUrlSmooth } from '@/utils/file'
import type { Costume } from '@/models/costume'
import { useEditorCtx } from '../EditorContextProvider.vue'
import { useMessageHandle } from '@/utils/exception'
import { Sprite } from '@/models/sprite'

const props = withDefaults(
  defineProps<{
    costume: Costume
    color?: 'sprite' | 'primary'
    selectable?: false | { selected: boolean }
    removable?: boolean
  }>(),
  {
    color: 'sprite',
    selectable: false,
    selected: false,
    removable: false
  }
)

const editorCtx = useEditorCtx()
const [imgSrc, imgLoading] = useFileUrlSmooth(() => props.costume.img)

const radarNodeMeta = computed(() => {
  const name = `Costume item "${props.costume.name}"`
  const desc = props.selectable ? 'Click to select the costume and view more options' : ''
  return { name, desc }
})

const parent = computed(() => {
  const parent = props.costume.parent
  if (parent == null) throw new Error('parent expected')
  return parent
})

const removable = computed(() => {
  const { removable, selectable } = props
  const costumes = parent.value.costumes
  return removable && selectable && selectable.selected && costumes.length > 1
})

const handleRemove = useMessageHandle(
  async () => {
    const name = props.costume.name
    const action = { name: { en: `Remove costume ${name}`, zh: `删除造型 ${name}` } }
    await editorCtx.project.history.doAction(action, () => {
      if (parent.value instanceof Sprite) {
        parent.value.removeCostume(props.costume.id)
        return
      }
      throw new Error('parent expected to be Sprite')
    })
  },
  {
    en: 'Failed to remove costume',
    zh: '删除造型失败'
  }
).fn
</script>
