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
import { type InjectionKey, inject, provide, ref, shallowRef, nextTick } from 'vue'
import { NModalProvider } from 'naive-ui'
import { Cancelled } from '@/utils/exception'

// The Modal Component should provide API (props & emits) as following:
export type ModalComponentProps = {
  visible: boolean
}
export type ModalComponentEmits<T> = {
  cancelled: [reason?: unknown]
  resolved: [resolved?: T]
}

// TODO: improve typing
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ModalComponent<P, T> = any

export type ModalHandlers<T> = {
  resolve(resolved: T): void
  reject(e: unknown): void
}

export type ModalInfo<P extends ModalComponentProps = any, T = any> = {
  id: number
  component: ModalComponent<P, T>
  props: Omit<P, keyof ModalComponentProps>
  handlers: ModalHandlers<T>
}

type ModalContext<P extends ModalComponentProps, T> = {
  setCurrent(current: ModalInfo<P, T> | null): void
}

const modalContextInjectKey: InjectionKey<ModalContext<any, any>> = Symbol('modal-context')

let mid = 0

export function useModal<P extends ModalComponentProps, T>(component: ModalComponent<P, T>) {
  const ctx = inject(modalContextInjectKey)
  if (ctx == null) throw new Error('useModal should be called inside of ModalProvider')
  return function invokeModal(props: Omit<P, keyof ModalComponentProps>) {
    return new Promise<T>((resolve, reject) => {
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
