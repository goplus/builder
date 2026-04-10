<script setup lang="ts">
import { UIIcon, UITooltip } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useModifyUsername } from './index'

const props = withDefaults(
  defineProps<{
    username: string
    showModify?: boolean
  }>(),
  {
    showModify: false
  }
)

const emit = defineEmits<{
  modified: [string]
}>()

const handleCopyUsername = useMessageHandle(
  () => navigator.clipboard.writeText(props.username),
  { en: 'Failed to copy username to clipboard', zh: '复制用户名到剪贴板失败' },
  { en: 'Username copied to clipboard', zh: '用户名已复制到剪贴板' }
).fn

const modifyUsername = useModifyUsername()

const handleModifyUsername = useMessageHandle(
  async () => {
    const newUsername = await modifyUsername(props.username)
    if (newUsername === props.username) return
    emit('modified', newUsername)
  },
  {
    en: 'Failed to modify username',
    zh: '修改用户名失败'
  }
).fn
</script>

<template>
  <span class="inline-flex min-w-0 items-center gap-1 font-main text-12 text-hint-2">
    <span class="min-w-0 flex-[0_1_auto]">
      <UITooltip placement="top">
        {{
          $t({
            en: `Username: ${props.username}`,
            zh: `用户名：${props.username}`
          })
        }}
        <template #trigger>
          <span class="block overflow-hidden text-ellipsis whitespace-nowrap">{{ props.username }}</span>
        </template>
      </UITooltip>
    </span>
    <span class="inline-flex flex-none items-center gap-1">
      <UITooltip placement="top">
        {{ $t({ en: 'Copy username', zh: '复制用户名' }) }}
        <template #trigger>
          <button
            v-radar="{ name: 'Copy username button', desc: 'Click to copy username to clipboard' }"
            class="inline-flex h-3.5 w-3.5 flex-none cursor-pointer items-center justify-center border-none bg-transparent p-0 text-inherit transition-colors duration-200 hover:text-primary-main"
            type="button"
            @click="handleCopyUsername"
          >
            <span class="absolute -m-px h-px w-px overflow-hidden border-0 p-0 whitespace-nowrap [clip:rect(0,0,0,0)]">
              {{ $t({ en: 'Copy username', zh: '复制用户名' }) }}
            </span>
            <UIIcon class="w-3.5 h-3.5" type="copyAltFilled" />
          </button>
        </template>
      </UITooltip>
      <UITooltip v-if="props.showModify" placement="top">
        {{ $t({ en: 'Modify username', zh: '修改用户名' }) }}
        <template #trigger>
          <button
            v-radar="{ name: 'Modify username button', desc: 'Click to modify username' }"
            class="inline-flex h-3.5 w-3.5 flex-none cursor-pointer items-center justify-center border-none bg-transparent p-0 text-inherit transition-colors duration-200 hover:text-primary-main"
            type="button"
            @click="handleModifyUsername"
          >
            <span class="absolute -m-px h-px w-px overflow-hidden border-0 p-0 whitespace-nowrap [clip:rect(0,0,0,0)]">
              {{ $t({ en: 'Modify username', zh: '修改用户名' }) }}
            </span>
            <UIIcon class="w-3.5 h-3.5" type="edit" />
          </button>
        </template>
      </UITooltip>
    </span>
  </span>
</template>
