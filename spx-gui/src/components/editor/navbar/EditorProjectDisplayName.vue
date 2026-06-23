<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import { useNetwork } from '@/utils/network'
import { cloudHelpers } from '@/models/common/cloud'
import { type SpxProject } from '@/models/spx/project'
import { useSignedInUser, useUser } from '@/stores/user'
import { projectDisplayNameMaxLength } from '@/apis/project'
import { UIIcon, UITextInput } from '@/components/ui'

const props = defineProps<{
  project: SpxProject
}>()

const { isOnline } = useNetwork()

const currentUser = useSignedInUser()
const isOwnedByCurrentUser = computed(() => {
  const currentUsername = currentUser.value?.username
  const projectOwnerUsername = props.project.owner
  if (currentUsername == null || projectOwnerUsername == null) return false
  return currentUsername === projectOwnerUsername
})

const editable = computed(() => isOwnedByCurrentUser.value && isOnline.value)
const { data: projectOwner } = useUser(() => props.project.owner ?? null)
const ownerDisplayName = computed(() => {
  if (isOwnedByCurrentUser.value) return null // Don't display owner info if the project is owned by the current user
  return projectOwner.value?.displayName ?? null
})

const displayName = ref(props.project.displayName)
const editing = ref(false)
const inputRef = ref<InstanceType<typeof UITextInput>>()

/**
 * Reset editing state:
 * - clear displayName changes
 * - exit editing mode
 */
function reset() {
  editing.value = false
  displayName.value = props.project.displayName
}

// Keep displayName in sync with project.displayName when not editing
watch(
  () => props.project.displayName,
  (newName) => {
    if (!editing.value) displayName.value = newName
  }
)
// Reset editing state if the project changed
watch(() => props.project.id, reset)
// If it becomes non-editable while editing (e.g. goes offline), cancel the edit
watch(editable, (editable) => !editable && reset())

async function handleEdit() {
  if (!editable.value) return
  editing.value = true
  await nextTick() // Wait for the input to be ready
  const input = inputRef.value?.getInputElement()
  if (input == null) return
  input.focus()
  const caretPosition = input.value.length
  input.setSelectionRange(caretPosition, caretPosition)
}

const handleSubmit = useMessageHandle(
  async () => {
    const project = props.project
    const newName = displayName.value.trim()
    if (newName === '' || newName === project.displayName) {
      reset()
      return
    }
    if (newName.length > projectDisplayNameMaxLength) {
      throw new DefaultException({
        en: `The project display name must be ${projectDisplayNameMaxLength} characters or fewer`,
        zh: `项目显示名不能超过 ${projectDisplayNameMaxLength} 字`
      })
    }
    try {
      editing.value = false // Optimistically update UI before the async operation
      const serialized = await project.export()
      const saved = await cloudHelpers.save({
        ...serialized,
        metadata: {
          ...serialized.metadata,
          displayName: newName
        }
      })
      project.setMetadata(saved.metadata)
    } catch (e) {
      reset()
      throw e
    }
  },
  { en: 'Failed to update project display name', zh: '更新项目显示名失败' }
).fn

function handleInputBlur() {
  if (!editing.value) return // Ignore blurring caused by form submission.
  handleSubmit()
}

function handleInputEsc() {
  if (!editing.value) return
  reset()
}
</script>

<template>
  <div class="max-w-62 flex items-center text-title text-xl">
    <div v-if="!editable" class="flex-1 truncate">
      <template v-if="ownerDisplayName != null">{{ ownerDisplayName }} /</template>
      {{ displayName }}
    </div>
    <template v-else>
      <div
        v-radar="{
          name: 'Project display name trigger',
          desc: 'Click to start inline editing for project display name'
        }"
        class="flex-1 min-w-0 group px-3 py-0.75 flex items-center gap-2 rounded-md cursor-pointer transition-colors hover:bg-grey-400"
        :class="editing ? 'hidden' : ''"
        tabindex="0"
        role="button"
        @click="handleEdit"
        @keydown.enter.self.prevent="handleEdit"
        @keydown.space.self.prevent="handleEdit"
      >
        <span class="flex-1 truncate">{{ displayName }}</span>
        <button
          class="hidden w-4 h-4 border-none bg-transparent rounded-sm p-0 cursor-pointer group-hover:block group-focus:block"
          type="button"
          @click.stop="handleEdit"
        >
          <UIIcon class="w-full h-full" type="edit" />
        </button>
      </div>
      <form :class="editing ? '' : 'hidden'" novalidate @submit.prevent="handleSubmit">
        <UITextInput
          ref="inputRef"
          v-model:value="displayName"
          v-radar="{ name: 'Project display name input', desc: 'Input field for project display name' }"
          class="w-62 text-xl"
          @keydown.esc.prevent="handleInputEsc"
          @blur="handleInputBlur"
        />
      </form>
    </template>
  </div>
</template>
