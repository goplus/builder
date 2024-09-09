<script lang="ts" setup>
import { ref } from 'vue'
import RenameConfirmIcon from '../../icons/rename-confirm.svg?raw'

const emit = defineEmits<{
  submit: [value: string]
  onFocus: []
  onBlur: []
}>()

defineProps<{
  placeholder: string
  errorMessage: string
}>()

const variableName = ref('')

function handleSubmit() {
  emit('submit', variableName.value)
}
</script>
<template>
  <article class="rename">
    <header class="header">
      <h3 class="title">
        {{ $t({ zh: '给变量起一个新的名字：', en: 'Give a new name to the variable:' }) }}
      </h3>
      <p class="description">
        {{
          $t({
            zh: '所有引用到此名称的代码，将会同步更改',
            en: 'All references to this name will be updated.'
          })
        }}
      </p>
    </header>
    <main class="main">
      <div class="input-wrapper">
        <input
          v-model="variableName"
          :placeholder="placeholder"
          class="input"
          type="text"
          @focus="emit('onFocus')"
          @blur="emit('onBlur')"
          @keyup.enter="handleSubmit"
        />
      </div>
      <p class="error-message">{{ errorMessage }}</p>
    </main>
    <footer class="actions-footer">
      <nav class="recommend">
        {{ $t({ zh: '按 Enter 确认，或者点击', en: 'Press Enter to confirm, or click' }) }}
        <button class="highlight" @click="handleSubmit()">
          {{ $t({ zh: '确定', en: 'Confirm' }) }}
        </button>
      </nav>
      <nav class="more">
        <!-- eslint-disable vue/no-v-html -->
        <button class="highlight" @click="handleSubmit()" v-html="RenameConfirmIcon"></button>
      </nav>
    </footer>
  </article>
</template>
<style lang="scss" scoped>
.rename {
  width: 330px;
  background: white;
  border-radius: 5px;
  border: 1px solid #a6a6a6;
  color: black;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  font-family:
    AlibabaHealthB,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    'Noto Sans',
    sans-serif,
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Segoe UI Symbol',
    'Noto Color Emoji';

  .header {
    padding: 10px 10px 4px;
  }

  .main {
    padding: 4px 10px;
  }
}

.title {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 12px;
}

.input-wrapper {
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 4px;
  border-bottom: 1px solid #e5e5e5;
  border-radius: 5px;
  background: rgba(196, 196, 196, 0.15);

  .input {
    width: 100%;
    color: #383838;
    font-size: 12px;
    font-family: 'JetBrains Mono NL', Consolas, 'Courier New', 'AlibabaHealthB', monospace;
    border: none;
    outline: none;
    background: transparent;
    caret-color: #383838;

    &::placeholder {
      color: #383838;
    }
  }
}

.error-message {
  margin: 4px 4px;
  color: #ff5733;
  font-size: 12px;
}

.description {
  font-size: 12px;
  color: #808080;
}

.actions-footer {
  display: flex;
  justify-content: space-between;
  min-height: 32px;
  padding: 4px 10px;
  color: #787878;
  font-size: 12px;
  background: #fafafa;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;

  .recommend,
  .more {
    display: flex;
    align-items: center;
  }

  button {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    padding: 0;
    color: inherit;
    font-size: inherit;
    outline: none;
    border: none;
    background-color: transparent;
  }

  .more {
    color: #a6a6a6;
    transition: color 0.15s;

    &:hover {
      color: #cacaca;
    }

    &:active {
      color: #979797;
    }
  }

  .highlight {
    margin: 0 4px;
    color: #219ffc;
    transition: color 0.15s;

    &:hover {
      color: #5e98f6;
    }

    &:active {
      color: #1e9dff;
    }
  }
}
</style>
