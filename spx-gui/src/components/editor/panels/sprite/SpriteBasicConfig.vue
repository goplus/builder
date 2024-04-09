<template>
  <div class="line">
    <NInput
      v-model:value="name"
      @blur="handleNameUpdate"
    >
      <template #prefix> {{ _t({ en: 'Name', zh: '名字' }) }}: </template>
    </NInput>
  </div>
  <div class="line">
    <NInputNumber
      type="number"
      :value="sprite.x"
      @update:value="(x) => sprite.setX(x ?? 0)"
    >
      <template #prefix> X: </template>
    </NInputNumber>
  </div>
  <div class="line">
    <NInputNumber
      type="number"
      :value="sprite.y"
      @update:value="(y) => sprite.setY(y ?? 0)"
    >
      <template #prefix> Y: </template>
    </NInputNumber>
  </div>
  <div class="line edit-switch-btn">
    <p>{{ $t('stage.show') }}:</p>
    <n-switch
      v-model:value="sprite.visible"
      @update:value="(visible) => sprite.setVisible(visible)"
    />
  </div>
  <div class="line">
    <NInputNumber
      type="number"
      :min="0"
      :value="sprite.size * 100"
      @update:value="(s) => sprite.setSize((s ?? 100) / 100)"
    >
      <template #prefix> {{ $t('stage.size') }}: </template>
    </NInputNumber>
  </div>

  <div class="line">
    <NInputNumber
      type="number"
      :min="-180"
      :max="180"
      :value="sprite.heading"
      @update:value="h => sprite.setHeading(h ?? 0)"
    >
      <template #prefix> {{ $t('stage.direction') }}: </template>
    </NInputNumber>
  </div>
  <div class="line">
    <!-- Entry for "add to library", its appearance or position may change later -->
    <NButton @click="handleAddToLibrary(sprite)">Add to library</NButton>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { NInput, NInputNumber, NSwitch, NButton, useMessage } from 'naive-ui'
import type { Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import { useAddAssetToLibrary } from '@/components/library'
import { validateSpriteName } from '@/models/common/asset'
import { useI18n } from '@/utils/i18n'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

const message = useMessage()
const { t } = useI18n()

const name = ref(props.sprite.name)

watch(() => props.sprite.name, newName => {
  name.value = newName
})

function handleNameUpdate() {
  if (name.value === props.sprite.name) return
  const err = validateSpriteName(name.value, props.project)
  if (err != null) {
    message.error(t(err))
    return
  }
  props.sprite.setName(name.value)
}

// // ----------data related -----------------------------------
// // TODO: check all default values here, they should be consistent with spx
// const x = computed(() => editorCtx.selectedSprite?.x ?? 0)
// const y = computed(() => editorCtx.selectedSprite?.y ?? 0)
// const heading = computed(() => (editorCtx.selectedSprite ? editorCtx.selectedSprite.heading : 0))
// const size = computed(() => editorCtx.selectedSprite?.size ?? 0)
// const visible = computed(() =>
//   editorCtx.selectedSprite ? editorCtx.selectedSprite.visible : false
// )
// const name = ref(editorCtx.selectedSprite?.name ?? '')
// const { t } = useI18n({
//   inheritLocale: true
// })
// watch(
//   () => editorCtx.selectedSprite?.name,
//   (newName) => {
//     name.value = newName || ''
//   }
// )

// const { message } = createDiscreteApi(['message'])
// function handleUpdateSpriteName() {
//   if (!editorCtx.selectedSprite) return
//   try {
//     const checkInfo = checkUpdatedName(name.value, editorCtx.project, editorCtx.selectedSprite.name)

//     if (!checkInfo.isSame && !checkInfo.isChanged) {
//       editorCtx.selectedSprite.setName(checkInfo.name)
//       message.success(t('message.update'))
//     }
//     if (checkInfo.msg) message.warning(checkInfo.msg)
//   } catch (e) {
//     if (e instanceof Error) message.error(e.message)
//   }
// }

const addToLibrary = useAddAssetToLibrary()

function handleAddToLibrary(sprite: Sprite) {
  addToLibrary(sprite)
}
</script>

<style scoped lang="scss">
.line {
  flex: 1;
  display: flex;
  margin: 2px;
  min-width: 105px;
  line-height: 2rem;
  p {
    margin: 0;
  }
  .NInput,
  .NInputNumber {
    min-width: 100%;
  }
}
.edit-switch-btn {
  align-items: center;
  justify-content: center;
}
</style>
