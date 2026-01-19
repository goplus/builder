<template>
  <EditorItemDetail :name="costume.name" @rename="emit('rename')">
    <div class="img-wrapper">
      <CheckerboardBackground class="background" />
      <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
    </div>
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { UIImg } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Costume } from '@/models/costume'
import EditorItemDetail from '../common/EditorItemDetail.vue'
import CheckerboardBackground from './CheckerboardBackground.vue'

const props = defineProps<{
  costume: Costume
}>()

const emit = defineEmits<{
  rename: []
}>()

const [imgSrc, imgLoading] = useFileUrl(() => props.costume.img)
</script>

<style lang="scss" scoped>
.img-wrapper {
  width: 100%;
  flex: 1 1 0;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}

.img {
  width: 100%;
  height: 100%;
}
</style>
