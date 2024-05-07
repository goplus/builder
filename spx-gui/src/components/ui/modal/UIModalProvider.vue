<template>
  <NModalProvider>
    <component
      :is="currentModal.component"
      v-if="currentModal != null"
      :key="currentModal.id"
      v-bind="currentModal.props"
      :visible="currentVisible"
      @cancelled="handleCancelled"
      @resolved="handleResolved"
    />
    <slot></slot>
  </NModalProvider>
</template>

<script lang="ts">
import {
  type InjectionKey,
  inject,
  provide,
  ref,
  shallowRef,
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
}

type ModalContext = {
  setCurrent(current: ModalInfo | null): void
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
      ctx.setCurrent({ id: mid, component, props, handlers })
    })
  }
}
</script>

<script setup lang="ts">
const currentModal = shallowRef<ModalInfo | null>(null)
const currentVisible = ref(false)

async function setCurrent(modal: ModalInfo | null) {
  currentModal.value = modal
  if (modal != null) {
    // delay visible-setting, so there will be animation for modal-show
    // TODO: the mouse-event position get lost after delay, we may fix it by save the position & set it after delay
    await nextTick()
    if (currentModal.value !== modal) return
    currentVisible.value = true
  }
}

function handleCancelled(reason?: unknown) {
  const modal = currentModal.value
  if (modal == null) return
  currentVisible.value = false
  modal.handlers.reject(new Cancelled(reason))
}

function handleResolved(resolved?: unknown) {
  const modal = currentModal.value
  if (modal == null) return
  currentVisible.value = false
  modal.handlers.resolve(resolved)
}

provide(modalContextInjectKey, { setCurrent })
</script>
