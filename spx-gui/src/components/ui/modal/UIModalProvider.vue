<template>
  <NModalProvider>
    <template v-for="modal in currentModals" :key="modal.id">
      <component
        :is="modal.component"
        v-bind="modal.props"
        :visible="modal.visible"
        @cancelled="(reason?: unknown) => handleCancelled(modal.id, reason)"
        @resolved="(resolved?: unknown) => handleResolved(modal.id, resolved)"
      />
    </template>
    <slot></slot>
  </NModalProvider>
</template>

<script lang="ts">
import {
  type InjectionKey,
  inject,
  provide,
  shallowReactive,
  nextTick,
  type Component,
  type VNodeProps,
  type AllowedComponentProps
} from 'vue'
import { NModalProvider } from 'naive-ui'
import { Cancelled } from '@/utils/exception'

// The Modal Component should provide Props as following:
export type ModalComponentProps = {
  readonly visible: boolean
}

// The Modal Component should provide Emits as following:
export type ModalComponentEmit<Resolved> = ((event: 'resolved', resolved: Resolved) => void) &
  ((event: 'cancelled') => void)

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

type ModalContext = {
  add(modalInfo: Omit<ModalInfo, 'visible'>): void
}

const modalContextInjectKey: InjectionKey<ModalContext> = Symbol('modal-context')

let mid = 0

type ComponentProps<C extends Component> = C extends new (...args: any) => any
  ? Omit<InstanceType<C>['$props'], keyof VNodeProps | keyof AllowedComponentProps>
  : never

type ComponentEmit<C extends Component> = C extends new (...args: any) => any
  ? InstanceType<C>['$emit']
  : never

/**
 *
 * @param component The Modal Component, which should provide Props and Emits as following:
 * `{ visible: boolean }`, `{ resolved: (resolved: any) => void, cancelled: () => void }`.
 *
 *
 * @returns A function to invoke the Modal Component. The returned function has a
 * props argument, which has `never` type if the Modal Component does not provide
 *  `ModalComponentProps` and `ModalComponentEmit<any>`.
 */
export function useModal<C extends Component>(component: C) {
  const ctx = inject(modalContextInjectKey)
  if (ctx == null) throw new Error('useModal should be called inside of ModalProvider')
  return function invokeModal(
    props: ComponentProps<C> extends ModalComponentProps
      ? ComponentEmit<C> extends ModalComponentEmit<any>
        ? Omit<ComponentProps<C>, keyof ModalComponentProps>
        : never
      : never
  ) {
    return new Promise<
      ComponentEmit<C> extends ModalComponentEmit<infer Resolved> ? Resolved : never
    >((resolve, reject) => {
      mid++
      const handlers = { resolve, reject }
      ctx.add({ id: mid, component, props, handlers })
    })
  }
}
</script>

<script setup lang="ts">
const currentModals = shallowReactive<ModalInfo[]>([])

async function add({ id, component, props, handlers }: Omit<ModalInfo, 'visible'>) {
  const currentModal = shallowReactive({ id, component, props, handlers, visible: false })
  currentModals.push(currentModal)
  // delay visible-setting, so there will be animation for modal-show
  // TODO: the mouse-event position get lost after delay, we may fix it by save the position & set it after delay
  await nextTick()
  currentModal.visible = true
}

function remove(id: number, onHide: (modal: ModalInfo) => void) {
  const modal = currentModals.find(m => m.id === id)
  if (modal == null) return
  modal.visible = false
  onHide(modal)
  setTimeout(() => { // wait for hide animation to finish
    currentModals.splice(currentModals.findIndex(m => m.id === id), 1)
  }, 300)
}

function handleCancelled(id: number, reason?: unknown) {
  remove(id, (m) => m.handlers.reject(new Cancelled(reason)))
}

function handleResolved(id: number, resolved?: unknown) {
  remove(id, (m) => m.handlers.resolve(resolved))
}

provide(modalContextInjectKey, { add })
</script>
