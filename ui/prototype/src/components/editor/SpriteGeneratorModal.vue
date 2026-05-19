<script setup lang="ts">
import { computed, ref } from 'vue'

import UIButton from '@/components/ui/UIButton.vue'
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
          <button type="button" aria-label="Close sprite generator" @click="emit('close')">x</button>
        </header>
        <div class="sprite-gen-body" :class="{ 'has-preview': generated }">
          <section class="sprite-gen-main-panel">
            <form class="sprite-gen-settings" @submit.prevent="generateCandidates">
              <label class="sprite-gen-description">
                <span>Description</span>
                <textarea
                  v-model="description"
                  aria-label="Sprite description"
                  placeholder="Describe a sprite to generate"
                ></textarea>
              </label>
              <div class="sprite-gen-controls">
                <label>
                  <span>Category</span>
                  <select v-model="category" aria-label="Sprite category">
                    <option>Character</option>
                    <option>Object</option>
                    <option>Effect</option>
                  </select>
                </label>
                <label>
                  <span>Art style</span>
                  <select v-model="artStyle" aria-label="Sprite art style">
                    <option>Cartoon</option>
                    <option>Pixel</option>
                    <option>Watercolor</option>
                  </select>
                </label>
                <label>
                  <span>Perspective</span>
                  <select v-model="perspective" aria-label="Sprite perspective">
                    <option>Side</option>
                    <option>Top-down</option>
                    <option>Front</option>
                  </select>
                </label>
              </div>
              <UIButton type="primary" size="large" :disabled="description.trim() === ''" @click="generateCandidates">
                {{ generated ? 'Regenerate' : 'Generate' }}
              </UIButton>
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
              <span>{{ selectedCandidate.name }}</span>
            </div>
          </section>
        </div>
        <footer class="sprite-gen-footer">
          <UIButton type="white" size="large" @click="emit('close')">Cancel</UIButton>
          <UIButton type="primary" size="large" :disabled="!generated" @click="addGeneratedSprite">
            Use
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
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
}

.sprite-gen-header button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: var(--ui-border-radius-md);
  background: transparent;
  color: var(--ui-color-grey-800);
  font-size: 24px;
  line-height: 1;
}

.sprite-gen-header button:hover {
  background: var(--ui-color-grey-300);
  color: var(--ui-color-grey-1000);
}

.sprite-gen-body {
  min-height: 0;
  flex: 1 1 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  padding: 20px;
}

.sprite-gen-body.has-preview {
  justify-content: flex-start;
  gap: 20px;
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
  width: 416px;
  justify-content: flex-start;
}

.sprite-gen-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sprite-gen-description {
  min-height: 172px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 12px;
}

.sprite-gen-description span,
.sprite-gen-controls span {
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  line-height: 22px;
}

.sprite-gen-description textarea {
  min-height: 112px;
  flex: 1;
  border: 0;
  outline: 0;
  resize: none;
  color: var(--ui-color-grey-1000);
  font: inherit;
  line-height: 22px;
}

.sprite-gen-description textarea::placeholder {
  color: var(--ui-color-grey-700);
}

.sprite-gen-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.sprite-gen-controls label {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sprite-gen-controls select {
  width: 100%;
  height: 36px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  color: var(--ui-color-grey-1000);
  font: inherit;
  line-height: 22px;
  padding: 0 12px;
}

.sprite-gen-results {
  min-height: 170px;
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
  border-left: 1px solid var(--ui-color-grey-400);
  padding-left: 20px;
}

.sprite-gen-preview-card {
  width: min(100%, 440px);
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-200);
  padding: 24px;
  color: var(--ui-color-grey-800);
  font-size: 14px;
  line-height: 22px;
  text-align: center;
}

.sprite-gen-preview-card img {
  max-width: 240px;
  max-height: 280px;
  object-fit: contain;
}

.sprite-gen-candidate {
  min-width: 0;
  height: 132px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 8px;
  color: var(--ui-color-grey-1000);
}

.sprite-gen-candidate.active {
  border: 2px solid var(--ui-color-primary-main);
  background: var(--ui-color-primary-100);
  padding: 7px;
}

.sprite-gen-candidate img {
  width: 72px;
  height: 72px;
  object-fit: contain;
}

.sprite-gen-candidate span {
  width: 100%;
  overflow: hidden;
  margin-top: 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}

.sprite-gen-footer {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  border-top: 1px solid var(--ui-color-grey-400);
  padding: 16px 24px;
}
</style>
