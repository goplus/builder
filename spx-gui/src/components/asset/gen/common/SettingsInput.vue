<script lang="ts">
type SettingsInputCtx = {
  iconOnly: boolean
  readonly: boolean
  disabled: boolean
}

export const settingsInputCtxKey: InjectionKey<ShallowReactive<SettingsInputCtx>> = Symbol('settingsInputCtxKey')
</script>

<script lang="ts" setup>
import {
  computed,
  watch,
  ref,
  provide,
  type InjectionKey,
  type ShallowReactive,
  shallowReactive,
  watchEffect
} from 'vue'

import { useContentSize } from '@/utils/dom'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'

import enrichingFileUrl from './enriching.lottie?url'
import enrichIcon from './enrich.svg?raw'

const props = withDefaults(
  defineProps<{
    description: string
    /**
     * If `descriptionPlaceholder` is provided and `description` is empty,
     * `description` will be synchronized with the placeholder value on the first focus.
     */
    descriptionPlaceholder?: string
    enriching?: boolean
    disabled?: boolean
    readonly?: boolean
  }>(),
  {
    enriching: false,
    descriptionPlaceholder: undefined,
    disabled: false,
    readonly: false
  }
)

const emit = defineEmits<{
  'update:description': [string]
  enrich: []
}>()

const focus = ref(false)
const enrichShow = computed(() => !ctx.readonly && focus.value && props.description.length > 0)

const onInput = (e: InputEvent) => {
  const target = e.target
  if (target instanceof HTMLTextAreaElement) {
    emit('update:description', target.value)
  }
}

const adopted = ref(false)
function onFocus() {
  focus.value = true
  if (!adopted.value && props.description === '') {
    emit('update:description', props.descriptionPlaceholder ?? '')
    adopted.value = true
  }
}

const ctx = shallowReactive({
  iconOnly: false,
  readonly: false,
  disabled: false
})

watchEffect(() => {
  ctx.disabled = props.disabled || props.enriching
  ctx.readonly = props.readonly
})

const wrapperRef = ref<HTMLElement | null>(null)
const wrapperSize = useContentSize(wrapperRef)

const iconOnlyThreshold = 550
watch(
  wrapperSize,
  (wrapperSize) => {
    if (wrapperSize == null) return
    ctx.iconOnly = wrapperSize.width < iconOnlyThreshold
  },
  { immediate: true }
)

provide(settingsInputCtxKey, ctx)
</script>

<template>
  <div
    ref="wrapperRef"
    class="description-input"
    :class="[{ disabled: ctx.disabled, readonly: ctx.readonly, enriching }]"
  >
    <div class="main">
      <div class="mirror" aria-hidden="true">
        <span class="mirror-text">{{ description }}</span>
        <div class="mirror-actions">
          <span v-if="enriching" class="enriching">
            <DotLottieVue class="animation" autoplay loop :src="enrichingFileUrl" />
            {{ $t({ zh: '正在丰富细节', en: 'Enriching details' }) }}
          </span>
          <!-- TODO: Standardize this button variant once the design system specification is finalized. -->
          <button
            v-else-if="enrichShow"
            v-radar="{ name: 'Enrich details', desc: 'Click to enrich the description' }"
            class="enrich-btn"
            @mousedown.prevent
            @click="emit('enrich')"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="icon" v-html="enrichIcon"></div>
            {{ $t({ zh: '丰富细节', en: 'Enrich details' }) }}
          </button>
        </div>
      </div>
      <textarea
        v-radar="{ name: 'Description', desc: 'Description input field for generation' }"
        class="description"
        :placeholder="
          !adopted && descriptionPlaceholder != null && descriptionPlaceholder.length > 0
            ? descriptionPlaceholder
            : $t({ zh: '请输入描述', en: 'Please enter description' })
        "
        :value="description"
        :disabled="ctx.disabled"
        :readonly="ctx.readonly"
        @input="onInput"
        @focus="onFocus"
        @blur="focus = false"
      />
    </div>
    <div class="footer">
      <div ref="extraRef" class="extra">
        <slot name="extra"></slot>
      </div>
      <slot v-if="!ctx.readonly" name="submit"></slot>
    </div>
  </div>
</template>

<style scoped>
.description-input {
  width: 100%;
  min-height: 172px;
  max-height: 300px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  transition: border-color 0.2s ease;
}

.description-input:has(.description:focus),
.description-input.enriching {
  border-color: var(--ui-color-turquoise-500);
}

.description-input.disabled:has(.description:focus),
.description-input.readonly:has(.description:focus) {
  border-color: var(--ui-color-grey-400);
}

.description-input.disabled .main {
  overflow: hidden;
}

.description-input.disabled .main .description {
  cursor: not-allowed;
  color: var(--ui-color-grey-600);
}

.description-input .main {
  position: relative;
  flex: 1;
  padding: 4px 0;
  display: grid;
  overflow-y: auto;
}

.description-input .main .description,
.description-input .main .mirror {
  grid-area: 1 / 1 / 2 / 2;
  padding: 0;
  margin: 0;
  font: inherit;
  font-size: 14px;
  line-height: 1.6;
  width: 100%;
  box-sizing: border-box;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: anywhere;
}

.description-input .main .description {
  border: none;
  resize: none;
  background: transparent;
  color: var(--ui-color-grey-900);
  caret-color: var(--ui-color-turquoise-500);
}

.description-input .main .description:read-only {
  color: var(--ui-color-grey-1000);
}

.description-input .main .description::placeholder {
  color: var(--ui-color-grey-700);
}

.description-input .main .description:focus {
  outline: none;
}

.description-input .main .mirror-text {
  visibility: hidden;
  pointer-events: none;
  display: inline;
}

.description-input .main .mirror-actions {
  display: inline-flex;
  margin-left: 12px;
  pointer-events: auto;
}

.description-input .main .enriching {
  display: flex;
  align-items: center;
  gap: 2px;
  height: fit-content;
  font-size: 12px;
  color: var(--ui-color-turquoise-500);
}

.description-input .main .enriching .animation {
  width: 16px;
  height: 16px;
}

.description-input .main .enrich-btn {
  border: 1px solid var(--ui-color-turquoise-300);
  border-radius: 4px;
  background-color: var(--ui-color-turquoise-200);
  color: var(--ui-color-turquoise-500);
  padding: 0 8px;
  font-size: 12px;
  display: flex;
  align-items: center;
  vertical-align: middle;
  height: 22px;
  cursor: pointer;
  position: relative;
}

.description-input .main .enrich-btn .icon {
  width: 14px;
  height: 14px;
}

.description-input .main .enrich-btn:hover {
  background-color: var(--ui-color-turquoise-100);
}

.description-input .footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.description-input .footer .extra {
  display: flex;
  padding: 4px;
  gap: 8px;
  flex: 1 1 0;
  width: max-content;
  overflow: hidden;
}

.description-input .footer .extra > * {
  flex-shrink: 0;
}
</style>
