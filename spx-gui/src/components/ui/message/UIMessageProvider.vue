<script lang="ts">
import { inject, provide, type InjectionKey } from 'vue'
import Emitter from '@/utils/emitter'

export type MessageType = 'info' | 'success' | 'warning' | 'error' | 'loading'

export type MessageEvents = Emitter<{
  message: {
    type: 'info' | 'success' | 'warning' | 'error'
    content: string
  }
}>

export type MessageApi = {
  info(content: string): void
  success(content: string): void
  warning(content: string): void
  error(content: string): void
  withLoading<T>(promise: Promise<T>, content: string): Promise<T>
}

type MessageRecord = {
  id: number
  type: MessageType
  content: string
  visible: boolean
}

const messageEventsInjectKey: InjectionKey<MessageEvents> = Symbol('message-events')
const messageApiInjectKey: InjectionKey<MessageApi> = Symbol('message-api')

export function useMessageEvents(): MessageEvents {
  const ctx = inject(messageEventsInjectKey)
  if (ctx == null) throw new Error('useMessageEvents should be called inside of UIMessageProvider')
  return ctx
}

export function useMessageApi(): MessageApi {
  const ctx = inject(messageApiInjectKey)
  if (ctx == null) throw new Error('useMessage should be called inside of UIMessageProvider')
  return ctx
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRootContainer } from '../utils'
import UIMessageItem from './UIMessageItem.vue'

const attachTo = useRootContainer()
const emitter: MessageEvents = new Emitter()
const messages = ref<MessageRecord[]>([])
const hideTimers = new Map<number, number>()
let nextMessageId = 0

function clearHideTimer(id: number) {
  const timer = hideTimers.get(id)
  if (timer == null) return
  window.clearTimeout(timer)
  hideTimers.delete(id)
}

function hideMessage(id: number) {
  clearHideTimer(id)
  const message = messages.value.find((item) => item.id === id)
  if (message == null) return
  message.visible = false
}

function removeMessage(id: number) {
  clearHideTimer(id)
  const index = messages.value.findIndex((item) => item.id === id)
  if (index === -1) return
  messages.value.splice(index, 1)
}

function createMessage(type: MessageType, content: string, duration = 3000) {
  nextMessageId += 1
  const message: MessageRecord = {
    id: nextMessageId,
    type,
    content,
    visible: true
  }
  messages.value.push(message)

  if (duration > 0) {
    hideTimers.set(
      message.id,
      window.setTimeout(() => {
        hideMessage(message.id)
      }, duration)
    )
  }

  return {
    destroy() {
      hideMessage(message.id)
    }
  }
}

const messageApi: MessageApi = {
  info(content: string) {
    createMessage('info', content)
    emitter.emit('message', { type: 'info', content })
  },
  success(content: string) {
    createMessage('success', content)
    emitter.emit('message', { type: 'success', content })
  },
  warning(content: string) {
    createMessage('warning', content)
    emitter.emit('message', { type: 'warning', content })
  },
  error(content: string) {
    createMessage('error', content)
    emitter.emit('message', { type: 'error', content })
  },
  withLoading<T>(promise: Promise<T>, content: string): Promise<T> {
    const loading = createMessage('loading', content, 0)
    return promise.finally(() => loading.destroy())
  }
}

provide(messageEventsInjectKey, emitter)
provide(messageApiInjectKey, messageApi)

onBeforeUnmount(() => {
  hideTimers.forEach((timer) => {
    window.clearTimeout(timer)
  })
  hideTimers.clear()
})
</script>

<template>
  <slot></slot>
  <Teleport v-if="attachTo != null && messages.length > 0" :to="attachTo">
    <!--
      TransitionGroup is kept here for list-level move animations:
      when a message is inserted or removed, sibling items can slide smoothly
      into their new positions. Each message's own enter / leave animation is
      still handled by the Transition inside UIMessageItem.
    -->
    <TransitionGroup name="ui-message-stack" tag="div" class="ui-message-viewport">
      <div v-for="message in messages" :key="message.id" class="ui-message-stack-item">
        <UIMessageItem
          :type="message.type"
          :content="message.content"
          :visible="message.visible"
          @after-leave="removeMessage(message.id)"
        />
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style>
@layer components {
  .ui-message-viewport {
    position: fixed;
    top: 12px;
    left: 0;
    right: 0;
    z-index: 6000;
    height: 0;
    overflow: visible;
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
  }

  /* TransitionGroup automatically adds the *-move class to items whose position changes but that are not leaving. */
  .ui-message-stack-move {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
}
</style>
