<!--
  The conversation body shared by every copilot presentation shell (the floating panel and the
  editor's docked panel): rounds, quick inputs, the welcome screen, and the input box. Shells own
  their chrome (frame, positioning, open/close) and wire the dragger to their own gesture via the
  exposed `draggerEl`.
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBottomSticky } from '@/utils/dom'
import { assertNever } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import { isDeveloperMode } from '@/utils/developer-mode'
import type { LocaleMessage } from '@/utils/i18n'
import { UIButton, UITooltip } from '@/components/ui'
import CopilotInput from './CopilotInput.vue'
import CopilotRound from './CopilotRound.vue'
import { useCopilot } from './context'
import { type QuickInput, type Round, RoundState } from './copilot'
import { isSilentContent } from './markdown-elements/StaySilent'
import { stripThinking } from './content-visibility'

const props = withDefaults(
  defineProps<{
    /** Docked layout: fill the shell's height budget and let only the output scroll. */
    docked?: boolean
  }>(),
  { docked: false }
)

const copilot = useCopilot()

const outputRef = ref<HTMLElement | null>(null)
const draggerRef = ref<HTMLElement | null>(null)

const session = computed(() => copilot.currentSession)

const rounds = computed(() => {
  if (session.value == null || session.value.rounds.length === 0) return null
  return session.value.rounds
})

/**
 * Whether the round is a "silent" one: the copilot completed it while choosing to say nothing
 * (only a `stay-silent` element, or no displayable content at all).
 */
function isSilentRound(round: Round) {
  if (round.state !== RoundState.Completed) return false
  // Thinking blocks hide their inner text too, so reasoning never counts as visible content.
  const content = stripThinking(
    round.resultMessages
      .filter((m) => m.role === 'copilot')
      .map((m) => m.content ?? '')
      .join('')
  )
  if (isSilentContent(content)) return true
  // A reply of invisible elements only (e.g. a lone progress report, or the silent course setup)
  // shows nothing either. Use the accumulated invisible tag names, not the currently-registered
  // ones, so a level-gated element (spotlight, etc.) is still recognized after it is unregistered.
  const invisibleTags = [...copilot.invisibleTagNames]
  if (invisibleTags.length === 0) return false
  const invisiblePattern = new RegExp(`</?(?:${invisibleTags.join('|')})\\b[^>]*>`, 'g')
  return content.replace(invisiblePattern, '').trim() === ''
}

// A round that carries nothing worth showing. Besides silent rounds, an ambient EVENT round that
// was cancelled is skipped: events batch (a newer event aborts the in-flight one), and — now that
// hiding the panel no longer aborts — a user who keeps editing while the panel is hidden would
// otherwise reopen to a stray "Cancelled". A cancelled TYPED round stays visible (the user
// explicitly stopped their own request and may want the retry affordance).
function isSkippableRound(round: Round) {
  if (round.state === RoundState.Cancelled && round.userMessage.type === 'event') return true
  return isSilentRound(round)
}

const lastRound = computed(() => rounds.value?.at(-1) ?? null)

const allRounds = computed(() => rounds.value ?? [])

/**
 * Whether a round belongs in the chat history. Only rounds the user started by sending a message
 * do — ambient event rounds are perception, not conversation, and whatever they produce (a
 * spotlight, a guidance modal, a video) shows itself outside the chat. Rounds where the copilot
 * said nothing are left out too. In developer mode everything shows, for prompt debugging.
 *
 * Note that rounds left out are still rendered, just hidden (see the template): the elements in a
 * reply drive their effects — narrowing the API panel, opening a video or the success dialog — by
 * being mounted, so skipping the render entirely would silently drop them.
 */
function isChatVisible(round: Round) {
  if (isDeveloperMode.value) return true
  if (round.userMessage.type !== 'text') return false
  if ([RoundState.Loading, RoundState.Initialized].includes(round.state)) return round === lastRound.value
  return !isSkippableRound(round)
}

const hasVisibleRounds = computed(() => allRounds.value.some((round) => isChatVisible(round)))

/** Nothing but the input box shows — shells may reshape their chrome around this. */
const onlyInput = computed(() => !hasVisibleRounds.value && session.value != null)

useBottomSticky(outputRef)

const suggestedQuestions: LocaleMessage[] = [
  {
    en: 'What can XBuilder do?',
    zh: 'XBuilder 可以做什么？'
  },
  {
    en: 'How to create a new project?',
    zh: '如何创建一个新项目？'
  },
  {
    en: 'Please describe the functions of this page.',
    zh: '介绍下这个页面有哪些功能。'
  }
]
const handleSuggestedPromptClick = useMessageHandle((message: string) => copilot.addUserTextMessage(message), {
  en: 'Failed to send message',
  zh: '发送消息失败'
}).fn

const quickInputs = computed(() => copilot.getQuickInputs())

const handleQuickInputClick = useMessageHandle(
  ({ message }: QuickInput) => {
    switch (message.type) {
      case 'text':
        return copilot.addUserTextMessage(message.content)
      case 'event':
        return copilot.notifyUserEvent(message.name, message.detail)
      default:
        assertNever(message)
    }
  },
  { en: 'Failed to send message', zh: '发送消息失败' }
).fn

defineExpose({
  /** The drag handle at the panel top; the shell binds its own gesture (move / resize) to it. */
  draggerEl: draggerRef
})
</script>

