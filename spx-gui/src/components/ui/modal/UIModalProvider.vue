<template>
  <slot></slot>
  <div ref="modalContainer">
    <template v-for="modal in currentModals" :key="modal.id">
      <component
        :is="modal.component"
        v-bind="modal.props"
        :visible="modal.visible"
        @cancelled="(reason?: unknown) => handleCancelled(modal.id, reason)"
        @resolved="(resolved?: unknown) => handleResolved(modal.id, resolved)"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { type InjectionKey, inject, provide, shallowReactive, nextTick, type Component, watch, ref } from 'vue'
import type { ComponentDefinition, PruneProps } from '@/utils/types'
import { Cancelled } from '@/utils/exception'
import Emitter from '@/utils/emitter'
import { provideModalContainer } from '../utils'

// The Modal Component should provide Props as following:
export type ModalComponentProps = {
  readonly visible: boolean
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
</script>

<script setup lang="ts">
const modalContainer = ref<HTMLElement>()
const currentModals = shallowReactive<ModalInfo[]>([])
const emitter: ModalEvents = new Emitter()

async function add({ id, component, props, handlers }: Omit<ModalInfo, 'visible'>) {
  const currentModal = shallowReactive({ id, component, props, handlers, visible: false })
  currentModals.push(currentModal)
  // delay visible-setting, so there will be animation for modal-show
  // TODO: the mouse-event position get lost after delay, we may fix it by save the position & set it after delay
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
    // wait for hide animation to finish
    currentModals.splice(
      currentModals.findIndex((m) => m.id === id),
      1
    )
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

watch(
  modalContainer,
  (value, _, onCleanUp) => {
    if (value == null) return

    // naive-ui does not adequately support simultaneously having "focus outside the modal" and allowing the modal to be "closed by the ESC key."
    // Refer to: https://github.com/goplus/builder/pull/1874#discussion_r2220769290
    const handleKeydown = (e: KeyboardEvent) => {
      if (currentModals.length === 0) return
      if (e.key !== 'Escape') return

      const target = e.target
      if (
        // Non-focusable DOM elements cannot trigger keydown events,so the target is either the body or a focusable DOM element.
        // If the target is the body, the modal should be closed normally.
        target != document.body &&
        target instanceof HTMLElement &&
        // ignore events if the focused element is outside the modal container subtree.
        !value.contains(target)
      ) {
        return
      }

      const lastModal = currentModals.at(-1)
      if (lastModal != null) {
        handleCancelled(lastModal.id, 'by ESC')
      }
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

provide(modalContextInjectKey, { add, events: emitter })
provideModalContainer(modalContainer)
</script>
