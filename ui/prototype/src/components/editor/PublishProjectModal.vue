<script setup lang="ts">
import { ref } from 'vue'

import UIButton from '@/components/ui/UIButton.vue'
import UIFormModal from '@/components/ui/UIFormModal.vue'

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
  <UIFormModal
    class="publish-modal"
    :title="`Publish ${projectDisplayName}`"
    :visible="true"
    :mask-closable="!submitting"
    @update:visible="requestClose"
  >
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
  </UIFormModal>
</template>

<style scoped>
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
}

.publish-modal-body {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
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
