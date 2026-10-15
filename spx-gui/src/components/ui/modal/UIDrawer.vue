<template>
  <Teleport v-if="attachTo != null" :to="attachTo">
    <Transition name="ui-drawer">
      <div v-if="visible" class="fixed inset-0 z-1100 bg-overlay-modal" @click="handleMaskClick">
        <div
          v-bind="surfaceAttrs"
          ref="containerRef"
          v-radar="radar ?? { name: 'drawer', desc: 'A drawer panel for specific purpose' }"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          class="ui-drawer-surface"
          :class="surfaceClass"
          @click.stop
        >
          <div class="h-14 shrink-0 flex items-center gap-3 px-6 py-2">
            <div class="flex-1 truncate text-xl text-title">{{ title }}</div>
            <UIModalClose class="-mr-1" @click="close" />
          </div>
          <UIDivider />
          <div :class="cn('flex-1 min-h-0 overflow-y-auto px-6 pt-5 pb-6', bodyClass)">
            <slot></slot>
          </div>
          <template v-if="$slots.footer != null">
            <UIDivider />
            <div class="shrink-0 flex justify-end gap-3 px-6 py-4">
              <slot name="footer"></slot>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
export type DrawerSize = 'small' | 'medium' | 'large'
</script>

<script setup lang="ts">
import { computed, mergeProps, ref, useAttrs } from 'vue'
import type { RadarNodeMeta } from '@/utils/radar'
import { cn, type ClassValue, providePopupContainer, useLayerRegistration, useModalContainer } from '../utils'
import UIDivider from '../UIDivider.vue'
import UIModalClose from './UIModalClose.vue'
import { useDialogAutoFocus, useDialogEscape } from './dialog'

defineOptions({
  // As with `UIModal`, fallthrough attrs belong on the drawer surface rather than the teleported backdrop.
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    title: string
    size?: DrawerSize
    visible?: boolean
    /** Whether to focus the first focusable element inside the drawer. */
    autoFocus?: boolean
    maskClosable?: boolean
    class?: ClassValue
    bodyClass?: ClassValue
    /**
     * Metadata for radar, equivalent to applying `v-radar` on the drawer surface.
     */
    radar?: RadarNodeMeta
  }>(),
  {
    size: 'medium',
    visible: false,
    autoFocus: true,
    maskClosable: true,
    class: undefined,
    bodyClass: undefined,
    radar: undefined
  }
)

const attrs = useAttrs()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
}>()

function close() {
  emit('update:visible', false)
}

function handleMaskClick() {
  if (props.maskClosable) close()
}

const attachTo = useModalContainer()
const containerRef = ref<HTMLElement | undefined>(undefined)
providePopupContainer(containerRef)

const drawerRegistration = useLayerRegistration(computed(() => props.visible))

const surfaceAttrs = computed(() => mergeProps(drawerRegistration.rootAttrs, attrs))
const surfaceClass = computed(() =>
  cn(
    'absolute inset-y-0 right-0 max-w-full flex flex-col outline-none bg-white shadow-lg',
    {
      'w-[400px]': props.size === 'small',
      'w-[560px]': props.size === 'medium',
      'w-[720px]': props.size === 'large'
    },
    props.class
  )
)

useDialogAutoFocus(containerRef, () => props.visible && props.autoFocus)
useDialogEscape(containerRef, drawerRegistration.isTopmost, close)
</script>

<style scoped>
@layer components {
  .ui-drawer-enter-active {
    transition: opacity 0.25s cubic-bezier(0, 0, 0.2, 1);
  }

  .ui-drawer-leave-active {
    transition: opacity 0.25s cubic-bezier(0.4, 0, 1, 1);
  }

  .ui-drawer-enter-from,
  .ui-drawer-leave-to {
    opacity: 0;
  }

  .ui-drawer-enter-active .ui-drawer-surface {
    transition: transform 0.25s cubic-bezier(0, 0, 0.2, 1);
  }

  .ui-drawer-leave-active .ui-drawer-surface {
    transition: transform 0.25s cubic-bezier(0.4, 0, 1, 1);
  }

  .ui-drawer-enter-from .ui-drawer-surface,
  .ui-drawer-leave-to .ui-drawer-surface {
    transform: translateX(100%);
  }
}
</style>
