<template>
  <li class="backdrop-item" :class="{ active: selected }">
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" size="cover" />
    <h5 class="name">{{ backdrop.name }}</h5>
    <UIDropdown trigger="click">
      <template #trigger>
        <UICornerIcon v-show="selected" color="stage" type="more" />
      </template>
      <UIMenu>
        <UIMenuItem @click="handleAddToAssetLibrary.fn">{{
          $t({ en: 'Add to asset library', zh: '添加到素材库' })
        }}</UIMenuItem>
        <UIMenuItem :disabled="!removable" @click="handelRemove">{{
          $t({ en: 'Remove', zh: '删除' })
        }}</UIMenuItem>
      </UIMenu>
    </UIDropdown>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIImg, UICornerIcon, UIDropdown, UIMenu, UIMenuItem } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Backdrop } from '@/models/backdrop'
import { useAddAssetToLibrary } from '@/components/asset'
import { useMessageHandle } from '@/utils/exception'
import type { Stage } from '@/models/stage'

const props = defineProps<{
  stage: Stage
  backdrop: Backdrop
  selected: boolean
}>()

const [imgSrc, imgLoading] = useFileUrl(() => props.backdrop.img)

const addAssetToLibrary = useAddAssetToLibrary()

const handleAddToAssetLibrary = useMessageHandle(() => addAssetToLibrary(props.backdrop), {
  en: 'Failed to add backdrop to asset library',
  zh: '添加素材库失败'
})

const removable = computed(() => props.stage.backdrops.length > 1)

function handelRemove() {
  props.stage.removeBackdrop(props.backdrop.name)
}
</script>

<style lang="scss" scoped>
.backdrop-item {
  width: 88px;
  display: flex;
  flex-direction: column;
  position: relative;
  align-items: center;
  border-radius: var(--ui-border-radius-2);
  border: 2px solid var(--ui-color-grey-300);
  background-color: var(--ui-color-grey-300);
  cursor: pointer;

  &:not(.active):hover {
    border-color: var(--ui-color-grey-400);
    background-color: var(--ui-color-grey-400);
  }

  &.active {
    border-color: var(--ui-color-stage-main);
    background-color: var(--ui-color-stage-200);
  }
}

.img {
  margin: 12px 0 14px;
  width: 52px;
  height: 39px;
  border-radius: 4px;
}

.name {
  font-size: 10px;
  line-height: 1.6;
  padding: 3px 8px 3px;

  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  text-overflow: ellipsis;
  color: var(--ui-color-title);
}
</style>
