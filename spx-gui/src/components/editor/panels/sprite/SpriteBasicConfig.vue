<template>
  <div class="line name">
    <AssetName>{{ sprite.name }}</AssetName>
    <UIIcon
      class="icon"
      :title="$t({ en: 'Rename', zh: '重命名' })"
      type="edit"
      @click="handleNameEdit"
    />
    <div class="spacer" />
    <UITooltip>
      <template #trigger>
        <UIIcon class="icon" type="doubleArrowDown" @click="emit('collapse')" />
      </template>
      {{
        $t({
          en: 'Collapse',
          zh: '收起'
        })
      }}
    </UITooltip>
  </div>
  <div class="line">
    <UINumberInput type="number" :value="sprite.x" @update:value="(x) => sprite.setX(x ?? 0)">
      <template #prefix>X:</template>
    </UINumberInput>
    <UINumberInput type="number" :value="sprite.y" @update:value="(y) => sprite.setY(y ?? 0)">
      <template #prefix>Y:</template>
    </UINumberInput>
    <UINumberInput
      type="number"
      :min="0"
      :value="sizePercent"
      @update:value="handleSizePercentChange"
    >
      <template #prefix> {{ $t({ en: 'Size', zh: '大小' }) }}: </template>
      <template #suffix>%</template>
    </UINumberInput>
  </div>
  <div class="line">
    <UINumberInput
      type="number"
      :min="-180"
      :max="180"
      :value="sprite.heading"
      @update:value="(h) => sprite.setHeading(h ?? 0)"
    >
      <template #prefix>
        {{
          $t({
            en: 'Heading',
            zh: '朝向'
          })
        }}:
      </template>
    </UINumberInput>
    <p class="with-label">
      {{ $t({ en: 'Show', zh: '显示' }) }}:
      <VisibleInput
        :value="sprite.visible"
        @update:value="(visible) => sprite.setVisible(visible)"
      />
    </p>
  </div>
  <div v-if="isLibraryEnabled()" class="line">
    <UIButton @click="addToLibrary(sprite)">Add to asset library</UIButton>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UINumberInput, UIButton, UIIcon, useModal, UITooltip } from '@/components/ui'
import { isLibraryEnabled, round } from '@/utils/utils'
import type { Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import { useAddAssetToLibrary } from '@/components/asset'
import AssetName from '@/components/asset/AssetName.vue'
import VisibleInput from '../common/VisibleInput.vue'
import SpriteRenameModal from './SpriteRenameModal.vue'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

const emit = defineEmits<{
  collapse: []
}>()

const renameSprite = useModal(SpriteRenameModal)

function handleNameEdit() {
  renameSprite({
    sprite: props.sprite,
    project: props.project
  })
}

// use `round` to avoid `0.07 * 100 = 7.000000000000001`
// TODO: use some 3rd-party tool like [Fraction.js](https://github.com/rawify/Fraction.js)
const sizePercent = computed(() => round(props.sprite.size * 100))

function handleSizePercentChange(s: any) {
  if (s == null) return
  props.sprite.setSize(round(s / 100, 2))
}

const addToLibrary = useAddAssetToLibrary()
</script>

<style scoped lang="scss">
.line {
  display: flex;
  gap: 12px;
  align-items: center;
  height: 24px;
}

.name {
  color: var(--ui-color-title);
}

.icon {
  cursor: pointer;
  color: var(--ui-color-grey-900);
  &:hover {
    color: var(--ui-color-grey-800);
  }
  &:active {
    color: var(--ui-color-grey-1000);
  }
}

.with-label {
  display: flex;
  gap: 4px;
  align-items: center;
  word-break: keep-all;
}

.spacer {
  flex: 1;
}
</style>
