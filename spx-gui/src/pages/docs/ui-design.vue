<template>
  <div class="flex h-full w-full flex-col overflow-y-auto bg-grey-500">
    <CommunityNavbar />

    <CenteredWrapper class="my-7.5 flex flex-col gap-8">
      <div class="flex flex-col gap-middle">
        <h3>UIButton</h3>
        <div class="flex items-center gap-3">
          <div>
            variant:
            <UISelect v-model:value="buttonVariant">
              <UISelectOption value="shadow">shadow</UISelectOption>
              <UISelectOption value="flat">flat</UISelectOption>
              <UISelectOption value="stroke">stroke</UISelectOption>
            </UISelect>
          </div>
          <div>
            shape:
            <UISelect v-model:value="buttonShape">
              <UISelectOption value="square">square</UISelectOption>
              <UISelectOption value="circle">circle</UISelectOption>
            </UISelect>
          </div>
          <div>
            size:
            <UISelect v-model:value="buttonSize">
              <UISelectOption value="small">small</UISelectOption>
              <UISelectOption value="medium">medium</UISelectOption>
              <UISelectOption value="large">large</UISelectOption>
            </UISelect>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <div class="flex gap-2">
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="primary"
              >primary</UIButton
            >
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="secondary"
              >secondary</UIButton
            >
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="boring">boring</UIButton>
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="white">white</UIButton>
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="danger">danger</UIButton>
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="success"
              >success</UIButton
            >
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="blue">blue</UIButton>
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="purple">purple</UIButton>
          </div>
          <div class="flex gap-2">
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="primary" icon="play"
              >primary</UIButton
            >
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="secondary" icon="play"
              >secondary</UIButton
            >
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="boring" icon="play"
              >boring</UIButton
            >
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="white" icon="play"
              >white</UIButton
            >
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="danger" icon="play"
              >danger</UIButton
            >
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="success" icon="play"
              >success</UIButton
            >
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="blue" icon="play"
              >blue</UIButton
            >
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="purple" icon="play"
              >purple</UIButton
            >
          </div>

          <div class="flex gap-2">
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="primary"
              icon="play"
              disabled
              >primary</UIButton
            >
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="secondary"
              icon="play"
              disabled
              >secondary</UIButton
            >
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="boring"
              icon="play"
              disabled
              >boring</UIButton
            >
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="white"
              icon="play"
              disabled
              >white</UIButton
            >
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="danger"
              icon="play"
              disabled
              >danger</UIButton
            >
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="success"
              icon="play"
              disabled
              >success</UIButton
            >
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="blue" icon="play" disabled
              >blue</UIButton
            >
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="purple"
              icon="play"
              disabled
              >purple</UIButton
            >
          </div>
          <div class="flex gap-2">
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="primary"
              icon="play"
              loading
              >primary</UIButton
            >
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="secondary"
              icon="play"
              loading
              >secondary</UIButton
            >
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="boring"
              icon="play"
              loading
              >boring</UIButton
            >
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="white" icon="play" loading
              >white</UIButton
            >
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="danger"
              icon="play"
              loading
              >danger</UIButton
            >
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="success"
              icon="play"
              loading
              >success</UIButton
            >
            <UIButton :variant="buttonVariant" :shape="buttonShape" :size="buttonSize" color="blue" icon="play" loading
              >blue</UIButton
            >
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="purple"
              icon="play"
              loading
              >purple</UIButton
            >
          </div>
          <div class="flex gap-2">
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="primary"
              icon="play"
            ></UIButton>
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="secondary"
              icon="play"
            ></UIButton>
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="boring"
              icon="play"
            ></UIButton>
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="white"
              icon="play"
            ></UIButton>
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="danger"
              icon="play"
            ></UIButton>
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="success"
              icon="play"
            ></UIButton>
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="blue"
              icon="play"
            ></UIButton>
            <UIButton
              :variant="buttonVariant"
              :shape="buttonShape"
              :size="buttonSize"
              color="purple"
              icon="play"
            ></UIButton>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-middle">
        <h3>UITag</h3>
        <div class="flex items-center gap-3">
          <div>
            variant:
            <UISelect v-model:value="tagVariant">
              <UISelectOption value="stroke">stroke</UISelectOption>
              <UISelectOption value="none">none</UISelectOption>
            </UISelect>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <div class="flex gap-2">
            <UITag :variant="tagVariant" color="default">default</UITag>
            <UITag :variant="tagVariant" color="primary">primary</UITag>
            <UITag :variant="tagVariant" color="warning">warning</UITag>
            <UITag :variant="tagVariant" color="error">error</UITag>
          </div>
          <div class="flex gap-2">
            <UITag :variant="tagVariant" color="default" closable @close="message.success('default')">default</UITag>
            <UITag :variant="tagVariant" color="primary" closable @close="message.info('primary')">primary</UITag>
            <UITag :variant="tagVariant" color="warning" closable @close="message.warning('warning')">warning</UITag>
            <UITag :variant="tagVariant" color="error" closable @close="message.error('error')">error</UITag>
          </div>
          <div class="flex gap-2">
            <UITag
              v-for="value in ['up', 'right', 'down', 'left']"
              :key="value"
              :variant="tagVariant"
              color="default"
              :checkable="{ checked: tagValue === value }"
              @click="tagValue = value"
              >{{ value }}</UITag
            >
          </div>
          <div class="flex gap-2">
            <UITag
              v-for="value in ['up', 'right', 'down', 'left']"
              :key="value"
              :variant="tagVariant"
              color="default"
              :checkable="{ checked: tagsValue.has(value) }"
              closable
              @click="tagsValue.add(value)"
              @close="tagsValue.delete(value)"
              >{{ value }}</UITag
            >
          </div>
          <div class="flex gap-2">
            <UITag :variant="tagVariant" color="default" disabled>default</UITag>
            <UITag :variant="tagVariant" color="primary" disabled>primary</UITag>
            <UITag :variant="tagVariant" color="warning" disabled>warning</UITag>
            <UITag :variant="tagVariant" color="error" disabled>error</UITag>
          </div>
        </div>
      </div>
    </CenteredWrapper>
    <CommunityFooter />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { UIButton, UISelect, UISelectOption, UITag, useMessage } from '@/components/ui'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'
import { usePageTitle } from '@/utils/utils'

usePageTitle({
  en: 'UI Design',
  zh: 'UI设计'
})

const buttonVariant = ref<'shadow' | 'flat' | 'stroke'>('shadow')
const buttonShape = ref<'square' | 'circle'>('square')
const buttonSize = ref<'small' | 'medium' | 'large'>('medium')

const tagVariant = ref<'stroke' | 'none'>('stroke')
const message = useMessage()
const tagValue = ref('up')
const tagsValue = ref(new Set())
</script>
