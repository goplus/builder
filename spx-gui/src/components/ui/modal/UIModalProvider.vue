<template>
  <slot></slot>
  <div ref="modalContainer">
    <template v-for="modal in currentModals" :key="modal.id">
      <component
        :is="modal.component"
        v-bind="modal.props"
        :visible="modal.visible"
        :active="currentModals.at(-1)?.id === modal.id"
        @cancelled="(reason?: unknown) => handleCancelled(modal.id, reason)"
        @resolved="(resolved?: unknown) => handleResolved(modal.id, resolved)"
      />
    </template>
  </div>
</template>

<script lang="ts">
import {
  type InjectionKey,
  inject,
  provide,
  shallowReactive,
  nextTick,
  type Component,
  watch,
  ref,
  type WatchSource
} from 'vue'
import type { ComponentDefinition, PruneProps } from '@/utils/types'
import { Cancelled } from '@/utils/exception'
import Emitter from '@/utils/emitter'
import { provideModalContainer, useModalContainer } from '../utils'
import { findPopupRoot } from '../popup/stack'

// The Modal Component should provide Props as following:
export type ModalComponentProps = {
  readonly visible: boolean
  /**
   * Indicates whether the current modal is at the top layer.
   * This property is automatically set by UIModalProvider and should not be set manually.
   */
  readonly active?: boolean
}

// The Modal Component should provide Emits as following:
export type ModalComponentEmits<Resolved> = {
  resolved: [resolved: Resolved]
  cancelled: []
}

export type ModalHandlers<Resolved> = {
  resolve(resolved: Resolved): void
  reject(e: unknown): void
}

export type ModalInfo = {
  id: number
  component: Component
  props: any
  handlers: ModalHandlers<any>
  visible: boolean
}

export type ModalEvents = Emitter<{
  open: void
  resolved: void
  cancelled: void
}>

type ModalContext = {
  events: ModalEvents
  add(modalInfo: Omit<ModalInfo, 'visible'>): void
}

const modalContextInjectKey: InjectionKey<ModalContext> = Symbol('modal-context')

let mid = 0

export function useModal<P extends ModalComponentProps, R>(component: ComponentDefinition<P, ModalComponentEmits<R>>) {
  const ctx = inject(modalContextInjectKey)
  if (ctx == null) throw new Error('useModal should be called inside of ModalProvider')
  return function invokeModal(extraProps: Omit<PruneProps<P, ModalComponentEmits<R>>, keyof ModalComponentProps>) {
    return new Promise<R>((resolve, reject) => {
      mid++
      const handlers = { resolve, reject }
      ctx.add({ id: mid, component, props: extraProps, handlers })
    })
  }
}

export function useModalEvents(): ModalEvents {
  const ctx = inject(modalContextInjectKey)
  if (ctx == null) throw new Error('useModalEvents should be called inside of ModalProvider')
  return ctx.events
}

/**
 * Close the current topmost modal with ESC when the key event originates from the
 * modal subtree (or from `document.body`).
 *
 * Why `active` is required:
 * - multiple modals can coexist in the provider stack
 * - only the topmost one should react to ESC
 *
 * Why we filter event targets:
 * - this modal implementation intentionally does not trap focus
 * - focus may temporarily live outside the modal subtree
 * - in that case, pressing ESC should be handled by the focused context instead of
 *   force-closing the modal stack
 * - nested popup content inside a modal (for example dropdowns) should consume ESC first,
 *   so the parent modal must ignore those events
 */
export function useModalEsc(source: WatchSource<boolean>, handler: () => void) {
  const modalContainerRef = useModalContainer()

  watch(
    [modalContainerRef, source],
    ([modalContainer, active], _, onCleanUp) => {
      if (modalContainer == null || !active) return

      // Our modal implementation intentionally does not trap focus. In that setup, we only
      // want ESC to close the active modal when the key event comes from the document body or
      // from an element inside the modal container subtree.
      const handleKeydown = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return

        if (!isEscTargetWithinModalScope(modalContainer, e.target)) return
        handler()
      }

      document.addEventListener('keydown', handleKeydown)
      onCleanUp(() => {
        document.removeEventListener('keydown', handleKeydown)
      })
    },
    {
      immediate: true
    }
  )
}

function isEscTargetWithinModalScope(modalContainer: HTMLElement, target: EventTarget | null) {
  // Non-focusable DOM elements cannot trigger keydown events, so the target is either the
  // body or a focusable DOM element. If the target is the body, the modal should close.
  if (target === document.body) return true
  if (!(target instanceof HTMLElement)) return true
  if (findPopupRoot(target) != null) return false
  return modalContainer.contains(target)
}
</script>

<script setup lang="ts">
const modalContainer = ref<HTMLElement>()
const currentModals = shallowReactive<ModalInfo[]>([])
const emitter: ModalEvents = new Emitter()

async function add({ id, component, props, handlers }: Omit<ModalInfo, 'visible'>) {
  const currentModal = shallowReactive({ id, component, props, handlers, visible: false })
  currentModals.push(currentModal)
  // The modal entry needs to exist in the tree before it can transition from hidden to visible.
  // Wait one render turn before toggling `visible` so teleported modals enter through
  // their transition instead of appearing in the final state immediately.
  await nextTick()
  currentModal.visible = true
  emitter.emit('open')
}

function remove(id: number, onHide: (modal: ModalInfo) => void) {
  const modal = currentModals.find((m) => m.id === id)
  if (modal == null) return
  modal.visible = false
  onHide(modal)
  setTimeout(() => {
    // Keep the entry mounted until the leave transition completes.
    // The provider hosts different modal wrappers, so keep this slightly more relaxed than
    // any single modal's transition timing instead of coupling it to one implementation.
    // TODO: consider replacing this timeout with an `after-leave` driven removal flow if
    // modal wrappers eventually share a consistent leave lifecycle contract.
    const modalIndex = currentModals.findIndex((m) => m.id === id)
    if (modalIndex === -1) return
    currentModals.splice(modalIndex, 1)
  }, 300)
}

function handleCancelled(id: number, reason?: unknown) {
  remove(id, (m) => m.handlers.reject(new Cancelled(reason)))
  emitter.emit('cancelled')
}

function handleResolved(id: number, resolved?: unknown) {
  remove(id, (m) => m.handlers.resolve(resolved))
  emitter.emit('resolved')
}

provide(modalContextInjectKey, { add, events: emitter })
provideModalContainer(modalContainer)
</script>
