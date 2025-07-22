<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBottomSticky } from '@/utils/dom'
import { timeout } from '@/utils/utils'
import { UIIcon, UITooltip } from '@/components/ui'
import CopilotInput from './CopilotInput.vue'
import CopilotRound from './CopilotRound.vue'
import logoSrc from './logo.png'
import { useCopilot } from './CopilotRoot.vue'

const copilot = useCopilot()

const bodyRef = ref<HTMLElement | null>(null)
const inputRef = ref<InstanceType<typeof CopilotInput>>()

const session = computed(() => copilot.currentSession)

const title = computed(() => {
  if (session.value == null) return null
  return session.value.topic.title
})

const rounds = computed(() => {
  if (session.value == null || session.value.rounds.length === 0) return null
  return session.value.rounds
})

const StateIndicator = computed(() => session.value?.topic.stateIndicator)

async function handleNewSession() {
  copilot.endCurrentSession()
  await timeout(100) // TODO
  inputRef.value?.focus()
}

useBottomSticky(bodyRef)

// TODO: prevent click in copilot panel from closing other dropdowns
</script>

<template>
  <div class="copilot-ui">
    <div v-show="!copilot.active" class="copilot-trigger" @click="copilot.open()">
      <div class="copilot-trigger-content">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="12" fill="url(#paint0_linear_931_4390)" />
          <path
            d="M27.1326 16.4061C27.6217 17.2175 28.4776 17.7029 29.4224 17.7029C30.6229 17.714 31.7456 16.8507 32.005 15.6613C32.1791 14.9277 32.0383 14.1644 31.6381 13.5346C27.6773 6.67626 17.5584 5.32387 11.9784 10.9817C10.9521 11.9784 10.1369 13.0862 9.51075 14.2867H9.50704L9.43294 14.4386C9.4033 14.4979 9.36995 14.5572 9.34402 14.6165C9.34402 14.6165 9.34772 14.6165 9.35143 14.6128V14.6202C9.35143 14.6202 9.34772 14.6202 9.34402 14.6202C9.33661 14.635 9.3292 14.6535 9.32179 14.6721L9.26991 14.7795C8.6215 16.143 8.21023 17.5436 8.08055 19.1479C7.99162 20.215 8.0472 21.2784 8.23246 22.301C8.43254 23.3607 8.75119 24.3648 9.17358 25.2985L9.20322 25.3615C9.20692 25.3726 9.21433 25.3838 9.21804 25.3949C9.22916 25.4208 9.24398 25.4468 9.25509 25.469L9.32179 25.6098H9.3292C11.8858 30.7526 17.8585 33.6612 23.4867 32.3088C26.6324 31.727 32.3829 27.9589 31.916 24.4019C31.4121 22.038 28.0923 21.6378 26.9511 23.7609C26.173 24.9984 25.1022 25.8914 23.8721 26.5398C22.8939 27.014 21.812 27.2771 20.693 27.2771C20.2743 27.2771 19.8482 27.2364 19.437 27.1623C19.3517 27.1474 19.2628 27.1326 19.1887 27.1326C19.1183 27.1326 19.0664 27.1474 19.0071 27.1808C18.4588 27.492 18.355 27.5476 17.8104 27.8292L17.2138 28.1552C16.5951 28.5221 15.7318 28.9815 15.3538 28.1404V28.1293C15.2983 27.8996 15.3575 27.681 15.3872 27.5735C15.4316 27.4142 15.4761 27.2512 15.5243 27.0696C15.628 26.6806 15.7355 26.273 15.8837 25.8766C15.9541 25.695 15.9689 25.6394 15.7355 25.4208C13.831 23.6275 13.0788 21.397 13.5012 18.8071C13.7569 17.2361 14.4868 15.88 15.6725 14.7721C17.1212 13.4234 18.7885 12.7417 20.6152 12.7417C21.0932 12.7417 21.5934 12.7898 22.0973 12.8862C22.1825 12.901 22.2751 12.9195 22.3603 12.938H22.3826C24.4056 13.3827 26.0025 14.5461 27.1252 16.4024L27.1326 16.4061Z"
            fill="white"
          />
          <defs>
            <linearGradient id="paint0_linear_931_4390" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
              <stop stop-color="#9A77FF" />
              <stop offset="1" stop-color="#735FFA" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
    <div v-show="copilot.active" class="copilot-panel">
      <header class="header">
        <h4 class="title">{{ $t(title) }}</h4>
        <template v-if="StateIndicator != null">
          <StateIndicator />
        </template>
        <UITooltip v-if="session != null && session.topic.endable !== false">
          {{ $t({ en: 'New chat', zh: '新建会话' }) }}
          <template #trigger>
            <button class="btn">
              <UIIcon class="icon" type="plus" @click="handleNewSession" />
            </button>
          </template>
        </UITooltip>
        <button v-if="session == null" class="btn" disabled>
          <UIIcon class="icon" type="plus" />
        </button>
        <UITooltip>
          {{ $t({ en: 'Close the panel', zh: '关闭对话框' }) }}
          <template #trigger>
            <button class="btn">
              <UIIcon class="icon" type="close" @click="copilot.close()" />
            </button>
          </template>
        </UITooltip>
      </header>
      <div ref="bodyRef" class="body">
        <!-- <MarkdownView :value="testContent"></MarkdownView> -->
        <ul v-if="rounds != null" class="messages">
          <CopilotRound v-for="(round, i) in rounds" :key="i" :round="round" :is-last-round="i === rounds.length - 1" />
        </ul>
        <div v-else class="placeholder">
          <img class="logo" :src="logoSrc" alt="Copilot" />
          <h4 class="title">
            {{
              $t({
                en: 'Hi, I am Copilot',
                zh: '你好，我是 Copilot'
              })
            }}
          </h4>
          <p class="description">
            {{
              $t({
                en: 'I can help you with XBuilder, please type your question or what you want to do below.',
                zh: '我可以帮助你了解并使用 XBuilder，请在下方输入你的问题或想做的事。'
              })
            }}
          </p>
        </div>
      </div>
      <footer class="footer">
        <CopilotInput ref="inputRef" class="input" :copilot="copilot" />
      </footer>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.copilot-ui {
}

