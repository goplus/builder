<template>
  <UIModal v-model:show="showModal">
    <header>
      <UIModalClose class="close" @click="handleCloseButton" />
    </header>
    <main>
      <div class="content">
        <div class="display"></div>
        <div class="detail"></div>
      </div>
      <div class="sider">
        <NText>{{ props.asset.displayName }}</NText>
        <div class="button-group">
          <UIButton type="primary" @click="handleAddButton">
            {{ $t({ en: 'Add', zh: '插入到项目中' }) }}
          </UIButton>
          <UIButton @click="handleAddFav">
            {{ $t({ en: 'Add to favorites', zh: '添加到收藏' }) }}
          </UIButton>
          <div class="sider-info">
            <div class="basic-info">发布日期：{{ props.asset.cTime }}</div>
            <div class="basic-info">发布者：{{ props.asset.owner }}</div>
          </div>
          <div class="category">
            <div class="category-title">{{ $t({ en: 'Category', zh: '类别' }) }}</div>
            <div class="category-content">{{ props.asset.category }}</div>
          </div>
          <div class="more"></div>
        </div>
      </div>
    </main>
  </UIModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NText } from 'naive-ui'
import { UIModalClose } from '@/components/ui'
import type { AssetData } from '@/apis/asset'
import UIButton from '@/components/ui/UIButton.vue'
import UIModal from '@/components/ui/modal/UIModal.vue'

// Define component props
const props = defineProps<{
  asset: AssetData
}>()

// Define component emits
const emits = defineEmits(['open'])

// Ref to control modal visibility
const showModal = ref(false)

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