<template>
  <div class="copilot-chat" :class="{ docked: props.docked, 'only-input': onlyInput }">
    <div ref="draggerRef" class="dragger">
      <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="1.5" cy="1" r="1" fill="#A7B1BB" />
        <circle cx="6" cy="1" r="1" fill="#A7B1BB" />
        <circle cx="10.5" cy="1" r="1" fill="#A7B1BB" />
        <circle cx="1.5" cy="4.5" r="1" fill="#A7B1BB" />
        <circle cx="6" cy="4.5" r="1" fill="#A7B1BB" />
        <circle cx="10.5" cy="4.5" r="1" fill="#A7B1BB" />
      </svg>
    </div>
    <div ref="outputRef" class="output" :class="{ 'has-content': hasVisibleRounds || session == null }">
      <!-- Every round is rendered so the elements in its reply can take effect on mount; the
           ones that don't belong in the chat are hidden rather than skipped. -->
      <CopilotRound
        v-for="round in allRounds"
        v-show="isChatVisible(round)"
        :key="round.id"
        :round="round"
        :is-last-round="round === lastRound"
      />
      <template v-if="hasVisibleRounds">
        <div v-if="quickInputs.length > 0" class="quick-inputs">
          <UITooltip v-for="(qi, i) in quickInputs" :key="i">
            {{ $t({ en: `Click to send "${qi.text.en}"`, zh: `点击发送“${qi.text.zh}”` }) }}
            <template #trigger>
              <UIButton type="neutral" @click="handleQuickInputClick(qi)">{{ $t(qi.text) }}</UIButton>
            </template>
          </UITooltip>
        </div>
      </template>
      <template v-else-if="session == null">
        <div class="px-2 pb-2">
          <div class="hi">
            {{ $t({ en: 'Hi, friend', zh: '你好，小伙伴' }) }}
          </div>
          <div class="tips">
            {{ $t({ en: 'I can help you with XBuilder, just ask!', zh: '我可以帮助你了解并使用 XBuilder，尽管问！' }) }}
          </div>
          <div class="suggested-questions-wrapper">
            <button
              v-for="(suggestedQuestion, index) in suggestedQuestions"
              :key="index"
              class="suggested-question"
              @click="handleSuggestedPromptClick($t(suggestedQuestion))"
            >
              {{ $t(suggestedQuestion) }}
            </button>
          </div>
        </div>
      </template>
    </div>
    <div class="divider"></div>
    <CopilotInput class="input" :copilot="copilot" />
  </div>
</template>

<style scoped>
.copilot-chat {
  position: relative;
  overflow: hidden;
  transition: opacity ease 0.4s;
  border-radius: var(--ui-border-radius-lg);
  z-index: 2;
}

/* Docked layout: grow with the conversation up to the shell's (draggable) ceiling, then the
   output scrolls. */
.copilot-chat.docked {
  height: auto;
  min-height: 120px;
  max-height: var(--docked-copilot-panel-height, 320px);
  display: flex;
  flex-direction: column;
}

.dragger {
  position: absolute;
  height: 14px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: move;
  background-color: var(--ui-color-grey-100);
  transition: background-color ease-in-out 0.3s;
  z-index: 1;
}

.copilot-chat.docked .dragger {
  cursor: ns-resize;
}

.dragger:hover {
  background-color: var(--ui-color-grey-300);
}

.output {
  background: var(--ui-color-grey-100);
  max-height: 300px;
  font-size: var(--ui-font-size-sm);
  overflow-y: auto;
  scrollbar-width: thin;
}

.copilot-chat.docked .output {
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
}

/* Hidden rounds still occupy the DOM (they are rendered for their effects), so key the spacing on
   whether anything is actually shown rather than on `:not(:empty)`. */
.output.has-content {
  margin-top: 14px;
  padding: 12px 16px 16px 16px;
}

.output .hi {
  font-size: var(--ui-font-size-2xl);
  line-height: 28px;
  color: var(--ui-color-grey-1000);
}

.output .tips {
  margin-top: 4px;
  color: var(--ui-color-grey-700);
}

.output .suggested-questions-wrapper {
  width: 100%;
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.output .quick-inputs {
  padding-top: 20px;
  display: flex;
  flex-direction: row;
  gap: 8px;
  background: var(--ui-color-grey-100);
}

/**
 * `.suggested-question` here is like UIButton with `size: large` & `type: white`, while with
 * different padding, font style & alignment. So we don't use UIButton here to have better control on the style.
 */

.output .suggested-question {
  width: 100%;
  padding: 10px 12px;

  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  border: 1px solid var(--ui-color-grey-400);
  color: var(--ui-color-grey-900);
  font-size: var(--ui-font-size-sm);
  line-height: 20px;
  white-space: normal;
  text-align: left;
  transition: 0.3s;
  cursor: pointer;
}

.output .suggested-question:hover {
  background: var(--ui-color-grey-300);
}

.output .suggested-question:active {
  background: var(--ui-color-grey-400);
}

.divider {
  background: linear-gradient(90deg, #72bbff 0%, #c390ff 100%);
  height: 1px;
}

.input {
  height: 62px;
  overflow: hidden;
}

.copilot-chat.docked .input {
  flex: none;
}
</style>
