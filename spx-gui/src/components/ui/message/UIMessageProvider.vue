<script lang="ts">
import { inject, provide, type InjectionKey } from 'vue'
import Emitter from '@/utils/emitter'

export type MessageEvents = Emitter<{
  message: {
    type: 'info' | 'success' | 'warning' | 'error'
    content: string
  }
}>

const messageEventsInjectKey: InjectionKey<MessageEvents> = Symbol('message-events')

export function useMessageEvents(): MessageEvents {
  const ctx = inject(messageEventsInjectKey)
  if (ctx == null) throw new Error('useMessageEvents should be called inside of UIMessageProvider')
  return ctx
}
</script>

<script setup lang="ts">
import { NMessageProvider } from 'naive-ui'
import { useRootContainer } from '../utils'

const attachTo = useRootContainer()
const emitter: MessageEvents = new Emitter()

provide(messageEventsInjectKey, emitter)
</script>

<template>
  <NMessageProvider :to="attachTo">
    <slot></slot>
  </NMessageProvider>
</template>

<style lang="scss">
.n-message {
  align-items: flex-start; /** text-content may contain multiple lines */
  .n-message__icon {
    margin-top: 1px; /** align icon with text-content */
  }
}
</style>
