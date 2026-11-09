<script lang="ts">
import { inject, provide, type InjectionKey } from 'vue'
import Emitter from '@/utils/emitter'

export type MessageType = 'info' | 'success' | 'warning' | 'error' | 'loading'

export type MessageEvents = Emitter<{
  message: {
    // loading messages are transient internal state and must not trigger event-bus notifications.
    type: Exclude<MessageType, 'loading'>
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
}

const messageEventsInjectKey: InjectionKey<MessageEvents> = Symbol('message-events')
const messageApiInjectKey: InjectionKey<MessageApi> = Symbol('message-api')

export function useMessageEvents(): MessageEvents {
  const ctx = inject(messageEventsInjectKey)
  if (ctx == null) throw new Error('useMessageEvents should be called inside of UIMessageProvider')
  return ctx
}

export function useMessage(): MessageApi {
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
    content
  }
  messages.value.push(message)

  if (duration > 0) {
    hideTimers.set(
      message.id,
      window.setTimeout(() => {
        removeMessage(message.id)
      }, duration)
    )
  }

  return {
    destroy() {
      removeMessage(message.id)
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

/**
 * Pin the leaving item to its current visual position before taking it out of
 * layout flow. This lets sibling move animations start immediately without the
 * leaving node jumping to the top of the viewport.
 */
function handleBeforeLeave(el: Element) {
  const target = el as HTMLElement
  const offsetParent = target.offsetParent
  const container = offsetParent instanceof HTMLElement ? offsetParent : target.parentElement
  if (container == null) return

  const targetRect = target.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  target.style.position = 'absolute'
  target.style.left = `${targetRect.left - containerRect.left}px`
  target.style.top = `${targetRect.top - containerRect.top}px`
  target.style.width = `${targetRect.width}px`
  target.style.height = `${targetRect.height}px`
}
</script>

<template>
  <slot></slot>
  <Teleport v-if="attachTo != null" :to="attachTo">
    <TransitionGroup
      name="ui-message-stack"
      tag="div"
      class="ui-message-viewport"
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions"
      :on-before-leave="handleBeforeLeave"
    >
      <UIMessageItem v-for="message in messages" :key="message.id" :type="message.type" :content="message.content" />
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
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

  .ui-message-stack-enter-active,
  .ui-message-stack-leave-active,
  .ui-message-stack-move {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .ui-message-stack-enter-active,
  .ui-message-stack-leave-active {
    transition-property: opacity, transform;
    transform-origin: top center;
  }

  .ui-message-stack-enter-from,
  .ui-message-stack-leave-to {
    opacity: 0;
    transform: scale(0.6);
  }
}
</style>
