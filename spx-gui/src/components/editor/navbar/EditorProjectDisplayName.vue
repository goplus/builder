<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { cloudHelpers } from '@/models/common/cloud'
import { type SpxProject } from '@/models/spx/project'
import { UIIcon, UITooltip } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useI18n, type LocaleMessage } from '@/utils/i18n'

type AutoSaveStateIcon = {
  svg: string
  stateClass?: string
  desc: LocaleMessage
}

const props = defineProps<{
  project: SpxProject
  canEdit: boolean
  ownerDisplayName: string | null
  autoSaveStateIcon: AutoSaveStateIcon | null
}>()

const i18n = useI18n()
const isEditingProjectDisplayName = ref(false)
const isProjectPillHovering = ref(false)
const projectDisplayNameDraft = ref('')
const projectDisplayNameInputRef = ref<HTMLInputElement>()
const projectWrapRef = ref<HTMLElement>()

function resetProjectDisplayNameEditor() {
  isEditingProjectDisplayName.value = false
  isProjectPillHovering.value = false
  projectDisplayNameDraft.value = props.project.displayName ?? ''
}

watch(
  () => props.project.displayName,
  (displayName) => {
    if (!isEditingProjectDisplayName.value) {
      projectDisplayNameDraft.value = displayName ?? ''
    }
  },
  { immediate: true }
)

watch(
  () => props.project.id,
  () => resetProjectDisplayNameEditor()
)

watch(
  () => props.canEdit,
  (canEdit) => {
    if (!canEdit) resetProjectDisplayNameEditor()
  }
)

function handleStartEditProjectDisplayName() {
  if (!props.canEdit) return
  projectDisplayNameDraft.value = props.project.displayName ?? ''
  isEditingProjectDisplayName.value = true
  nextTick(() => {
    const input = projectDisplayNameInputRef.value
    if (input == null) return
    input.focus()
    const caretPosition = input.value.length
    input.setSelectionRange(caretPosition, caretPosition)
  })
}

function handleProjectPillClick() {
  if (isEditingProjectDisplayName.value) return
  handleStartEditProjectDisplayName()
}

function handleEditProjectDisplayNameClick(event: MouseEvent) {
  event.stopPropagation()
  handleStartEditProjectDisplayName()
}

function handleCancelProjectDisplayNameEdit() {
  if (submitProjectDisplayName.isLoading.value) return
  resetProjectDisplayNameEditor()
}

const submitProjectDisplayName = useMessageHandle(
  async () => {
    const nextDisplayName = projectDisplayNameDraft.value.trim()
    if (nextDisplayName === '') {
      resetProjectDisplayNameEditor()
      return
    }
    if (nextDisplayName === props.project.displayName) {
      resetProjectDisplayNameEditor()
      return
    }
    isEditingProjectDisplayName.value = false
    isProjectPillHovering.value = false
    const serialized = await props.project.export()
    const saved = await cloudHelpers.save({
      ...serialized,
      metadata: {
        ...serialized.metadata,
        displayName: nextDisplayName
      }
    })
    props.project.setMetadata(saved.metadata)
  },
  { en: 'Failed to update project display name', zh: '更新项目显示名失败' }
)

function handleSubmitProjectDisplayName() {
  if (!isEditingProjectDisplayName.value || submitProjectDisplayName.isLoading.value) return
  submitProjectDisplayName.fn()
}
</script>

