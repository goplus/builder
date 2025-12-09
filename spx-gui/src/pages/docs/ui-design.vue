<template>
  <div class="ui-design-wrapper">
    <CommunityNavbar />

    <CenteredWrapper class="wrapper">
      <div class="component-wrapper">
        <h3>UIButton</h3>
        <div class="setting-wrapper">
          <div>
            variant:
            <UISelect v-model:value="variant">
              <UISelectOption value="shadow">shadow</UISelectOption>
              <UISelectOption value="flat">flat</UISelectOption>
              <UISelectOption value="stroke">stroke</UISelectOption>
            </UISelect>
          </div>
          <div>
            shape:
            <UISelect v-model:value="shape">
              <UISelectOption value="square">square</UISelectOption>
              <UISelectOption value="circle">circle</UISelectOption>
            </UISelect>
          </div>
          <div>
            size:
            <UISelect v-model:value="size">
              <UISelectOption value="small">small</UISelectOption>
              <UISelectOption value="medium">medium</UISelectOption>
              <UISelectOption value="large">large</UISelectOption>
            </UISelect>
          </div>
        </div>
        <div class="content-wrapper">
          <div class="item">
            <UIButton :variant="variant" :shape="shape" :size="size" color="primary">primary</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="secondary">secondary</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="boring">boring</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="white">white</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="danger">danger</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="success">success</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="blue">blue</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="purple">purple</UIButton>
          </div>
          <div class="item">
            <UIButton :variant="variant" :shape="shape" :size="size" color="primary" icon="play">primary</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="secondary" icon="play">secondary</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="boring" icon="play">boring</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="white" icon="play">white</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="danger" icon="play">danger</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="success" icon="play">success</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="blue" icon="play">blue</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="purple" icon="play">purple</UIButton>
          </div>

          <div class="item">
            <UIButton :variant="variant" :shape="shape" :size="size" color="primary" icon="play" disabled
              >primary</UIButton
            >
            <UIButton :variant="variant" :shape="shape" :size="size" color="secondary" icon="play" disabled
              >secondary</UIButton
            >
            <UIButton :variant="variant" :shape="shape" :size="size" color="boring" icon="play" disabled
              >boring</UIButton
            >
            <UIButton :variant="variant" :shape="shape" :size="size" color="white" icon="play" disabled>white</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="danger" icon="play" disabled
              >danger</UIButton
            >
            <UIButton :variant="variant" :shape="shape" :size="size" color="success" icon="play" disabled
              >success</UIButton
            >
            <UIButton :variant="variant" :shape="shape" :size="size" color="blue" icon="play" disabled>blue</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="purple" icon="play" disabled
              >purple</UIButton
            >
          </div>
          <div class="item">
            <UIButton :variant="variant" :shape="shape" :size="size" color="primary" icon="play" loading
              >primary</UIButton
            >
            <UIButton :variant="variant" :shape="shape" :size="size" color="secondary" icon="play" loading
              >secondary</UIButton
            >
            <UIButton :variant="variant" :shape="shape" :size="size" color="boring" icon="play" loading
              >boring</UIButton
            >
            <UIButton :variant="variant" :shape="shape" :size="size" color="white" icon="play" loading>white</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="danger" icon="play" loading
              >danger</UIButton
            >
            <UIButton :variant="variant" :shape="shape" :size="size" color="success" icon="play" loading
              >success</UIButton
            >
            <UIButton :variant="variant" :shape="shape" :size="size" color="blue" icon="play" loading>blue</UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="purple" icon="play" loading
              >purple</UIButton
            >
          </div>
          <div class="item">
            <UIButton :variant="variant" :shape="shape" :size="size" color="primary" icon="play"></UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="secondary" icon="play"></UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="boring" icon="play"></UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="white" icon="play"></UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="danger" icon="play"></UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="success" icon="play"></UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="blue" icon="play"></UIButton>
            <UIButton :variant="variant" :shape="shape" :size="size" color="purple" icon="play"></UIButton>
          </div>
        </div>
      </div>
    </CenteredWrapper>
    <CommunityFooter />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { UIButton, UISelect, UISelectOption } from '@/components/ui'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'
import { usePageTitle } from '@/utils/utils'

usePageTitle({
  en: 'UI Design',
  zh: 'UI设计'
})

const variant = ref<'shadow' | 'flat' | 'stroke'>('shadow')
const shape = ref<'square' | 'circle'>('square')
const size = ref<'small' | 'medium' | 'large'>('medium')
</script>

<style lang="scss" scoped>
.ui-design-wrapper {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  width: 100%;
  height: 100%;
  background-color: var(--ui-color-grey-500);
}

.wrapper {
  display: flex;
  flex-direction: column;
  margin: 30px auto;
  gap: 16px;
}

.component-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .item {
    display: flex;
    gap: 8px;
  }
}
</style>
