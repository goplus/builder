<template>
  <Teleport to="body">
    <Transition name="ui-modal">
      <div v-if="visible" class="ui-modal-mask" @click="handleMaskClick">
        <div class="ui-modal-scroll">
          <div class="ui-modal-centering">
            <section
              v-bind="attrs"
              ref="containerRef"
              role="dialog"
              aria-modal="true"
              tabindex="-1"
              class="ui-modal-surface"
              :class="sizeClass"
              @click.stop
            >
              <slot></slot>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
export type ModalSize = 'small' | 'medium' | 'large' | 'full'
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, watch } from 'vue'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    size?: ModalSize
    visible?: boolean
    autoFocus?: boolean
    maskClosable?: boolean
  }>(),
  {
    size: 'medium',
    visible: false,
    autoFocus: true,
    maskClosable: true
  }
)

const emit = defineEmits<{
  'update:visible': [visible: boolean]
}>()

const attrs = useAttrs()
const containerRef = ref<HTMLElement | null>(null)

const sizeClass = computed(() => ({
  'ui-modal-surface-small': props.size === 'small',
  'ui-modal-surface-medium': props.size === 'medium',
  'ui-modal-surface-large': props.size === 'large',
  'ui-modal-surface-full': props.size === 'full'
}))

function handleMaskClick() {
  if (!props.maskClosable) return
  emit('update:visible', false)
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

function getFirstFocusableElement(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).find((element) => {
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false
    return element.tabIndex >= 0
  })
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !props.visible) return
  const container = containerRef.value
  if (container == null) return
  if (event.target instanceof Element && !container.contains(event.target) && event.target !== document.body) return
  emit('update:visible', false)
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    document.addEventListener('keydown', handleKeydown)
    if (!props.autoFocus) return
    await nextTick()
    const container = containerRef.value
    const focusTarget = container == null ? null : getFirstFocusableElement(container)
    ;(focusTarget ?? container)?.focus()
  }
)

watch(
  () => props.visible,
  (visible) => {
    if (visible) return
    document.removeEventListener('keydown', handleKeydown)
  }
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.ui-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: var(--ui-color-overlay-modal);
}

.ui-modal-scroll {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
}

.ui-modal-scroll::-webkit-scrollbar {
  display: none;
}

.ui-modal-centering {
  min-height: 100%;
  width: 100%;
  display: flex;
  padding: 16px;
}

.ui-modal-surface {
  max-width: 100%;
  margin: auto;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: var(--ui-border-radius-lg);
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-lg);
  outline: none;
  transform-origin: center;
}

.ui-modal-surface-small {
  width: 480px;
}

.ui-modal-surface-medium {
  width: 640px;
}

.ui-modal-surface-large {
  width: 960px;
}

.ui-modal-surface-full {
  width: 100%;
}

.ui-modal-enter-active {
  transition: opacity 0.25s cubic-bezier(0, 0, 0.2, 1);
}

.ui-modal-leave-active {
  transition: opacity 0.25s cubic-bezier(0.4, 0, 1, 1);
}

.ui-modal-enter-from,
.ui-modal-leave-to {
  opacity: 0;
}

.ui-modal-enter-active .ui-modal-surface {
  transition: transform 0.25s cubic-bezier(0, 0, 0.2, 1);
}

.ui-modal-leave-active .ui-modal-surface {
  transition: transform 0.25s cubic-bezier(0.4, 0, 1, 1);
}

.ui-modal-enter-from .ui-modal-surface,
.ui-modal-leave-to .ui-modal-surface {
  transform: scale(0.5);
}
</style>
