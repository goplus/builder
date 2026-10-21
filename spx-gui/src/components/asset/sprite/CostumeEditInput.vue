<script setup lang="ts">
import { computed } from 'vue'
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
      <button
        v-radar="{ name: 'Point edit tool', desc: 'Select points in the image and describe local edits' }"
        type="button"
        class="h-8 flex items-center gap-1.5 rounded-md border px-2 text-xs cursor-pointer transition-colors disabled:cursor-not-allowed disabled:text-grey-600 focus-visible:outline-2 focus-visible:outline-primary-main"
        :class="
          commenting
            ? 'border-primary-300 bg-primary-200 text-primary-main'
            : 'border-grey-400 bg-grey-200 text-grey-900 enabled:hover:bg-grey-300'
        "
        :aria-pressed="commenting"
        :disabled="disabled"
        @click="emit('update:commenting', !commenting)"
      >
        <UIIcon type="edit" class="h-4 w-4" />
        {{ $t({ en: 'Point edit', zh: '点选修改' }) }}
      </button>
      <UIDropdown v-if="gen.editComments.length > 0" trigger="click" placement="top-start" :disabled="disabled">
        <template #trigger>
          <button
            v-radar="{ name: 'Image comments', desc: 'Review and remove individual point comments' }"
            type="button"
            class="h-8 rounded-md border-none bg-transparent px-2 text-xs text-grey-900 cursor-pointer enabled:hover:bg-grey-200 disabled:cursor-not-allowed disabled:text-grey-600 focus-visible:outline-2 focus-visible:outline-primary-main"
            :disabled="disabled"
          >
            {{
              $t({
                en: `${gen.editComments.length} ${gen.editComments.length === 1 ? 'comment' : 'comments'}`,
                zh: `${gen.editComments.length} 条注释`
              })
            }}
          </button>
        </template>
        <ul class="w-72 max-h-64 overflow-y-auto p-2">
          <li v-for="(comment, index) in gen.editComments" :key="comment.id" class="flex items-center gap-2 p-1">
            <span class="min-w-0 flex-1 px-1 text-sm text-text break-words">{{ comment.content }}</span>
            <UIButton
              v-radar="{ name: `Remove comment ${index + 1}`, desc: 'Remove this point comment' }"
              type="white"
              shape="square"
              class="shrink-0 border-transparent!"
              :title="$t({ en: 'Delete comment', zh: '删除注释' })"
              @click="gen.setEditComments(gen.editComments.filter((item) => item.id !== comment.id))"
            >
              <UIIcon type="close" class="h-4 w-4" />
            </UIButton>
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
