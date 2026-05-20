<script setup lang="ts">
import { nextTick, ref } from 'vue'

import ProjectRunner from '@/components/project/ProjectRunner.vue'
import UIButton from '@/components/ui/UIButton.vue'
import UICardHeader from '@/components/ui/UICardHeader.vue'
import transformerFlipArrowDisabledUrl from '@/assets/editor/custom-transformer/transformer-flip-arrow-disabled.png'
import transformerFlipArrowUrl from '@/assets/editor/custom-transformer/transformer-flip-arrow.png'

const props = defineProps<{
  ctx: any
}>()

const runnerRef = ref<InstanceType<typeof ProjectRunner>>()

async function runProject() {
  props.ctx.runnerActive = true
  await nextTick()
  await runnerRef.value?.run()
}

function handleQuickConfigToolClick(tool: { id: string }) {
  if (tool.id === 'layer' && props.ctx.activeQuickConfig === 'layer') {
    props.ctx.backToDefaultQuickConfig()
    return
  }
  props.ctx.openQuickConfig(tool.id)
}
</script>

<template>
  <section class="preview-card">
    <UICardHeader class="gap-3">
      <div class="preview-title">Preview</div>
      <UIButton class="preview-action-button" type="primary" size="medium" @click="runProject">
        <span class="preview-button-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7V5Z" /></svg>
        </span>
        Run
      </UIButton>
      <UIButton class="preview-action-button" type="secondary" size="medium" @click="ctx.openPublishModal">
        <span class="preview-button-icon" aria-hidden="true" v-html="ctx.publishActionIcon"></span>
        Publish
      </UIButton>
    </UICardHeader>

    <div class="stage-frame">
      <template v-if="!ctx.runnerActive">
              <img class="stage-backdrop" :src="ctx.stageBackdrop" alt="" />
              <div
                v-for="sprite in ctx.stageCompanionSprites"
                :key="sprite.id"
                class="stage-sprite"
                :style="ctx.getStageSpriteFrameStyle(sprite)"
                role="button"
                tabindex="0"
                :aria-label="`Select ${sprite.name}`"
                @click="ctx.selectSprite(sprite.id)"
                @keydown.enter.prevent="ctx.selectSprite(sprite.id)"
                @keydown.space.prevent="ctx.selectSprite(sprite.id)"
                @pointerdown.stop.prevent="ctx.startStageSpriteDrag(sprite, $event)"
                @pointermove.stop.prevent="ctx.moveStageSpriteDrag"
                @pointerup.stop.prevent="ctx.endStageSpriteDrag"
                @pointercancel.stop.prevent="ctx.endStageSpriteDrag"
              >
                <img :src="sprite.image" alt="" />
              </div>
              <div
                v-if="ctx.selectedSprite != null"
                class="selected-sprite"
                :style="ctx.selectedSpriteFrameStyle"
                @pointerdown.stop.prevent="ctx.startStageSpriteDrag(ctx.selectedSprite, $event)"
                @pointermove.stop.prevent="ctx.moveStageSpriteDrag"
                @pointerup.stop.prevent="ctx.endStageSpriteDrag"
                @pointercancel.stop.prevent="ctx.endStageSpriteDrag"
              >
                <img :src="ctx.selectedSprite.image" alt="" />
                <span class="coordinate">{{ ctx.selectedSpriteCoordinate }}</span>
                <button
                  class="handle left"
                  :class="{ active: ctx.selectedSprite.rotationStyle === 'left-right' && ctx.selectedSprite.heading < 0 }"
                  type="button"
                  aria-label="Set direction left"
                  title="Set direction left"
                  @pointerdown.stop.prevent
                  @click.stop="ctx.switchSelectedSpriteDirection('left')"
                >
                  <img class="handle-arrow" :src="transformerFlipArrowUrl" alt="" aria-hidden="true" />
                </button>
                <button
                  class="handle right"
                  :class="{ active: ctx.selectedSprite.rotationStyle === 'left-right' && ctx.selectedSprite.heading >= 0 }"
                  type="button"
                  aria-label="Set direction right"
                  title="Set direction right"
                  @pointerdown.stop.prevent
                  @click.stop="ctx.switchSelectedSpriteDirection('right')"
                >
                  <img class="handle-arrow disabled" :src="transformerFlipArrowDisabledUrl" alt="" aria-hidden="true" />
                </button>
                <button
                  v-for="corner in ['top-left', 'top-right', 'bottom-left', 'bottom-right']"
                  :key="corner"
                  class="corner"
                  :class="corner"
                  type="button"
                  :aria-label="`Resize sprite from ${corner}`"
                  @pointerdown.stop.prevent="ctx.startSelectedSpriteResize(corner, $event)"
                  @pointermove.stop.prevent="ctx.moveSelectedSpriteResize"
                  @pointerup.stop.prevent="ctx.endSelectedSpriteResize"
                  @pointercancel.stop.prevent="ctx.endSelectedSpriteResize"
                ></button>
              </div>
              <div class="stage-tools" :class="{ expanded: ctx.activeQuickConfig !== 'default' && ctx.activeQuickConfig !== 'layer' }">
                <template v-if="ctx.activeQuickConfig === 'default' || ctx.activeQuickConfig === 'layer'">
                  <button
                    v-for="tool in ctx.quickConfigTools"
                    :key="tool.id"
                    type="button"
                    :aria-label="tool.label"
                    :class="{ active: ctx.activeQuickConfig === tool.id }"
                    @click="handleQuickConfigToolClick(tool)"
                  >
                    <span v-html="tool.icon"></span>
                  </button>
                  <div v-if="ctx.activeQuickConfig === 'layer' && ctx.selectedSprite != null" class="quick-layer-menu" role="menu" aria-label="Layer order options">
                    <button type="button" role="menuitem" @click="ctx.moveSelectedSpriteLayer('up')">Bring forward</button>
                    <button type="button" role="menuitem" @click="ctx.moveSelectedSpriteLayer('top')">Bring to front</button>
                    <button type="button" role="menuitem" @click="ctx.moveSelectedSpriteLayer('down')">Send backward</button>
                    <button type="button" role="menuitem" @click="ctx.moveSelectedSpriteLayer('bottom')">Send to back</button>
                  </div>
                </template>
                <template v-else-if="ctx.activeQuickConfig === 'size' && ctx.selectedSprite != null">
                  <label class="quick-config-input">
                    <span>Size</span>
                    <input
                      :value="ctx.selectedSprite.size"
                      type="number"
                      inputmode="numeric"
                      min="1"
                      max="400"
                      aria-label="Size input"
                      @input="ctx.updateSelectedSpriteSize"
                    />
                    <span>%</span>
                  </label>
                  <span class="quick-config-divider" aria-hidden="true"></span>
                  <button class="quick-config-back" type="button" aria-label="Back" @click="ctx.backToDefaultQuickConfig">
                    <span v-html="ctx.backQuickIcon"></span>
                  </button>
                </template>
                <template v-else-if="ctx.activeQuickConfig === 'position' && ctx.selectedSprite != null">
                  <label class="quick-config-input position-input">
                    <span>X</span>
                    <input
                      :value="ctx.selectedSprite.x"
                      type="number"
                      inputmode="numeric"
                      min="-999"
                      max="999"
                      aria-label="X position input"
                      @input="ctx.updateSelectedSpriteX"
                    />
                  </label>
                  <label class="quick-config-input position-input">
                    <span>Y</span>
                    <input
                      :value="ctx.selectedSprite.y"
                      type="number"
                      inputmode="numeric"
                      min="-999"
                      max="999"
                      aria-label="Y position input"
                      @input="ctx.updateSelectedSpriteY"
                    />
                  </label>
                  <span class="quick-config-divider" aria-hidden="true"></span>
                  <button class="quick-config-back" type="button" aria-label="Back" @click="ctx.backToDefaultQuickConfig">
                    <span v-html="ctx.backQuickIcon"></span>
                  </button>
                </template>
                <template v-else-if="ctx.activeQuickConfig === 'rotation' && ctx.selectedSprite != null">
                  <div class="rotation-style-group" role="group" aria-label="Rotation style control">
                    <button
                      class="rotation-style-button"
                      :class="{ active: ctx.selectedSprite.rotationStyle === 'normal' }"
                      type="button"
                      aria-label="Normal rotation"
                      @click="ctx.updateSelectedSpriteRotationStyle('normal')"
                    >
                      <span v-html="ctx.rotateAroundIcon"></span>
                    </button>
                    <button
                      class="rotation-style-button"
                      :class="{ active: ctx.selectedSprite.rotationStyle === 'left-right' }"
                      type="button"
                      aria-label="Left-right rotation"
                      @click="ctx.updateSelectedSpriteRotationStyle('left-right')"
                    >
                      <span v-html="ctx.leftRightIcon"></span>
                    </button>
                    <button
                      class="rotation-style-button"
                      :class="{ active: ctx.selectedSprite.rotationStyle === 'none' }"
                      type="button"
                      aria-label="No rotation"
                      @click="ctx.updateSelectedSpriteRotationStyle('none')"
                    >
                      <span v-html="ctx.notRotateIcon"></span>
                    </button>
                  </div>
                  <label v-if="ctx.selectedSprite.rotationStyle === 'normal'" class="quick-config-input heading-input">
                    <span>Heading</span>
                    <input
                      :value="ctx.selectedSprite.heading"
                      type="number"
                      inputmode="numeric"
                      min="-180"
                      max="180"
                      aria-label="Heading input"
                      @input="ctx.updateSelectedSpriteHeading"
                    />
                  </label>
                  <div v-else-if="ctx.selectedSprite.rotationStyle === 'left-right'" class="direction-group" role="group" aria-label="Direction control">
                    <button
                      type="button"
                      :class="{ active: ctx.selectedSprite.heading < 0 }"
                      @click="ctx.updateSelectedSpriteLeftRight('left')"
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      :class="{ active: ctx.selectedSprite.heading >= 0 }"
                      @click="ctx.updateSelectedSpriteLeftRight('right')"
                    >
                      Right
                    </button>
                  </div>
                  <span class="quick-config-divider" aria-hidden="true"></span>
                  <button class="quick-config-back" type="button" aria-label="Back" @click="ctx.backToDefaultQuickConfig">
                    <span v-html="ctx.backQuickIcon"></span>
                  </button>
                </template>
                <template v-else>
                  <button class="quick-config-back" type="button" aria-label="Back" @click="ctx.backToDefaultQuickConfig">
                    <span v-html="ctx.backQuickIcon"></span>
                  </button>
                </template>
              </div>
      </template>
      <ProjectRunner v-show="ctx.runnerActive" ref="runnerRef" :project="ctx.project" :show-controls="false" />
    </div>
    <div v-if="ctx.publishStatusMessage !== ''" class="publish-toast" role="status">
      {{ ctx.publishStatusMessage }}
    </div>
  </section>
