<script setup lang="ts">
import { computed, ref } from 'vue'

import UIButton from '@/components/ui/UIButton.vue'
import animationIcon from '@/assets/editor/sprite-generator/animation.svg?raw'
import closeIcon from '@/assets/editor/ui-icons/close.svg?raw'
import costumeIcon from '@/assets/editor/sprite-generator/costume.svg?raw'
import editIcon from '@/assets/editor/ui-icons/edit.svg?raw'
import moreIcon from '@/assets/editor/ui-icons/more.svg?raw'
import plusIcon from '@/assets/editor/ui-icons/plus.svg?raw'
import artStyleIconUrl from '@/assets/editor/sprite-generator/param-settings/art-style.svg'
import categoryIconUrl from '@/assets/editor/sprite-generator/param-settings/category.svg'
import perspectiveIconUrl from '@/assets/editor/sprite-generator/param-settings/perspective.svg'
import phaseSettingsLeftBottomBgUrl from '@/assets/editor/sprite-generator/phase-settings-left-bottom-bg.png'
import phaseSettingsRightTopBgUrl from '@/assets/editor/sprite-generator/phase-settings-right-top-bg.png'
import flowerUrl from '@/assets/projects/niu-run/editor/sprite-flower.png'
import niuXiaoQiUrl from '@/assets/projects/niu-run/editor/sprite-niu-xiao-qi.png'
import tornadoUrl from '@/assets/projects/niu-run/editor/sprite-tornado.svg'

export type GeneratedSpriteCandidate = {
  name: string
  image: string
}

export type SpriteGeneratorResult = {
  description: string
  candidate: GeneratedSpriteCandidate
}

const emit = defineEmits<{
  close: []
  'add-sprite': [SpriteGeneratorResult]
}>()

const description = ref('')
const category = ref('Character')
const artStyle = ref('Cartoon')
const perspective = ref('Side')
const generated = ref(false)
const selectedIndex = ref(0)
const phase = ref<'settings' | 'content'>('settings')

const candidates: GeneratedSpriteCandidate[] = [
  { name: 'Generated flower sprite', image: flowerUrl },
  { name: 'Generated calf sprite', image: niuXiaoQiUrl },
  { name: 'Generated windy sprite', image: tornadoUrl }
]

const selectedCandidate = computed(() => candidates[selectedIndex.value] ?? candidates[0])

function generateCandidates() {
  if (description.value.trim() === '') return
  generated.value = true
  selectedIndex.value = 0
}

function openContentPhase() {
  if (!generated.value) return
  phase.value = 'content'
}

function addGeneratedSprite() {
  if (!generated.value) return
  emit('add-sprite', {
    description: description.value.trim(),
    candidate: selectedCandidate.value
  })
}
</script>

