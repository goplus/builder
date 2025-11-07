<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import highlight from 'highlight.js'
import { useSlotTextLegacy } from '@/utils/vnode'
import 'highlight.js/styles/github.css'
import CodeView from './CodeView.vue'
import { UIIcon } from '@/components/ui'

// Component props
const props = defineProps<{
  code?: string // Code content as string
  language?: string // Programming language for syntax highlighting
  title?: string // Custom title for the code block
  collapsed?: boolean // Whether the code block should be initially collapsed
}>()

const { t } = useI18n()

// Reactive state
const copySuccess = ref(false) // Tracks copy operation success state
const copyTimeout = ref<number | null>(null) // Reference to timeout for resetting copy success state
const codeRef = ref<HTMLElement | null>(null) // Reference to code element for highlighting
const isCollapsed = ref(props.collapsed ?? false) // Collapse state with default from props

// Extract code from slot if not provided via props
const slotCode = useSlotTextLegacy()
const codeText = computed(() => props.code || slotCode.value)

// Compute display title from props or fallback to default
const displayTitle = computed(() => props.title || props.language || t({ en: 'Code', zh: '代码' }))

// Apply syntax highlighting when component is mounted
onMounted(() => {
  if (codeRef.value) {
    highlight.highlightElement(codeRef.value)
  }
})

// Clean up timers to prevent memory leaks
onBeforeUnmount(() => {
  if (copyTimeout.value) {
    clearTimeout(copyTimeout.value)
  }
})

/**
 * Copy code content to clipboard
 * @param event - Mouse event from click handler
 */
function handleCopy(event: MouseEvent) {
  event.stopPropagation()

  // Clear any existing timeout
  if (copyTimeout.value) {
    clearTimeout(copyTimeout.value)
  }

  // Copy text to clipboard
  navigator.clipboard
    .writeText(codeText.value)
    .then(() => {
      copySuccess.value = true

      // Reset success state after 3 seconds
      copyTimeout.value = window.setTimeout(() => {
        copySuccess.value = false
      }, 3000)
    })
    .catch((error) => {
      console.error('Failed to copy code:', error)
    })
}

/**
 * Toggle collapse state of code block
 */
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <div class="collapsible-code-block" :class="{ 'is-collapsed': isCollapsed }">
    <!-- Header with title, language badge and controls -->
    <div class="code-header" @click="toggleCollapse">
      <div class="header-left">
        <span class="collapse-icon">
          <span class="tool-icon custom-icon">{{ isCollapsed ? '▼' : '▶' }}</span>
        </span>
        <span class="title">{{ displayTitle }}</span>
        <span v-if="language" class="language-badge">{{ language }}</span>
      </div>

      <div class="header-right">
        <button class="copy-button" @click.stop="handleCopy($event)">
          <span v-if="copySuccess" class="success-text">
            {{ t({ en: 'Copied!', zh: '已复制!' }) }}
          </span>
          <span v-else>
            <UIIcon type="copy" :size="14" />
            {{ t({ en: 'Copy', zh: '复制' }) }}
          </span>
        </button>
      </div>
    </div>

    <!-- Collapsible code content with animation -->
    <transition name="slide">
      <div v-show="!isCollapsed" class="code-content">
        <CodeView class="code" :language="language" mode="block" line-numbers>{{ codeText }}</CodeView>
      </div>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
/**
 * Collapsible code block container
 * Styled with a border and subtle background
 */
.collapsible-code-block {
  border: 1px solid var(--ui-color-grey-200, #e9ecef);
  border-radius: 6px;
  margin: 16px 0;
  background-color: var(--ui-color-grey-50, #f8f9fa);
  overflow: hidden;

  /* Remove bottom border when collapsed */
  &.is-collapsed {
    .code-header {
      border-bottom: none;
    }
  }

  /**
   * Header section with controls
   * Contains title, language badge, and copy button
   */
  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1px 5px;
    background-color: var(--ui-color-grey-100, #f1f3f5);
    border-bottom: 1px solid var (--ui-color-grey-200, #e9ecef);
    cursor: pointer;
    user-select: none;

    &:hover {
      background-color: var(--ui-color-grey-150, #ebedef);
    }

    /**
     * Left section of header
     * Contains collapse icon, title and language badge
     */
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;

      /* Collapse indicator icon */
      .collapse-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        color: var(--ui-color-grey-600, #868e96);
      }

      /* Block title */
      .title {
        font-weight: 500;
        font-size: 13px;
        color: var(--ui-color-grey-800, #343a40);
      }

      /* Language indicator badge */
      .language-badge {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
        background-color: var(--ui-color-grey-200, #e9ecef);
        color: var(--ui-color-grey-700, #495057);
        font-family: var(--ui-font-family-code, monospace);
        text-transform: lowercase;
      }
    }

    /**
     * Right section of header
     * Contains copy button
     */
    .header-right {
      display: flex;
      align-items: center;

      /* Copy code button */
      .copy-button {
        display: flex;
        align-items: center;
        gap: 4px;
        background: transparent;
        border: none;
        font-size: 12px;
        padding: 4px 8px;
        cursor: pointer;
        color: var(--ui-color-grey-600, #868e96);
        border-radius: 4px;

        &:hover {
          background-color: var(--ui-color-grey-200, #e9ecef);
          color: var(--ui-color-grey-800, #343a40);
        }

        /* Success indicator */
        .success-text {
          color: var(--ui-color-green-600, #37b24d);
        }
      }
    }
  }

  /* Content wrapper */
  .code-content {
    overflow: hidden;
  }

  /**
   * Animation for collapsing/expanding
   * Uses max-height transition for smooth sliding effect
   */
  .slide-enter-active,
  .slide-leave-active {
    transition: all 0.3s ease;
    max-height: 1000px; // Large enough to accommodate most code blocks
    opacity: 1;
  }

  .slide-enter-from,
  .slide-leave-to {
    max-height: 0;
    opacity: 0;
  }
}

/**
 * Responsive styles for mobile devices
 * Adjusts spacing and font sizes
 */
@media (max-width: 768px) {
  .collapsible-code-block {
    .code-header {
      padding: 8px 12px;

      .header-left {
        gap: 6px;

        .title {
          font-size: 12px;
        }

        .language-badge {
          font-size: 10px;
          padding: 1px 4px;
        }
      }
    }
  }
}
</style>
