<script setup lang="ts">
import { computed } from 'vue'
import { getHighlighter, theme, tabSize } from '@/utils/spx/highlighter'
import { useAsyncComputedLegacy } from '@/utils/utils'
import { useSlotText } from '@/utils/vnode'

const props = withDefaults(
  defineProps<{
    /** Only `spx` supported now. */
    language?: string
    mode: 'block' | 'inline'
    /** If show line numbers */
    lineNumbers?: boolean
    /** Is code for addition */
    addition?: boolean
    /** Is code for deletion */
    deletion?: boolean
  }>(),
  {
    language: 'spx',
    lineNumbers: false,
    addition: false,
    deletion: false
  }
)

const childrenText = useSlotText()
const codeToDisplay = computed(() => childrenText.value.replace(/\n$/, '')) // omit last line break when displaying
const highlighter = useAsyncComputedLegacy(getHighlighter)

const hasLineNumbers = computed(() => {
  return props.lineNumbers && props.mode === 'block' && codeToDisplay.value.split('\n').length > 1
})

const codeHtml = computed(() => {
  if (highlighter.value == null) return ''
  // Sometimes Copilot makes mistakes about go/xgo, we correct it here.
  const language = ['spx', 'xgo', 'go'].includes(props.language) ? 'spx' : 'plaintext'
  return highlighter.value.codeToHtml(codeToDisplay.value, {
    lang: language,
    structure: props.mode === 'block' ? 'classic' : 'inline',
    theme
  })
})
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <code v-if="mode === 'inline'" class="code-view" :style="{ tabSize }" v-html="codeHtml"></code>
  <div
    v-else
    class="code-view block"
    :class="{ 'has-line-numbers': hasLineNumbers, addition, deletion }"
    :style="{ tabSize }"
    v-html="codeHtml"
  ></div>
</template>

<style lang="scss" scoped>
.code-view {
  font-family: var(--ui-font-family-code);
  font-size: 1em;
}

.block :deep(pre) {
  min-width: fit-content;
}

.has-line-numbers {
  container-type: inline-size;

  :deep(pre) {
    position: relative;
    padding-left: 26px;
    counter-reset: step;
    counter-increment: step 0;
  }

  :deep(.line::before) {
    content: counter(step);
    counter-increment: step;
    position: absolute;
    left: 0;
    width: 18px;
    display: inline-block;
    text-align: right;
    color: #34819b;
  }

  // If the container is too narrow, hide line numbers
  @container (width < 15em) {
    :deep(pre) {
      padding-left: 0;
    }
    :deep(.line::before) {
      content: none;
    }
  }
}

.addition,
.deletion {
  :deep(> pre) {
    position: relative;
    padding-left: 24px;
    // Disable default background and show background from parent (addition/deletion)
    background-color: transparent !important;
  }
  :deep(.line::before) {
    position: absolute;
    left: 8px;
    width: 1em;
    display: inline-block;
  }
}

.addition {
  background: var(--ui-color-green-100);
  :deep(code .line::before) {
    content: '+';
  }
}

.deletion {
  background: var(--ui-color-red-100);
  :deep(code .line::before) {
    content: '-';
  }
}
</style>
