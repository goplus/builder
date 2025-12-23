<script lang="ts"></script>

<script lang="ts" setup>
import { UIButton } from '@/components/ui'
import { ref } from 'vue'

withDefaults(
  defineProps<{
    description: string
    loading?: boolean
  }>(),
  {
    loading: false
  }
)

const emit = defineEmits<{
  'update:description': [string]
  enrich: []
  generate: []
}>()

const enrichShow = ref(false)
</script>

<template>
  <div class="prompt-input">
    <div class="main">
      <input
        class="prompt"
        :placeholder="$t({ zh: '请输入提示词', en: 'Enter Prompt' })"
        :value="description"
        @input="emit('update:description', ($event.target as HTMLInputElement)?.value)"
        @focus="enrichShow = true"
        @blur="enrichShow = false"
      />
      <UIButton
        v-if="enrichShow && description"
        :loading="loading"
        color="white"
        variant="stroke"
        size="small"
        @click="emit('enrich')"
        >{{ $t({ zh: '补充提示词', en: 'Enrich Prompt' }) }}</UIButton
      >
    </div>
    <div class="footer">
      <div class="extra">
        <slot name="extra"></slot>
      </div>
      <slot name="submit"></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.prompt-input {
  width: 100%;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-2);
  background: var(--ui-color-grey-100);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.main {
  display: flex;
  max-height: 300px;
  min-height: 80px;

  .prompt {
    border: none;
    height: fit-content;

    &:focus {
      outline: none;
    }
  }
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .extra {
    display: flex;
    gap: 8px;
  }
}
</style>
