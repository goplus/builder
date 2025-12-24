<script lang="ts" setup>
import { ref } from 'vue'
import { UIIcon, UITag } from '@/components/ui'

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
}>()

const enrichShow = ref(false)

const onInput = (e: InputEvent) => {
  const target = e.target
  if (target instanceof HTMLTextAreaElement) {
    emit('update:description', target.value)
  }
}

const onFocus = () => {
  enrichShow.value = true
}

const onBlur = () => {
  enrichShow.value = false
}
</script>

<template>
  <div class="prompt-input">
    <div class="main">
      <span v-if="loading" class="loading">
        <UIIcon type="edit" />
        {{ $t({ zh: '优化提示词中', en: 'Optimizing prompt' }) }}<span class="dot">...</span>
      </span>
      <template v-else>
        <div class="mirror" aria-hidden="true">
          <span class="mirror-text">{{ description }}</span>
          <UITag
            v-if="enrichShow && description.length > 0"
            class="enrich-btn"
            color="primary"
            @mousedown.prevent
            @click="emit('enrich')"
          >
            <UIIcon type="edit" />
            {{ $t({ zh: '优化提示词', en: 'Optimize Prompt' }) }}
          </UITag>
        </div>
        <textarea
          class="prompt"
          :placeholder="$t({ zh: '请输入提示词', en: 'Enter Prompt' })"
          :value="description"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur"
        />
      </template>
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
  position: relative;
  flex: 1;
  padding: 4px 0;
  display: grid;
  overflow-y: auto;

  .loading {
    display: flex;
    align-items: center;
    gap: 8px;
    height: fit-content;
    color: var(--ui-color-turquoise-500);

    .dot {
      clip-path: inset(0 100% 0 0);
      animation: dot-flow 1.5s steps(4) infinite;
    }

    @keyframes dot-flow {
      to {
        clip-path: inset(0 -0.5em 0 0);
      }
    }
  }

  .prompt,
  .mirror {
    grid-area: 1 / 1 / 2 / 2;
    padding: 0;
    margin: 0;
    font: inherit;
    font-size: 14px;
    line-height: 1.6;
    width: 100%;
    box-sizing: border-box;
    white-space: pre-wrap;
    word-break: break-all;
    overflow-wrap: anywhere;
  }

  .prompt {
    border: none;
    resize: none;
    background: transparent;
    color: var(--ui-color-grey-900);
    caret-color: var(--ui-color-turquoise-500);

    &:focus {
      outline: none;
    }
  }

  .mirror-text {
    visibility: hidden;
    pointer-events: none;
    display: inline;
  }

  .enrich-btn {
    display: inline-flex;
    cursor: pointer;
    pointer-events: auto;
    vertical-align: middle;
    margin-left: 12px;
    position: relative;
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
