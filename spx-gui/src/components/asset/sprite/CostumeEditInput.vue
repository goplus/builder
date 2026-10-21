<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { CostumeGen } from '@/models/spx/gen/costume-gen'
import { UIButton, UIDropdown, UIIcon } from '@/components/ui'
import SettingsInput from '../gen/common/SettingsInput.vue'

const props = defineProps<{
  gen: CostumeGen
  instruction: string
  commenting: boolean
  submit?: () => Promise<void>
}>()

const emit = defineEmits<{
  'update:instruction': [string]
  'update:commenting': [boolean]
}>()

const submitting = computed(() => props.gen.generateState.status === 'running')
const disabled = computed(() => submitting.value || props.gen.finishState.status === 'running')
const commentsVisible = ref(false)
const commentButton = ref<InstanceType<typeof UIButton> | null>(null)
watch([() => props.gen, disabled], () => (commentsVisible.value = false))
watch(
  () => props.gen.editComments.length,
  (count, previousCount) => {
    if (count !== 0 || previousCount === 0) return
    commentsVisible.value = false
    emit('update:commenting', false)
    nextTick(() => commentButton.value?.focus())
  }
)

function toggleCommenting() {
  if (props.gen.editComments.length > 0) {
    emit('update:commenting', true)
    commentsVisible.value = !commentsVisible.value
  } else {
    emit('update:commenting', !props.commenting)
    commentsVisible.value = false
  }
}

function removeComment(id: string) {
  props.gen.setEditComments(props.gen.editComments.filter((comment) => comment.id !== id))
  if (props.gen.editComments.length > 0) nextTick(() => commentButton.value?.focus())
}

const handleSubmit = useMessageHandle(() => props.submit?.() ?? props.gen.edit(props.instruction), {
  en: 'Failed to edit costume',
  zh: '修改造型失败'
}).fn
</script>

<template>
  <SettingsInput
    v-radar="{ name: 'Costume edit instructions', desc: 'Describe changes to the selected costume' }"
    :description="instruction"
    :placeholder="$t({ en: 'Describe changes to this costume', zh: '描述对当前造型的修改' })"
    :enrichable="false"
    :disabled="disabled"
    @update:description="emit('update:instruction', $event)"
  >
    <template #extra>
      <UIDropdown v-model:visible="commentsVisible" trigger="manual" placement="top-start" :disabled="disabled">
        <template #trigger>
          <UIButton
            ref="commentButton"
            v-radar="{ name: 'Point edit tool', desc: 'Add, review, and remove image comments' }"
            type="white"
            icon="edit"
            class="gap-1.5 px-2 text-sm"
            :class="{ 'text-primary-main': commenting && !disabled }"
            :aria-pressed="commenting"
            :aria-expanded="gen.editComments.length > 0 ? commentsVisible : undefined"
            :disabled="disabled"
            @click="toggleCommenting"
          >
            {{
              $t(
                gen.editComments.length === 0
                  ? { en: 'Point edit', zh: '点选修改' }
                  : {
                      en: `${gen.editComments.length} ${gen.editComments.length === 1 ? 'annotation' : 'annotations'}`,
                      zh: `${gen.editComments.length} 条注释`
                    }
              )
            }}
            <UIIcon v-if="gen.editComments.length > 0" type="arrowDown" class="h-3 w-3" />
          </UIButton>
        </template>
        <ul class="w-72 max-h-64 overflow-y-auto p-2">
          <li
            v-for="(comment, index) in gen.editComments"
            :key="comment.id"
            class="flex items-center gap-2 rounded-sm px-2 py-1 text-sm text-grey-900 hover:bg-grey-300 focus-within:bg-grey-300"
          >
            <span class="min-w-0 flex-1 break-words">{{ comment.content }}</span>
            <button
              v-radar="{ name: `Remove comment ${index + 1}`, desc: 'Remove this point comment' }"
              type="button"
              class="h-7 w-7 shrink-0 flex items-center justify-center rounded-sm border-none bg-transparent text-grey-900 cursor-pointer hover:text-primary-main focus-visible:outline-2 focus-visible:outline-primary-main"
              :title="$t({ en: 'Delete comment', zh: '删除注释' })"
              @click="removeComment(comment.id)"
            >
              <UIIcon type="trash" class="h-4 w-4" />
            </button>
          </li>
        </ul>
      </UIDropdown>
    </template>
    <template #submit>
      <UIButton
        v-radar="{ name: 'Edit costume', desc: 'Apply the instructions to the selected costume with AI' }"
        type="primary"
        :disabled="disabled || (instruction.trim() === '' && gen.editComments.length === 0)"
        :loading="submitting"
        @click="handleSubmit"
      >
        {{ $t({ en: 'Edit costume', zh: '修改造型' }) }}
      </UIButton>
    </template>
  </SettingsInput>
</template>
