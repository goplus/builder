<template>
  <UIModal v-model:show="showModal" style="min-width: 80vw;min-height: 90vh;">
    <header>
      <UIModalClose class="close" @click="handleCloseButton" />
    </header>
    <main>
      <div class="content">
        <div class="display"></div>
        <div class="detail">
          <LibraryTab />
        </div>
      </div>
      <div class="sider">
        <div class="title">{{ props.asset.displayName }}</div>
        <div class="button-group">
          <UIButton size="large" class="insert-button" @click="handleAddButton">
            {{ $t({ en: 'Insert to project', zh: '插入到项目中' }) }}
          </UIButton>
          <UIButton size="large" @click="handleAddFav">
            {{ $t({ en: 'Add to favorites', zh: '添加到收藏' }) }}
          </UIButton>
        </div>
        <div class="sider-info">
          <div class="basic-info">{{ $t({ en: 'posted time', zh: '发布时间' }) }}：{{ props.asset.cTime }}</div>
          <div class="basic-info">{{ $t({ en: 'posted by', zh: '发布人' }) }}：{{ props.asset.owner }}</div>
        </div>
        <div class="category">
          <div class="category-title">{{ $t({ en: 'Category', zh: '类别' }) }}</div>
          <NTag class="category-content">{{ props.asset.category }}</NTag>
        </div>
        <div class="more"></div>
      </div>
    </main>
  </UIModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NTag, NText } from 'naive-ui'
import { UIModalClose } from '@/components/ui'
import type { AssetData } from '@/apis/asset'
import UIButton from '@/components/ui/UIButton.vue'
import UIModal from '@/components/ui/modal/UIModal.vue'
import LibraryTab from '../LibraryTab.vue'
import UITagButton from '@/components/ui/UITagButton.vue'
import { heading } from '../../../editor/code-editor/code-text-editor/tools/spx';
import { title } from '../../../ui/tokens/colors';

// Define component props
const props = defineProps<{
  asset: AssetData
}>()

// Define component emits
const emits = defineEmits(['open'])

// Ref to control modal visibility
const showModal = ref(true)

// Methods to handle button actions
const handleCloseButton = () => {
  showModal.value = false
}

const handleAddButton = () => {
  console.log('add')
}

const handleAddFav = () => {
  console.log('add fav')
}

// Expose method to open modal
const openModal = () => {
  showModal.value = true
  emits('open')  // Emit open event when the modal is opened
}

defineExpose({
  openModal
})

</script>

<style lang="scss" scoped>
header {
  display: flex;
  justify-content: flex-end;
  padding: 10px;
  border-bottom: 1px solid #e0e0e0;

  .close {
    cursor: pointer;
  }
}

main {
  display: flex;

  .content {
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;

    .display {
      width: 50vw;
      min-height: 50vh;
      border-right: 1px solid #e0e0e0;
      background-color: #847676;
    }

    .detail {
      margin-top: 20px;
      height: 100%;
      padding: 0 20px;
    }
  }

  .sider {
    display: flex;
    flex-direction: column;
    margin: 20px;
    gap: 20px;

    .title {
      font-size: 24px;
      font-weight: bold;
      color: #000;
    }

    .button-group {
      display: flex;
      gap: 10px;

      .insert-button {}
    }

    .sider-info {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .basic-info {
      font-size: 14px;
    }

    .category {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .category-title {
      font-size: 14px;
      font-weight: bold;
    }

    .category-content {
      font-size: 14px;
      width: fit-content;
    }

    .more {
      margin-top: 20px;
    }
  }


}
</style>