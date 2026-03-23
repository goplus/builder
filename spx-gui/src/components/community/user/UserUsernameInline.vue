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
  <span class="username-inline">
    <span class="text-group">
      <UITooltip placement="top">
        {{
          $t({
            en: `Username: ${props.username}`,
            zh: `用户名：${props.username}`
          })
        }}
        <template #trigger>
          <span class="username">{{ props.username }}</span>
        </template>
      </UITooltip>
    </span>
    <span class="actions">
      <UITooltip placement="top">
        {{ $t({ en: 'Copy username', zh: '复制用户名' }) }}
        <template #trigger>
          <button
            v-radar="{ name: 'Copy username button', desc: 'Click to copy username to clipboard' }"
            class="action-button"
            type="button"
            @click="handleCopyUsername"
          >
            <span class="sr-only">{{ $t({ en: 'Copy username', zh: '复制用户名' }) }}</span>
            <UIIcon class="action-icon" type="copyAltFilled" />
          </button>
        </template>
      </UITooltip>
      <UITooltip v-if="props.showModify" placement="top">
        {{ $t({ en: 'Modify username', zh: '修改用户名' }) }}
        <template #trigger>
          <button
            v-radar="{ name: 'Modify username button', desc: 'Click to modify username' }"
            class="action-button"
            type="button"
            @click="handleModifyUsername"
          >
            <span class="sr-only">{{ $t({ en: 'Modify username', zh: '修改用户名' }) }}</span>
            <UIIcon class="action-icon" type="edit" />
          </button>
        </template>
      </UITooltip>
    </span>
  </span>
</template>

<style scoped lang="scss">
.username-inline {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ui-color-hint-2);
  font-size: 12px;
  font-family: var(--ui-font-family-main);
  line-height: 18px;
}

.text-group {
  flex: 0 1 auto;
  min-width: 0;
}

.username {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.action-button {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--ui-color-primary-main);
  }
}

.action-icon {
  width: 14px;
  height: 14px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
