<template>
  <EditorItem
    :selected="selected"
    color="sprite"
    :item="costume"
    :removable="removable"
    @remove="handelRemove"
  >
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
  </EditorItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIImg } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Costume } from '@/models/costume'
import type { Sprite } from '@/models/sprite'
import EditorItem from '../common/EditorItem.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  costume: Costume
  sprite: Sprite
  selected: boolean
}>()

const editorCtx = useEditorCtx()
const [imgSrc, imgLoading] = useFileUrl(() => props.costume.img)

const removable = computed(() => props.sprite.costumes.length > 1)

function handelRemove() {
  const name = props.costume.name
  const action = { name: { en: `Remove costume ${name}`, zh: `删除造型 ${name}` } }
  editorCtx.project.history.doAction(action, () => props.sprite.removeCostume(name))
}
</script>

<style lang="scss" scoped>
.img {
  width: 60px;
  height: 60px;
}
</style>
