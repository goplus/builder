<script lang="ts">
export function getDefaultValue() {
  return keys[0].name
}

/** Map from value of `KeyboardEvent.key` to key definition */
const webKeyValueKeyMap = keys.reduce((map, key) => {
  map.set(key.webKeyValue, key)
  return map
}, new Map<string, KeyDefinition>())
</script>

<script setup lang="ts">
import { debounce } from 'lodash'
import { computed, shallowRef } from 'vue'
import { useI18n } from '@/utils/i18n'
import { keys, nameKeyMap, type KeyDefinition } from '@/utils/spx'
import { UITextInput } from '@/components/ui'

const props = defineProps<{
  value: string
}>()

const emit = defineEmits<{
  'update:value': [string]
}>()

const i18n = useI18n()
const key = shallowRef(nameKeyMap.get(props.value) ?? null)
const text = computed(() => {
  if (key.value == null) return ''
  return i18n.t(key.value.text)
})

const emitChange = debounce(() => {
  if (key.value == null) return
  emit('update:value', key.value.name)
}, 300)

function handleKeyDown(e: KeyboardEvent) {
  e.preventDefault()
  e.stopPropagation()
  const k = webKeyValueKeyMap.get(e.key)
  if (k == null) return
  key.value = k
  emitChange()
}
</script>

<template>
  <div class="spx-key-input">
    <UITextInput
      v-radar="{ name: 'Key input', desc: 'Input field for detecting key press' }"
      class="input"
      :value="text"
      autofocus
      @keydown="handleKeyDown"
    />
    <p class="tip">
      {{ $t({ en: 'Press desired key', zh: '按下你想输入的按键' }) }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.spx-key-input {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tip {
  text-align: center;
  color: var(--ui-color-hint-1);
}

.input {
  text-align: center;
}
</style>
