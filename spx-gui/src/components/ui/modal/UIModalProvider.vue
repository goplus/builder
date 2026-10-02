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
/**
 * UIModalProvider owns programmatic modal instances: creation, promise lifecycle,
 * delayed removal, events, and the provider-level `active` prop.
 */
import { type InjectionKey, inject, provide, shallowReactive, nextTick, onUnmounted, type Component, ref } from 'vue'
import type { ComponentDefinition, EmitsForComponent, PropsForComponent, Prettify } from '@/utils/types'
import { Cancelled } from '@/utils/exception'
import Emitter from '@/utils/emitter'
import { provideModalContainer } from '../utils'

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
  // Settled modals remain in currentModals for the leave transition; this prevents
  // duplicate settlement and reopening after cancellation during the initial nextTick.
  settled: boolean
  /** Removes the abort listener from the invocation signal when the modal settles. */
  stopSignalListening: (() => void) | null
}

export type ModalEvents = Emitter<{
  open: void
  resolved: void
  cancelled: void
}>

type ModalInput = Pick<ModalInfo, 'component' | 'props' | 'handlers'>

type ModalContext = {
  events: ModalEvents
  add(modalInfo: ModalInput, signal?: AbortSignal): void
}

export type ModalComponentDefinition = ComponentDefinition<ModalComponentProps, ModalComponentEmits<any>>

type ResolvedValue<E> = E extends { resolved: infer Args extends any[] } ? Args[0] : never

type ExtraProps<C extends ModalComponentDefinition> = Prettify<Omit<PropsForComponent<C>, keyof ModalComponentProps>>

const modalContextInjectKey: InjectionKey<ModalContext> = Symbol('modal-context')

export function useModal<C extends ModalComponentDefinition>(component: C) {
  const ctx = inject(modalContextInjectKey)
  if (ctx == null) throw new Error('useModal should be called inside of ModalProvider')
  return function invokeModal(extraProps: ExtraProps<C>, options?: { signal?: AbortSignal }) {
    return new Promise<ResolvedValue<EmitsForComponent<C>>>((resolve, reject) => {
      const handlers = { resolve, reject }
      const signal = options?.signal
      ctx.add({ component, props: extraProps, handlers }, signal)
    })
  }
}

export function useModalEvents(): ModalEvents {
  const ctx = inject(modalContextInjectKey)
  if (ctx == null) throw new Error('useModalEvents should be called inside of ModalProvider')
  return ctx.events
}
</script>

<script setup lang="ts">
const modalContainer = ref<HTMLElement>()
const currentModals = shallowReactive<ModalInfo[]>([])
const emitter: ModalEvents = new Emitter()
let nextModalId = 1

async function add({ component, props, handlers }: ModalInput, signal?: AbortSignal) {
  const id = nextModalId
  nextModalId += 1
  const currentModal = shallowReactive<ModalInfo>({
    id,
    component,
    props,
    handlers,
    visible: false,
    settled: false,
    stopSignalListening: null
  })
  currentModals.push(currentModal)
  if (signal != null) {
    const abort = () => handleCancelled(id, signal.reason)
    signal.addEventListener('abort', abort, { once: true })
    currentModal.stopSignalListening = () => signal.removeEventListener('abort', abort)
  }
  // The modal entry needs to exist in the tree before it can transition from hidden to visible.
  // Wait one render turn before toggling `visible` so teleported modals enter through
  // their transition instead of appearing in the final state immediately.
  await nextTick()
  if (currentModal.settled) return
  currentModal.visible = true
  emitter.emit('open')
}

function remove(id: number, onHide: (modal: ModalInfo) => void) {
  const modal = currentModals.find((m) => m.id === id)
  if (modal == null || modal.settled) return false
  modal.settled = true
  modal.stopSignalListening?.()
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
  return true
}

function handleCancelled(id: number, reason?: unknown) {
  if (remove(id, (m) => m.handlers.reject(new Cancelled(reason)))) emitter.emit('cancelled')
}

function handleResolved(id: number, resolved?: unknown) {
  if (remove(id, (m) => m.handlers.resolve(resolved))) emitter.emit('resolved')
}

onUnmounted(() => {
  for (const modal of currentModals) handleCancelled(modal.id, 'Modal provider unmounted')
})

provide(modalContextInjectKey, { add, events: emitter })
provideModalContainer(modalContainer)
</script>
