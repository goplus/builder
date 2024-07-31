<template>
  <n-button @click="showModal = true">
    来吧
  </n-button>
  <n-modal v-model:show="showModal">
    <header>
      <UIModalClose class="close" @click="handleCloseButton" />
    </header>
    <main>
      <div class="content">
        <div class="display"></div>
        <div class="detail"></div>
      </div>
      <div class="sider"></div>
    </main>
  </n-modal>
</template>

<script setup lang="ts">
import { defineComponent, ref } from 'vue'
import { NButton, NModal } from 'naive-ui'
import { UIModalClose } from '@/components/ui'

const showModal=ref(false)
const handleCloseButton=()=>{
  showModal.value=false
}
</script>