<template>
  <Teleport to="body">
    <div class="prototype-modal-backdrop" role="presentation" @click.self="emit('close')">
      <section
        class="prototype-modal sprite-gen-modal"
        style="width: 1076px; height: 800px"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sprite-gen-title"
      >
        <header class="sprite-gen-header">
          <h2 id="sprite-gen-title">Sprite Generator</h2>
          <button type="button" aria-label="Close sprite generator" @click="emit('close')" v-html="closeIcon"></button>
        </header>
        <div
          v-if="phase === 'settings'"
          class="sprite-gen-body"
          :class="{ 'has-preview': generated }"
          :style="{
            '--sprite-gen-left-bg': `url(${phaseSettingsLeftBottomBgUrl})`,
            '--sprite-gen-right-bg': `url(${phaseSettingsRightTopBgUrl})`
          }"
        >
          <section class="sprite-gen-main-panel">
            <form class="sprite-gen-settings" @submit.prevent="generateCandidates">
              <label class="sprite-gen-description" aria-label="Sprite description field">
                <textarea
                  v-model="description"
                  aria-label="Sprite description"
                  placeholder="Please enter description"
                ></textarea>
                <div class="sprite-gen-description-footer">
                  <div class="sprite-gen-controls">
                    <label>
                      <img class="sprite-gen-control-icon" :src="categoryIconUrl" alt="" aria-hidden="true" />
                      <span>Category</span>
                      <select v-model="category" aria-label="Sprite category">
                        <option>Character</option>
                        <option>Object</option>
                        <option>Effect</option>
                      </select>
                    </label>
                    <label>
                      <img class="sprite-gen-control-icon" :src="artStyleIconUrl" alt="" aria-hidden="true" />
                      <span>Art style</span>
                      <select v-model="artStyle" aria-label="Sprite art style">
                        <option>Cartoon</option>
                        <option>Pixel</option>
                        <option>Watercolor</option>
                      </select>
                    </label>
                    <label>
                      <img class="sprite-gen-control-icon" :src="perspectiveIconUrl" alt="" aria-hidden="true" />
                      <span>Perspective</span>
                      <select v-model="perspective" aria-label="Sprite perspective">
                        <option>Side</option>
                        <option>Top-down</option>
                        <option>Front</option>
                      </select>
                    </label>
                  </div>
                  <UIButton
                    class="sprite-gen-action"
                    type="primary"
                    size="large"
                    :disabled="description.trim() === ''"
                    @click="generateCandidates"
                  >
                    {{ generated ? 'Regenerate' : 'Generate' }}
                  </UIButton>
                </div>
              </label>
            </form>
            <section v-if="generated" class="sprite-gen-results" aria-label="Generated sprite candidates">
              <button
                v-for="(candidate, index) in candidates"
                :key="candidate.name"
                class="sprite-gen-candidate"
                :class="{ active: selectedIndex === index }"
                type="button"
                @click="selectedIndex = index"
              >
                <img :src="candidate.image" :alt="candidate.name" />
                <span>{{ candidate.name }}</span>
              </button>
            </section>
          </section>
          <section v-if="generated" class="sprite-gen-preview-panel" aria-label="Generated sprite preview">
            <div class="sprite-gen-preview-card">
              <img :src="selectedCandidate.image" :alt="selectedCandidate.name" />
            </div>
          </section>
        </div>
        <div v-else class="sprite-gen-content-body" aria-label="Generated sprite content editor">
          <aside class="sprite-gen-content-sidebar">
            <section class="sprite-gen-content-section">
              <h3>Costume</h3>
              <div class="sprite-gen-content-grid">
                <button class="sprite-gen-content-item active" type="button" aria-label="default costume">
                  <span class="sprite-gen-more-button" aria-hidden="true" v-html="moreIcon"></span>
                  <img :src="selectedCandidate.image" alt="" />
                  <span>default</span>
                </button>
                <button class="sprite-gen-content-item" type="button" aria-label="winter-outfit costume">
                  <span class="sprite-gen-placeholder-icon" aria-hidden="true" v-html="costumeIcon"></span>
                  <span>winter-outfit</span>
                </button>
                <button class="sprite-gen-content-item" type="button" aria-label="sporty-outfit costume">
                  <span class="sprite-gen-placeholder-icon" aria-hidden="true" v-html="costumeIcon"></span>
                  <span>sporty-outfit</span>
                </button>
                <button class="sprite-gen-content-item add" type="button" aria-label="Add costume" v-html="plusIcon"></button>
              </div>
            </section>
            <section class="sprite-gen-content-section">
              <h3>Animation</h3>
              <div class="sprite-gen-content-grid">
                <button
                  v-for="animation in ['idle', 'walk', 'jump', 'wave']"
                  :key="animation"
                  class="sprite-gen-content-item"
                  type="button"
                  :aria-label="`${animation} animation`"
                >
                  <span class="sprite-gen-placeholder-icon" aria-hidden="true" v-html="animationIcon"></span>
                  <span>{{ animation }}</span>
                </button>
                <button class="sprite-gen-content-item add" type="button" aria-label="Add animation" v-html="plusIcon"></button>
              </div>
            </section>
            <section class="sprite-gen-content-prompt" aria-label="Sprite generation prompt">
              <p>{{ description }}</p>
              <p>The character is in an idle state, neutral pose.</p>
              <div class="sprite-gen-content-settings" aria-label="Generation settings">
                <button type="button" aria-label="Category"><img :src="categoryIconUrl" alt="" /></button>
                <button type="button" aria-label="Art style"><img :src="artStyleIconUrl" alt="" /></button>
                <button type="button" aria-label="Perspective"><img :src="perspectiveIconUrl" alt="" /></button>
              </div>
            </section>
          </aside>
          <section class="sprite-gen-content-preview" aria-label="Selected costume preview">
            <header>
              <span>default</span>
              <button type="button" aria-label="Rename default costume" v-html="editIcon"></button>
            </header>
            <div class="sprite-gen-preview-card">
              <img :src="selectedCandidate.image" :alt="selectedCandidate.name" />
            </div>
          </section>
        </div>
        <footer class="sprite-gen-footer" :class="{ content: phase === 'content' }">
          <UIButton
            v-if="phase === 'content'"
            class="sprite-gen-minimize"
            type="secondary"
            size="large"
            @click="emit('close')"
          >
            Minimize
          </UIButton>
          <UIButton
            class="sprite-gen-action"
            type="primary"
            size="large"
            :disabled="!generated"
            @click="phase === 'settings' ? openContentPhase() : addGeneratedSprite()"
          >
            <template v-if="phase === 'settings'">
            Next
            </template>
            <template v-else>
              Use
            </template>
          </UIButton>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.prototype-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  background: rgb(31 41 55 / 36%);
  padding: 24px;
}

