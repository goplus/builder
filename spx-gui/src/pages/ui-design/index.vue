<template>
  <div class="ui-design-wrapper">
    <CommunityNavbar />

    <CenteredWrapper class="wrapper">
      <div class="component-wrapper">
        <h3>UIButton</h3>
        <div class="setting-wrapper">
          <div>
            mode:
            <UISelect v-model:value="mode">
              <UISelectOption value="shadow">shadow</UISelectOption>
              <UISelectOption value="flat">flat</UISelectOption>
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
          <div>stroke: <UISwitch v-model:value="stroke">stroke</UISwitch></div>
        </div>
        <div class="content-wrapper">
          <div class="item">
            <UIButton :mode="mode" :shape="shape" :size="size" type="primary" :stroke="stroke">primary</UIButton>
            <UIButton :mode="mode" :shape="shape" :size="size" type="secondary" :stroke="stroke">secondary</UIButton>
            <UIButton :mode="mode" :shape="shape" :size="size" type="boring" :stroke="stroke">boring</UIButton>
            <UIButton :mode="mode" :shape="shape" :size="size" type="white" :stroke="stroke">white</UIButton>
            <UIButton :mode="mode" :shape="shape" :size="size" type="danger" :stroke="stroke">danger</UIButton>
            <UIButton :mode="mode" :shape="shape" :size="size" type="success" :stroke="stroke">success</UIButton>
            <UIButton :mode="mode" :shape="shape" :size="size" type="blue" :stroke="stroke">blue</UIButton>
            <UIButton :mode="mode" :shape="shape" :size="size" type="purple" :stroke="stroke">purple</UIButton>
          </div>
          <div class="item">
            <UIButton :mode="mode" :shape="shape" :size="size" type="primary" icon="play" :stroke="stroke"
              >primary</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="secondary" icon="play" :stroke="stroke"
              >secondary</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="boring" icon="play" :stroke="stroke"
              >boring</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="white" icon="play" :stroke="stroke"
              >white</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="danger" icon="play" :stroke="stroke"
              >danger</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="success" icon="play" :stroke="stroke"
              >success</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="blue" icon="play" :stroke="stroke">blue</UIButton>
            <UIButton :mode="mode" :shape="shape" :size="size" type="purple" icon="play" :stroke="stroke"
              >purple</UIButton
            >
          </div>

          <div class="item">
            <UIButton :mode="mode" :shape="shape" :size="size" type="primary" icon="play" :stroke="stroke" disabled
              >primary</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="secondary" icon="play" :stroke="stroke" disabled
              >secondary</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="boring" icon="play" :stroke="stroke" disabled
              >boring</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="white" icon="play" :stroke="stroke" disabled
              >white</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="danger" icon="play" :stroke="stroke" disabled
              >danger</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="success" icon="play" :stroke="stroke" disabled
              >success</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="blue" icon="play" :stroke="stroke" disabled
              >blue</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="purple" icon="play" :stroke="stroke" disabled
              >purple</UIButton
            >
          </div>
          <div class="item">
            <UIButton :mode="mode" :shape="shape" :size="size" type="primary" icon="play" :stroke="stroke" loading
              >primary</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="secondary" icon="play" :stroke="stroke" loading
              >secondary</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="boring" icon="play" :stroke="stroke" loading
              >boring</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="white" icon="play" :stroke="stroke" loading
              >white</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="danger" icon="play" :stroke="stroke" loading
              >danger</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="success" icon="play" :stroke="stroke" loading
              >success</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="blue" icon="play" :stroke="stroke" loading
              >blue</UIButton
            >
            <UIButton :mode="mode" :shape="shape" :size="size" type="purple" icon="play" :stroke="stroke" loading
              >purple</UIButton
            >
          </div>
          <div class="item">
            <UIButton :mode="mode" :shape="shape" :size="size" type="primary" :stroke="stroke" icon="play"></UIButton>
            <UIButton :mode="mode" :shape="shape" :size="size" type="secondary" :stroke="stroke" icon="play"></UIButton>
            <UIButton :mode="mode" :shape="shape" :size="size" type="boring" :stroke="stroke" icon="play"></UIButton>
            <UIButton :mode="mode" :shape="shape" :size="size" type="white" :stroke="stroke" icon="play"></UIButton>
            <UIButton :mode="mode" :shape="shape" :size="size" type="danger" :stroke="stroke" icon="play"></UIButton>
            <UIButton :mode="mode" :shape="shape" :size="size" type="success" :stroke="stroke" icon="play"></UIButton>
            <UIButton :mode="mode" :shape="shape" :size="size" type="blue" :stroke="stroke" icon="play"></UIButton>
            <UIButton :mode="mode" :shape="shape" :size="size" type="purple" :stroke="stroke" icon="play"></UIButton>
          </div>
        </div>
      </div>
    </CenteredWrapper>
    <CommunityFooter />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { UIButton, UISelect, UISelectOption, UISwitch } from '@/components/ui'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'
import { usePageTitle } from '@/utils/utils'

usePageTitle({
  en: 'UI Design',
  zh: 'UI设计'
})

const mode = ref<'shadow' | 'flat'>('shadow')
const shape = ref<'square' | 'circle'>('square')
const size = ref<'small' | 'medium' | 'large'>('medium')
const stroke = ref(false)
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