.copilot-trigger {
  position: fixed;
  z-index: 9999; // TODO
  right: 0;
  bottom: 20px;

  cursor: pointer;
  border-radius: 12px 0px 0px 12px;
  border: 1px solid #fff;
  background: #c390ff;
  background: linear-gradient(90deg, #72bbff 0%, #c390ff 100%);
  box-shadow: 0px 4px 8px -16px rgba(0, 0, 0, 0.08);
}

.copilot-trigger-content {
  display: flex;
  margin: 1px 0 1px 1px;
  padding: 4px 9px 4px 4px;
  border-radius: 11px 0px 0px 11px;
  background: var(--ui-color-grey-100);
}

.copilot-panel {
  position: fixed;
  z-index: 9999; // TODO
  right: 10px;
  bottom: 20px;
  top: 100px;
  width: 340px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;

  border-radius: 8px;
  border: 1px solid var(--ui-color-grey-400);
  background-color: var(--ui-color-grey-100);
  box-shadow: 0px 16px 32px 0px rgba(36, 41, 47, 0.1);
}

.header {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 8px;

  .title {
    flex: 1 1 0;
  }

  .btn {
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
    transition: background-color 0.2s;

    &:not(:disabled) {
      cursor: pointer;
      &:hover {
        background-color: var(--ui-color-grey-400);
      }
      &:active {
        background-color: var(--ui-color-grey-500);
      }
    }

    &:disabled {
      cursor: not-allowed;
      color: var(--ui-color-grey-600);
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

    .logo {
      width: 90px;
    }

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
      text-align: center;
      color: var(--ui-color-grey-800);
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
