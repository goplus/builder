<!--
 * @Author: Xu Ning
 * @Date: 2024-01-18 17:09:35
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-03-11 18:48:45
 * @FilePath: /builder/spx-gui/src/components/sprite-list/SpriteEditBtn.vue
 * @Description: 
-->
<template>
  <n-flex justify="space-around">
    <div class="sprite-edit-btn">
      <n-input
        round
        autosize
        clearable
        :disabled="!editorStore.selectedSprite"
        :placeholder="$t('stage.spriteHolder')"
        :value="name"
        @blur="handleUpdateSpriteName"
        @update:value="(val) => (name = val)"
      >
        <template #prefix> {{ $t('stage.sprite') }}: </template>
      </n-input>
    </div>
    <div class="sprite-edit-btn">
      <n-input-number
        style="border-radius: 25px"
        class="edit-input"
        round
        autosize
        clearable
        type="number"
        :value="x"
        :disabled="!editorStore.selectedSprite"
        @update:value="
          (val) => {
            editorStore.selectedSprite && editorStore.selectedSprite.setX(val as number)
          }
        "
      >
        <template #prefix> X: </template>
      </n-input-number>
    </div>
    <div class="sprite-edit-btn">
      <n-input-number
        type="number"
        :value="y"
        :disabled="!editorStore.selectedSprite"
        @update:value="
          (val) => {
            editorStore.selectedSprite && editorStore.selectedSprite.setY(val as number)
          }
        "
      >
        <template #prefix> Y: </template>
      </n-input-number>
    </div>
    <div class="sprite-edit-btn edit-switch-btn">
      <p>{{ $t('stage.show') }}:</p>
      <n-switch
        v-model:value="visible"
        @update:value="
          (val) => {
            editorStore.selectedSprite && editorStore.selectedSprite.setVisible(val)
          }
        "
      >
      </n-switch>
    </div>
    <div class="sprite-edit-btn">
      <n-input-number
        type="number"
        :min="0"
        :value="size * 100"
        :disabled="!editorStore.selectedSprite"
        @update:value="
          (val) => {
            editorStore.selectedSprite && editorStore.selectedSprite.setSize((val as number) / 100)
          }
        "
      >
        <template #prefix> {{ $t('stage.size') }}: </template>
      </n-input-number>
    </div>

    <div class="sprite-edit-btn">
      <n-input-number
        type="number"
        :min="-180"
        :max="180"
        :value="heading"
        :disabled="!editorStore.selectedSprite"
        @update:value="
          (val) => {
            editorStore.selectedSprite && editorStore.selectedSprite.setHeading(val as number)
          }
        "
      >
        <template #prefix> {{ $t('stage.direction') }}: </template>
      </n-input-number>
    </div>
  </n-flex>
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { computed, ref, watch } from 'vue'
import { NInput, NInputNumber, NFlex, NSwitch, createDiscreteApi } from 'naive-ui'
import { checkUpdatedName } from '@/utils/asset'
import { useProjectStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '@/stores/editor'

// ----------props & emit------------------------------------
const editorStore = useEditorStore()

// ----------data related -----------------------------------
// TODO: check all default values here, they should be consistent with spx
const x = computed(() => editorStore.selectedSprite?.x ?? 0)
const y = computed(() => editorStore.selectedSprite?.y ?? 0)
const heading = computed(() =>
  editorStore.selectedSprite ? editorStore.selectedSprite.heading : 0
)
const size = computed(() => editorStore.selectedSprite?.size ?? 0)
const visible = computed(() =>
  editorStore.selectedSprite ? editorStore.selectedSprite.visible : false
)
const name = ref(editorStore.selectedSprite?.name ?? '')
const { t } = useI18n({
  inheritLocale: true
})
watch(
  () => editorStore.selectedSprite?.name,
  (newName) => {
    name.value = newName || ''
  }
)

const { message } = createDiscreteApi(['message'])
function handleUpdateSpriteName() {
  if (!editorStore.selectedSprite) return
  try {
    const checkInfo = checkUpdatedName(
      name.value,
      useProjectStore().project,
      editorStore.selectedSprite.name
    )

    if (!checkInfo.isSame && !checkInfo.isChanged) {
      editorStore.selectedSprite.setName(checkInfo.name)
      message.success(t('message.update'))
    }
    if (checkInfo.msg) message.warning(checkInfo.msg)
  } catch (e) {
    if (e instanceof Error) message.error(e.message)
  }
}
</script>

<style scoped lang="scss">
.sprite-edit-btn {
  flex: 1;
  display: flex;
  margin: 2px;
  min-width: 105px;
  line-height: 2rem;
  p {
    margin: 0;
  }
  .n-input,
  .n-input-number {
    min-width: 100%;
  }
}
.edit-switch-btn {
  align-items: center;
  justify-content: center;
}
</style>