.prototype-modal {
  border-radius: var(--ui-border-radius-lg);
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-lg);
}

.sprite-gen-modal {
  position: relative;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.sprite-gen-header {
  flex: 0 0 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--ui-color-grey-400);
  padding: 0 24px;
}

.sprite-gen-header h2 {
  margin: 0;
  color: var(--ui-color-grey-1000);
  font-size: 20px;
  font-weight: 400;
  line-height: 28px;
}

.sprite-gen-header button {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ui-color-grey-800);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.sprite-gen-header button :deep(svg) {
  width: 20px;
  height: 20px;
}

.sprite-gen-header button:hover {
  background: var(--ui-color-grey-300);
  color: var(--ui-color-grey-1000);
}

.sprite-gen-body {
  position: relative;
  min-height: 0;
  flex: 1 1 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  background-color: var(--ui-color-grey-100);
  background-image: var(--sprite-gen-left-bg), var(--sprite-gen-right-bg);
  background-position:
    left bottom,
    right -50px;
  background-repeat: no-repeat, no-repeat;
  background-size:
    520px auto,
    180px auto;
  padding: 136px 56px 76px;
}

.sprite-gen-body.has-preview {
  justify-content: flex-start;
  gap: 20px;
  padding: 24px 26px 76px;
}

.sprite-gen-main-panel {
  width: 584px;
  max-width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
  transition: width 0.2s ease;
}

.sprite-gen-body.has-preview .sprite-gen-main-panel {
  width: 414px;
  justify-content: flex-start;
}

.sprite-gen-settings {
  display: flex;
  flex-direction: column;
}

.sprite-gen-description {
  min-height: 172px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  border: 1px solid var(--ui-color-turquoise-500);
  border-radius: var(--ui-border-radius-lg);
  background: var(--ui-color-grey-100);
  padding: 16px;
  transition: border-color 0.2s ease;
}

.sprite-gen-body.has-preview .sprite-gen-description {
  min-height: 332px;
}

.sprite-gen-description:focus-within {
  border-color: var(--ui-color-turquoise-500);
}

.sprite-gen-description textarea {
  min-height: 92px;
  flex: 1;
  border: 0;
  outline: 0;
  resize: none;
  color: var(--ui-color-grey-1000);
  font: inherit;
  font-size: 14px;
  line-height: 22px;
  background: transparent;
  caret-color: var(--ui-color-turquoise-500);
}

.sprite-gen-description textarea::placeholder {
  color: var(--ui-color-grey-700);
}

