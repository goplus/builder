<script setup lang="ts">
import { ref } from 'vue'

import UIButton from '@/components/ui/UIButton.vue'
import closeIcon from '@/assets/editor/ui-icons/close.svg?raw'

const props = defineProps<{
  projectDisplayName: string
  thumbnail: string
  initialProjectDescription: string
  initialProjectInstructions: string
  submitting: boolean
}>()

const emit = defineEmits<{
  close: []
  publish: []
}>()

const releaseDescription = ref('Adjusted movement timing and refreshed the local thumbnail.')
const projectDescription = ref(props.initialProjectDescription)
const projectInstructions = ref(props.initialProjectInstructions)

function requestClose() {
  if (props.submitting) return
  emit('close')
}

function requestPublish() {
  if (releaseDescription.value.trim() === '' || props.submitting) return
  emit('publish')
}
</script>

<template>
  <Teleport to="body">
    <div class="prototype-modal-backdrop" role="presentation" @click.self="requestClose">
      <section class="prototype-modal publish-modal" role="dialog" aria-modal="true" aria-labelledby="publish-project-title">
        <header class="publish-modal-header">
          <h2 id="publish-project-title">Publish {{ projectDisplayName }}</h2>
          <button type="button" aria-label="Close" @click="requestClose" v-html="closeIcon"></button>
        </header>
        <div class="publish-modal-body">
          <p>Published projects will be visible to all XBuilder users.</p>
          <div class="publish-preview">
            <img :src="thumbnail" :alt="projectDisplayName" />
          </div>
          <form class="prototype-form publish-form" @submit.prevent="requestPublish">
            <label class="prototype-field">
              <span>Release description</span>
              <textarea
                v-model="releaseDescription"
                aria-label="Release description"
                placeholder="What is new in this release?"
                required
              ></textarea>
            </label>
            <label class="prototype-field">
              <span>Project description</span>
              <textarea
                v-model="projectDescription"
                aria-label="Project description"
                placeholder="What is this project about? How did you make it?"
              ></textarea>
            </label>
            <label class="prototype-field">
              <span>Play instructions</span>
              <textarea
                v-model="projectInstructions"
                aria-label="Play instructions"
                placeholder="Tell others how to play in your project"
              ></textarea>
            </label>
            <footer class="prototype-modal-actions">
              <UIButton type="neutral" size="medium" :disabled="submitting" @click="requestClose">Cancel</UIButton>
              <UIButton
                type="primary"
                size="medium"
                :loading="submitting"
                :disabled="releaseDescription.trim() === ''"
                @click="requestPublish"
              >
                Publish
              </UIButton>
            </footer>
          </form>
        </div>
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

.prototype-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 40px;
}

.prototype-form {
  display: flex;
  flex-direction: column;
}

.prototype-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  line-height: 20px;
}

.prototype-field > span {
  color: var(--ui-color-grey-800);
}

.prototype-field textarea {
  min-height: 108px;
  border: 0;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-300);
  box-shadow: inset 0 0 0 1px var(--ui-color-grey-300);
  padding: 8px 12px;
  color: var(--ui-color-grey-1000);
  font: inherit;
  outline: none;
  resize: vertical;
}

.prototype-field textarea:focus {
  background: var(--ui-color-grey-100);
  box-shadow: inset 0 0 0 1px var(--ui-color-primary-main);
}

.publish-modal {
  width: 560px;
  max-height: min(760px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.publish-modal-header {
  flex: 0 0 56px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--ui-color-grey-400);
  padding: 0 24px;
}

.publish-modal-header h2 {
  flex: 1;
  margin: 0;
  color: var(--ui-color-grey-1000);
  font-size: 20px;
  font-weight: 400;
  line-height: 28px;
}

.publish-modal-header button {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--ui-border-radius-md);
  background: transparent;
  color: var(--ui-color-grey-800);
  padding: 0;
  cursor: pointer;
}

.publish-modal-header button:hover {
  background: var(--ui-color-grey-300);
  color: var(--ui-color-grey-1000);
}

.publish-modal-header button :deep(svg),
.publish-modal-header button svg {
  width: 20px;
  height: 20px;
}

.publish-modal-body {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 20px 24px 24px;
}

.publish-preview {
  height: 224px;
  overflow: hidden;
  margin: 24px 0;
  border-radius: var(--ui-border-radius-sm);
  background: var(--ui-color-grey-300);
}

.publish-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.publish-form {
  gap: 16px;
}
</style>