<template>
  <div ref="projectWrapRef" class="project-wrap" :class="{ editing: isEditingProjectDisplayName }">
    <div
      v-radar="{
        name: 'Project display name trigger',
        desc: 'Click to start inline editing for project display name'
      }"
      :class="['project-pill', { editable: canEdit }]"
      :role="canEdit ? 'button' : undefined"
      :tabindex="canEdit ? 0 : -1"
      @mouseenter="isProjectPillHovering = true"
      @mouseleave="isProjectPillHovering = false"
      @click="handleProjectPillClick"
      @keydown.enter.self.prevent="handleProjectPillClick"
      @keydown.space.self.prevent="handleProjectPillClick"
    >
      <div v-if="ownerDisplayName != null" class="owner-info">{{ ownerDisplayName }}</div>
      <div v-if="!isEditingProjectDisplayName" class="name-text">{{ project.displayName }}</div>
      <input
        v-else
        ref="projectDisplayNameInputRef"
        v-model="projectDisplayNameDraft"
        v-radar="{ name: 'Project display name input', desc: 'Input field for project display name' }"
        class="name-input"
        :aria-label="$t({ en: 'Project display name', zh: '项目显示名' })"
        type="text"
        @keydown.enter.prevent="handleSubmitProjectDisplayName"
        @keydown.esc.prevent="handleCancelProjectDisplayNameEdit"
        @blur="handleSubmitProjectDisplayName"
      />
      <button
        v-if="canEdit && isProjectPillHovering && !isEditingProjectDisplayName"
        v-radar="{
          name: 'Edit project display name',
          desc: 'Click to start inline editing for project display name'
        }"
        class="icon-btn edit-icon"
        type="button"
        :aria-label="$t({ en: 'Edit project display name', zh: '修改项目显示名' })"
        @click="handleEditProjectDisplayNameClick"
      >
        <UIIcon class="edit-display-name-icon" type="edit" />
      </button>
    </div>
    <div v-if="autoSaveStateIcon != null" class="auto-save-state icon-btn">
      <UITooltip placement="right">
        <template #trigger>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div :class="['icon', autoSaveStateIcon.stateClass]" v-html="autoSaveStateIcon.svg"></div>
        </template>
        {{ i18n.t(autoSaveStateIcon.desc) }}
      </UITooltip>
    </div>
  </div>
</template>

<style scoped>
.project-wrap {
  width: 370px;
  min-width: 320px;
  max-width: min(370px, 45vw);
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 12px;
}

.project-pill {
  height: 34px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 3px 12px;
  transition: all 120ms ease;
  border: 1px solid transparent;
  background: transparent;
  cursor: default;
  max-width: 100%;
}

.owner-info,
.name-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 16px;
}

.name-text {
  max-width: 220px;
  color: var(--ui-color-grey-1000);
}

.name-input {
  font-size: 16px;
  width: 220px;
  max-width: 220px;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ui-color-title);
  font-family: inherit;
  padding: 0;
  margin: 0;
  display: none;
  caret-color: var(--ui-color-primary-main);
}

.owner-info::after {
  content: '/';
  margin: 0 4px;
}

.icon-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  line-height: 0;
  color: var(--ui-color-grey-1000);
}

.edit-icon {
  display: none;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
}

.edit-icon:hover,
.edit-icon:focus-visible {
  background: var(--ui-color-grey-200);
}

.edit-display-name-icon {
  width: 16px;
  height: 16px;
  color: var(--ui-color-grey-1000);
}

.project-pill.editable:hover {
  background: var(--ui-color-grey-200);
  cursor: pointer;
}

.project-pill.editable:hover .name-text {
  font-weight: 400;
}

.project-pill.editable:hover .edit-icon {
  display: inline-flex;
}

.project-wrap.editing .project-pill {
  background: var(--ui-color-grey-200);
  cursor: text;
  border-color: var(--ui-color-grey-400);
  gap: 1px;
}

.project-wrap.editing .name-text {
  display: none;
}

.project-wrap.editing .name-input {
  display: inline-block;
}

.icon {
  display: flex;
}

.icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.auto-save-state {
  cursor: default;
}

.auto-save-state .icon {
  width: 24px;
  height: 24px;
}

.auto-save-state .icon.pending :deep(svg) path,
.auto-save-state .icon.saving :deep(svg) path {
  stroke-dasharray: 2;
}

.auto-save-state .icon.saving :deep(svg) path {
  animation: dash 1s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: 24;
  }
}

@media (max-width: 960px) {
  .project-wrap {
    width: auto;
    max-width: 60vw;
    min-width: 200px;
  }

  .name-text {
    width: 120px;
    max-width: 120px;
  }

  .name-input {
    width: 120px;
    max-width: 120px;
  }
}
</style>