</template>

<style scoped>
.preview-card {
  flex: 0 0 auto;
  background: var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-lg);
  box-shadow: 0 1px 0 rgb(16 24 40 / 0.04);
  overflow: hidden;
}

.preview-title {
  flex: 1;
  color: var(--ui-color-title);
}

.preview-action-button {
  flex: 0 0 auto;
}

.preview-button-icon,
.preview-button-icon :deep(svg),
.preview-button-icon svg {
  width: 16px;
  height: 16px;
  display: block;
}

.preview-button-icon svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.stage-frame {
  position: relative;
  height: 354px;
  margin: 13px;
  overflow: hidden;
  border-radius: 6px;
  background: var(--ui-color-grey-300);
}

.stage-backdrop,
.stage-frame :deep(.relative) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.stage-backdrop {
  object-fit: cover;
}

.stage-sprite,
.selected-sprite {
  position: absolute;
}

.stage-sprite {
  width: 105px;
  height: 105px;
  cursor: grab;
  transform-origin: center;
}

.stage-sprite.dragging,
.selected-sprite.dragging {
  cursor: grabbing;
}

.corner.resizing {
  cursor: nwse-resize;
}

.stage-sprite img,
.selected-sprite img {
  position: absolute;
  left: 24px;
  top: 10px;
  width: 54px;
  user-select: none;
  -webkit-user-drag: none;
}

