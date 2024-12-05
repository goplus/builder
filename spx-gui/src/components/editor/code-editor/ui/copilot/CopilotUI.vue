<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { UIIcon } from '@/components/ui'
import { useCodeEditorCtx } from '../CodeEditorUI.vue'
import CopilotInput from './CopilotInput.vue'
import type { CopilotController } from '.'
import CopilotRound from './CopilotRound.vue'

const props = defineProps<{
  controller: CopilotController
}>()

const codeEditorCtx = useCodeEditorCtx()
const bodyRef = ref<HTMLElement>()
const inputRef = ref<InstanceType<typeof CopilotInput>>()

function handleClose() {
  props.controller.endChat()
}

const rounds = computed(() => {
  const chat = props.controller.currentChat
  if (chat == null || chat.rounds.length === 0) return null
  return chat.rounds
})

function handleRetry() {
  props.controller.retryCurrentRound()
}

watch(
  () => codeEditorCtx.ui.isCopilotActive,
  async (active) => {
    if (!active) return
    await nextTick()
    inputRef.value?.focus()
  }
)
</script>

<template>
  <div class="copilot-ui">
    <header class="header">
      {{ $t({ en: 'Copilot', zh: 'Copilot' }) }}
      <button class="close">
        <UIIcon class="icon" type="close" @click="handleClose" />
      </button>
    </header>
    <div ref="bodyRef" class="body">
      <ul v-if="rounds != null" class="messages">
        <CopilotRound
          v-for="(round, i) in rounds"
          :key="i"
          :round="round"
          :is-last-round="i === rounds.length - 1"
          @retry="handleRetry()"
        />
      </ul>
      <div v-else class="placeholder">
        <!-- TODO: Update icon here -->
        <svg width="90" height="91" viewBox="0 0 90 91" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M61.8057 19.9034C61.3481 18.3437 60.3975 16.9741 59.0962 16C57.7949 15.0259 56.213 14.4996 54.5875 14.5H52.3911C50.6314 14.5 48.9274 15.1168 47.5754 16.2433C46.2234 17.3697 45.3091 18.9344 44.9915 20.6653L41.23 41.1617L42.1634 37.9682C42.6195 36.4062 43.5699 35.0343 44.872 34.0584C46.1741 33.0824 47.7576 32.5552 49.3849 32.5557H62.147L67.4997 34.6402L72.6588 32.5557H71.1534C69.5279 32.5561 67.946 32.0298 66.6447 31.0557C65.3434 30.0816 64.3927 28.712 63.9351 27.1522L61.8057 19.9034Z"
            fill="url(#paint0_radial_251_166)"
          />
          <path
            d="M29.6119 74.066C30.0648 75.6328 31.0145 77.0099 32.318 77.99C33.6216 78.9701 35.2083 79.5001 36.8392 79.5H41.5036C45.583 79.5 48.9195 76.2487 49.0241 72.17L49.5318 52.4067L48.4697 56.0357C48.0129 57.5968 47.0624 58.9677 45.7606 59.9428C44.4588 60.918 42.876 61.4448 41.2495 61.4443H28.3808L23.7931 58.9555L18.8264 61.445H20.3071C23.6572 61.445 26.6037 63.6602 27.5345 66.879L29.6119 74.066Z"
            fill="url(#paint1_radial_251_166)"
          />
          <path
            d="M54.2612 14.5H28.1975C20.7504 14.5 16.283 24.3423 13.304 34.184C9.77453 45.8443 5.15693 61.4384 18.517 61.4384H29.7705C33.1336 61.4384 36.0859 59.2148 37.0102 55.9811C38.9667 49.1359 42.3961 37.1941 45.0897 28.1032C46.4579 23.4837 47.5987 19.5161 49.3478 17.0454C50.33 15.6603 51.9647 14.5 54.2612 14.5Z"
            fill="url(#paint2_linear_251_166)"
          />
          <path
            d="M36.3835 79.5H62.4479C69.8943 79.5 74.3624 69.6564 77.3413 59.8128C80.8702 48.1505 85.4878 32.5537 72.1283 32.5537H60.8742C59.2383 32.5527 57.6465 33.0848 56.3402 34.0696C55.0338 35.0544 54.084 36.4381 53.6345 38.0111C51.678 44.8576 48.2486 56.802 45.555 65.8942C44.1861 70.515 43.046 74.4833 41.2962 76.9546C40.3147 78.3397 38.68 79.5 36.3835 79.5Z"
            fill="url(#paint3_radial_251_166)"
          />
          <path
            d="M36.3835 79.5H62.4479C69.8943 79.5 74.3624 69.6564 77.3413 59.8128C80.8702 48.1505 85.4878 32.5537 72.1283 32.5537H60.8742C59.2383 32.5527 57.6465 33.0848 56.3402 34.0696C55.0338 35.0544 54.084 36.4381 53.6345 38.0111C51.678 44.8576 48.2486 56.802 45.555 65.8942C44.1861 70.515 43.046 74.4833 41.2962 76.9546C40.3147 78.3397 38.68 79.5 36.3835 79.5Z"
            fill="url(#paint4_linear_251_166)"
          />
          <defs>
            <radialGradient
              id="paint0_radial_251_166"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(68.0828 41.3359) rotate(-129.304) scale(28.1178 26.4398)"
            >
              <stop offset="0.096" stop-color="#00AEFF" />
              <stop offset="0.773" stop-color="#2253CE" />
              <stop offset="1" stop-color="#0736C4" />
            </radialGradient>
            <radialGradient
              id="paint1_radial_251_166"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(24.3972 61.3281) rotate(51.84) scale(25.9856 25.2067)"
            >
              <stop stop-color="#FFB657" />
              <stop offset="0.634" stop-color="#FF5F3D" />
              <stop offset="0.923" stop-color="#C02B3C" />
            </radialGradient>
            <linearGradient
              id="paint2_linear_251_166"
              x1="26.6375"
              y1="20.1875"
              x2="30.3561"
              y2="63.2097"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0.156" stop-color="#0D91E1" />
              <stop offset="0.487" stop-color="#52B471" />
              <stop offset="0.652" stop-color="#98BD42" />
              <stop offset="0.937" stop-color="#FFC800" />
            </linearGradient>
            <radialGradient
              id="paint3_radial_251_166"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(73.4673 27.9569) rotate(109.274) scale(62.3793 74.7286)"
            >
              <stop offset="0.066" stop-color="#8C48FF" />
              <stop offset="0.5" stop-color="#F2598A" />
              <stop offset="0.896" stop-color="#FFB152" />
            </radialGradient>
            <linearGradient
              id="paint4_linear_251_166"
              x1="75.5265"
              y1="29.6872"
              x2="75.4999"
              y2="42.474"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0.058" stop-color="#F8ADFA" />
              <stop offset="0.708" stop-color="#A86EDD" stop-opacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <h4 class="title">
          {{
            $t({
              en: 'Ask copilot',
              zh: '向 Copilot 提问'
            })
          }}
        </h4>
        <p class="description">
          {{
            $t({
              en: 'TODO',
              zh: 'TODO'
            })
          }}
        </p>
      </div>
    </div>
    <footer class="footer">
      <CopilotInput ref="inputRef" class="input" :controller="props.controller" />
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.copilot-ui {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  background-color: var(--ui-color-grey-100);
}

.header {
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .close {
    width: 24px;
    height: 24px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    border: none;
    background: none;
    border-radius: 50%;
    color: var(--ui-color-grey-700);
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--ui-color-grey-400);
    }
    &:active {
      background-color: var(--ui-color-grey-500);
    }

    .icon {
      width: 18px;
      height: 18px;
    }
  }
}

.body {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  .placeholder {
    flex: 1 1 0;
    padding: 0 30px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    .title {
      margin-top: 8px;
      font-size: 20px;
      line-height: 1.4;
      color: var(--ui-color-title);
    }

    .description {
      margin-top: 16px;
      font-size: 13px;
      line-height: 20px;
    }
  }
}

.footer {
  padding: 12px 16px;
  display: flex;

  .input {
    flex: 1 1 0;
    min-width: 0;
  }
}
</style>
