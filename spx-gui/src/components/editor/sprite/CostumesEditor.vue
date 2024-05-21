<template>
  <EditorList color="sprite">
    <CostumeItem
      v-for="costume in sprite.costumes"
      :key="costume.name"
      :sprite="sprite"
      :costume="costume"
      :selected="selected?.name === costume.name"
      @click="handleSelect(costume)"
    />
    <template #add-options>
      <UIMenu>
        <UIMenuItem @click="handleAddFromLocalFile">{{
          $t({ en: 'Select local file', zh: '选择本地文件' })
        }}</UIMenuItem>
      </UIMenu>
    </template>
    <template #detail>
      <CostumeDetail v-if="selected != null" :sprite="sprite" :costume="selected" />
    </template>
  </EditorList>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIMenu, UIMenuItem } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { selectImg } from '@/utils/file'
import { fromNativeFile } from '@/models/common/file'
import type { Sprite } from '@/models/sprite'
import { Costume } from '@/models/costume'
import { stripExt } from '@/utils/path'
import EditorList from '../common/EditorList.vue'
import CostumeItem from './CostumeItem.vue'
import CostumeDetail from './CostumeDetail.vue'

const props = defineProps<{
  sprite: Sprite
}>()
const selected = computed(() => props.sprite.defaultCostume)

function handleSelect(costume: Costume) {
  props.sprite.setDefaultCostume(costume.name)
}

const handleAddFromLocalFile = useMessageHandle(
  async () => {
    const img = await selectImg()
    const file = fromNativeFile(img)
    const costume = await Costume.create(stripExt(img.name), file)
    props.sprite.addCostume(costume)
    props.sprite.setDefaultCostume(costume.name)
  },
  { en: 'Failed to add from local file', zh: '从本地文件添加失败' }
).fn
</script>