.selected-sprite {
  left: 178px;
  top: 108px;
  width: 105px;
  height: 105px;
  border: 1px solid var(--ui-color-primary-main);
  cursor: grab;
  transform-origin: center;
}

.coordinate {
  position: absolute;
  top: -28px;
  right: -18px;
  border-radius: 3px;
  background: rgb(89 117 66 / 0.78);
  color: white;
  padding: 4px 7px;
  font-size: 12px;
}

.handle,
.corner {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: white;
  border: 1px solid var(--ui-color-grey-400);
  box-shadow: var(--ui-box-shadow-sm);
}

.handle {
  width: 20px;
  height: 20px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.corner {
  padding: 0;
  cursor: nwse-resize;
}

.handle.active {
  background: white;
  border-color: var(--ui-color-grey-400);
}

.handle.left {
  left: -10px;
  top: 42px;
}

.handle.right {
  right: -10px;
  top: 42px;
}

.selected-sprite .handle-arrow {
  position: static;
  width: 6px;
  height: 8px;
  transform: rotate(180deg);
  user-select: none;
  -webkit-user-drag: none;
}

.selected-sprite .handle-arrow.disabled {
  transform: none;
}

.corner.top-left {
  left: -7px;
  top: -7px;
  cursor: nwse-resize;
}

.corner.bottom-left {
  left: -7px;
  bottom: -7px;
  cursor: nesw-resize;
}

.corner.top-right {
  right: -7px;
  top: -7px;
  cursor: nesw-resize;
}

.corner.bottom-right {
  right: -7px;
  bottom: -7px;
  cursor: nwse-resize;
}

.stage-tools {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 4px;
  border-radius: 8px;
  border: 2px solid var(--ui-color-grey-100);
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-lg);
}

