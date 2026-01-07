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

import { UIButton, UIIcon } from '@/components/ui'
import { useContentSize } from '@/utils/dom'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'

import enrichingFileUrl from './enriching.lottie?url'

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
const enrichShow = computed(() => focus.value && props.description.length > 0)

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
  ctx.disabled = props.disabled
  ctx.readonly = props.readonly
})
const descriptionDisabled = computed(() => props.enriching || ctx.readonly || ctx.disabled)

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
          <UIButton
            v-else-if="enrichShow"
            class="enrich-btn"
            color="secondary"
            size="small"
            variant="stroke"
            @mousedown.prevent
            @click="emit('enrich')"
          >
            <UIIcon type="edit" />
            {{ $t({ zh: '丰富细节', en: 'Enrich details' }) }}
          </UIButton>
        </div>
      </div>
      <textarea
        class="description"
        :placeholder="
          !adopted && descriptionPlaceholder != null && descriptionPlaceholder.length > 0
            ? descriptionPlaceholder
            : $t({ zh: '请输入描述', en: 'Please enter description' })
        "
        :value="description"
        :disabled="descriptionDisabled"
        @input="onInput"
        @focus="onFocus"
        @blur="focus = false"
      />
    </div>
    <div class="footer">
      <div ref="extraRef" class="extra">
        <slot name="extra"></slot>
      </div>
      <slot name="submit"></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.description-input {
  width: 100%;
  min-height: 172px;
  max-height: 300px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-2);
  background: var(--ui-color-grey-100);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  transition: border-color 0.2s ease;

  &:has(.description:focus),
  &.enriching {
    border-color: var(--ui-color-turquoise-500);
  }

  &.disabled,
  &.readonly {
    &:has(.description:focus) {
      border-color: var(--ui-color-grey-400);
    }
  }

  &.disabled {
    .main {
      overflow: hidden;

      .description {
        color: var(--ui-color-grey-600);
      }
    }
  }
}

.main {
  position: relative;
  flex: 1;
  padding: 4px 0;
  display: grid;
  overflow-y: auto;

  .description,
  .mirror {
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

  .description {
    border: none;
    resize: none;
    background: transparent;
    color: var(--ui-color-grey-900);
    caret-color: var(--ui-color-turquoise-500);

    &:focus {
      outline: none;
    }
  }

  .mirror-text {
    visibility: hidden;
    pointer-events: none;
    display: inline;
  }

  .mirror-actions {
    display: inline-flex;
    margin-left: 12px;
    pointer-events: auto;
  }

  .enriching {
    display: flex;
    align-items: center;
    gap: 2px;
    height: fit-content;
    color: var(--ui-color-turquoise-500);

    .animation {
      width: 16px;
      height: 16px;
    }
  }

  .enrich-btn {
    cursor: pointer;
    vertical-align: middle;
    position: relative;
    top: -2px;
  }
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  .extra {
    display: flex;
    padding: 4px;
    gap: 8px;
    flex: 1 1 0;
    width: max-content;
    overflow: hidden;

    & > * {
      flex-shrink: 0;
    }
  }
}
</style>