.sprite-gen-description-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.sprite-gen-controls {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.sprite-gen-body.has-preview .sprite-gen-controls {
  flex-wrap: nowrap;
  gap: 8px;
}

.sprite-gen-controls label {
  position: relative;
  min-width: 0;
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  color: var(--ui-color-grey-900);
  font-size: 14px;
  line-height: 22px;
  padding: 0 12px;
}

.sprite-gen-body.has-preview .sprite-gen-controls label {
  width: 32px;
  height: 32px;
  justify-content: center;
  gap: 0;
  padding: 0;
}

.sprite-gen-body.has-preview .sprite-gen-controls label > span {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.sprite-gen-controls select {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.sprite-gen-control-icon {
  width: 16px;
  height: 16px;
  display: inline-grid;
  place-items: center;
  color: var(--ui-color-grey-800);
  font-size: 15px;
  line-height: 16px;
}

.sprite-gen-body.has-preview .sprite-gen-control-icon {
  width: 24px;
  height: 24px;
}

.sprite-gen-results {
  min-height: 144px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-content: start;
  gap: 12px;
}

.sprite-gen-preview-panel {
  min-width: 0;
  flex: 1 1 auto;
  display: grid;
  place-items: center;
  padding-left: 26px;
}

.sprite-gen-preview-card {
  width: min(100%, 636px);
  height: 596px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--ui-color-grey-100);
  background-image:
    linear-gradient(45deg, var(--ui-color-grey-300) 25%, transparent 25%),
    linear-gradient(-45deg, var(--ui-color-grey-300) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--ui-color-grey-300) 75%),
    linear-gradient(-45deg, transparent 75%, var(--ui-color-grey-300) 75%);
  background-position:
    0 0,
    0 12px,
    12px -12px,
    -12px 0;
  background-size: 24px 24px;
  padding: 24px;
}

.sprite-gen-preview-card img {
  max-width: 72%;
  max-height: 82%;
  object-fit: contain;
}

.sprite-gen-content-body {
  min-height: 0;
  flex: 1 1 0;
  display: grid;
  grid-template-columns: 414px minmax(0, 1fr);
  background: var(--ui-color-grey-100);
}

.sprite-gen-content-sidebar {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 32px;
  overflow-y: auto;
  border-right: 1px solid var(--ui-color-grey-400);
  padding: 24px 28px 112px;
}

.sprite-gen-content-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sprite-gen-content-section h3 {
  margin: 0;
  color: var(--ui-color-grey-1000);
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
}

.sprite-gen-content-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.sprite-gen-content-item {
  position: relative;
  min-width: 0;
  height: 86px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  color: var(--ui-color-grey-1000);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  padding: 8px;
  cursor: pointer;
}

.sprite-gen-content-item.active {
  border: 2px solid var(--ui-color-primary-main);
  background: var(--ui-color-primary-100);
  color: var(--ui-color-primary-main);
  padding: 7px;
}

.sprite-gen-content-item.add {
  color: var(--ui-color-primary-main);
}

.sprite-gen-content-item.add :deep(svg) {
  width: 28px;
  height: 28px;
}

.sprite-gen-content-item img {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.sprite-gen-content-item span:last-child {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sprite-gen-placeholder-icon {
  width: 24px;
  height: 24px;
  color: var(--ui-color-grey-700);
}

.sprite-gen-placeholder-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.sprite-gen-more-button {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--ui-color-primary-main);
  color: var(--ui-color-grey-100);
}

.sprite-gen-more-button :deep(svg) {
  width: 18px;
  height: 18px;
}

.sprite-gen-content-prompt {
  min-height: 178px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 20px 16px;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  line-height: 24px;
}

.sprite-gen-content-prompt p {
  margin: 0;
}

.sprite-gen-content-settings {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
}

.sprite-gen-content-settings button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 0;
}

.sprite-gen-content-settings img {
  width: 24px;
  height: 24px;
}

.sprite-gen-content-preview {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 26px 96px;
}

.sprite-gen-content-preview header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--ui-color-grey-900);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.sprite-gen-content-preview header button {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: var(--ui-color-grey-800);
  padding: 0;
}

.sprite-gen-content-preview header button :deep(svg) {
  width: 20px;
  height: 20px;
}

.sprite-gen-content-preview .sprite-gen-preview-card {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.sprite-gen-candidate {
  position: relative;
  min-width: 0;
  height: 132px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 10px 8px 30px;
  color: var(--ui-color-grey-1000);
}

.sprite-gen-candidate.active {
  border: 2px solid var(--ui-color-primary-main);
  background: var(--ui-color-primary-100);
  padding: 9px 7px 29px;
}

.sprite-gen-candidate img {
  width: 72px;
  height: 72px;
  object-fit: contain;
}

.sprite-gen-candidate span {
  position: absolute;
  right: 8px;
  bottom: 10px;
  left: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}

.sprite-gen-footer {
  position: absolute;
  right: 24px;
  bottom: 20px;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  pointer-events: none;
}

.sprite-gen-footer.content {
  gap: 16px;
}

.sprite-gen-footer > * {
  pointer-events: auto;
}

.sprite-gen-minimize {
  min-width: 112px;
}

.sprite-gen-action:disabled {
  border-color: transparent;
  background: var(--ui-color-grey-300);
  color: var(--ui-color-grey-600);
}
</style>