.stage-tools.expanded {
  gap: 4px;
  padding: 4px;
}

.stage-tools button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--ui-border-radius-md);
  background: transparent;
  color: var(--ui-color-grey-1000);
}

.stage-tools button:hover {
  background: var(--ui-color-turquoise-200);
  color: var(--ui-color-turquoise-500);
}

.stage-tools button.active {
  background: var(--ui-color-primary-200);
  color: var(--ui-color-primary-main);
}

.quick-config-input {
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-300);
  padding: 0 8px;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  line-height: 20px;
}

.quick-config-input input {
  width: 44px;
  height: 24px;
  border: 0;
  background: transparent;
  color: var(--ui-color-grey-1000);
  text-align: center;
  font: inherit;
  outline: none;
}

.quick-config-input input:focus {
  outline: none;
}

.quick-config-input input::-webkit-outer-spin-button,
.quick-config-input input::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}

.quick-config-divider {
  width: 1px;
  height: 16px;
  background: var(--ui-color-grey-400);
}

.rotation-style-group,
.direction-group {
  height: 32px;
  display: inline-flex;
  overflow: hidden;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-300);
}

.rotation-style-button,
.direction-group button {
  background: transparent;
}

.rotation-style-button.active,
.direction-group button.active {
  background: var(--ui-color-primary-200);
  color: var(--ui-color-primary-400);
}

.direction-group button {
  width: auto;
  min-width: 48px;
  padding: 0 10px;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  font-weight: 500;
}

.heading-input input,
.position-input input {
  width: 52px;
}

.quick-layer-menu {
  position: absolute;
  left: 0;
  bottom: 44px;
  min-width: 152px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 6px;
  box-shadow: var(--ui-box-shadow-md);
}

.quick-layer-menu button {
  width: 100%;
  height: 32px;
  position: relative;
  justify-content: flex-start;
  padding: 0 8px;
  color: var(--ui-color-grey-1000);
  font-size: 13px;
  white-space: nowrap;
}

.quick-layer-menu button + button {
  margin-top: 13px;
}

.quick-layer-menu button + button::before {
  content: '';
  position: absolute;
  top: -7px;
  left: 0;
  width: 100%;
  border-top: 1px solid var(--ui-color-dividing-line-2);
}

.quick-config-back {
  color: var(--ui-color-grey-1000);
}

.stage-tools button span,
.stage-tools button :deep(svg) {
  width: 16px;
  height: 16px;
  display: block;
}

.publish-toast {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 3;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 8px 12px;
  color: var(--ui-color-grey-1000);
  font-size: 13px;
  line-height: 18px;
  box-shadow: var(--ui-box-shadow-sm);
}
</style>
