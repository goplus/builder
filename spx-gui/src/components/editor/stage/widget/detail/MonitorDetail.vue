<template>
  <EditorItemDetail class="wrapper" :name="monitor.name" @rename="handleRename">
    <div class="content">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="preview" v-html="monitorIcon"></div>
      <div class="controls">
        <div class="line">
          <UITextInput
            v-radar="{ name: 'Label input', desc: 'Input field for monitor label' }"
            class="input"
            :value="monitor.label"
            @update:value="handleLabelUpdate"
          >
            <template #prefix>{{ $t({ en: 'Label', zh: '标签' }) }}:</template>
          </UITextInput>
          <UITextInput
            v-radar="{ name: 'Value input', desc: 'Input field for monitor value' }"
            class="input"
            :value="monitor.variableName"
            @update:value="handleValueUpdate"
          >
            <template #prefix>{{ $t({ en: 'Value', zh: '值' }) }}:</template>
          </UITextInput>
        </div>
        <div class="divider"></div>
        <div class="line">
          <UINumberInput
            v-radar="{ name: 'X position input', desc: 'Input field for monitor X position' }"
            class="input"
            :value="monitor.x"
            @update:value="handleXUpdate"
          >
            <template #prefix>X:</template>
          </UINumberInput>
          <UINumberInput
            v-radar="{ name: 'Y position input', desc: 'Input field for monitor Y position' }"
            class="input"
            :value="monitor.y"
            @update:value="handleYUpdate"
          >
            <template #prefix>Y:</template>
          </UINumberInput>
        </div>
        <div class="line">
          <UINumberInput
            v-radar="{ name: 'Size input', desc: 'Input field for monitor size' }"
            class="input"
            :min="0"
            :value="sizePercent"
            @update:value="handleSizePercentUpdate"
          >
            <template #prefix> {{ $t({ en: 'Size', zh: '大小' }) }}: </template>
            <template #suffix>%</template>
          </UINumberInput>
        </div>
        <div class="line">
          <p class="with-label">
            {{ $t({ en: 'Show', zh: '显示' }) }}:
            <UIButtonGroup
              v-radar="{ name: 'Visibility control', desc: 'Control to set monitor visibility' }"
              :value="monitor.visible ? 'visible' : 'hidden'"
              @update:value="(v) => handleVisibleUpdate(v === 'visible')"
            >
              <UIButtonGroupItem value="visible">
                <UIIcon type="eye" />
              </UIButtonGroupItem>
              <UIButtonGroupItem value="hidden">
                <UIIcon type="eyeSlash" />
              </UIButtonGroupItem>
            </UIButtonGroup>
          </p>
        </div>
      </div>
    </div>
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UITextInput, UINumberInput, UIButtonGroup, UIButtonGroupItem, UIIcon } from '@/components/ui'
import { round } from '@/utils/utils'
import { debounce } from 'lodash'
import { useMessageHandle } from '@/utils/exception'
import type { Monitor } from '@/models/widget/monitor'
import { useRenameWidget } from '@/components/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import EditorItemDetail from '../../../common/EditorItemDetail.vue'
import monitorIcon from '../monitor.svg?raw'

const props = defineProps<{
  monitor: Monitor
}>()

const editorCtx = useEditorCtx()
const renameWidget = useRenameWidget()
const handleRename = useMessageHandle(() => renameWidget(props.monitor), {
  en: 'Failed to rename widget',
  zh: '重命名控件失败'
}).fn

// We call wrapUpdateHandler `withDebounce: false` here, because:
// 1. Unlike `UINumberInput`, debounce for value-update causes delay of `UITextInput` UI-update
//   - `UITextInput` works like "controlled input" in React
//   - `UINumberInput` works like "uncontrolled input" in React
// 2. It's ok to omit the debounce for label / value update
// TODO: we should make the behaviors of different inputs (`UINumberInput`, `UITextInput`, ...) consistent. Then remove differences here.
const handleLabelUpdate = wrapUpdateHandler((label: string) => props.monitor.setLabel(label), false)
const handleValueUpdate = wrapUpdateHandler((value: string) => props.monitor.setVariableName(value), false)

// TODO: common logic may be extracted when we have more widget types
const handleXUpdate = wrapUpdateHandler((x: number | null) => props.monitor.setX(x ?? 0))
const handleYUpdate = wrapUpdateHandler((y: number | null) => props.monitor.setY(y ?? 0))

// use `round` to avoid `0.07 * 100 = 7.000000000000001`
// TODO: use some 3rd-party tool like [Fraction.js](https://github.com/rawify/Fraction.js)
const sizePercent = computed(() => round(props.monitor.size * 100))

const handleSizePercentUpdate = wrapUpdateHandler((sizeInPercent: number | null) => {
  if (sizeInPercent == null) return
  props.monitor.setSize(round(sizeInPercent / 100, 2))
})

const handleVisibleUpdate = wrapUpdateHandler((visible: boolean) => props.monitor.setVisible(visible), false)

function wrapUpdateHandler<Args extends any[]>(
  handler: (...args: Args) => unknown,
  withDebounce = true
): (...args: Args) => void {
  const name = props.monitor.name
  const action = { name: { en: `Configure widget ${name}`, zh: `修改控件 ${name} 配置` } }
  const wrapped = (...args: Args) => editorCtx.project.history.doAction(action, () => handler(...args))
  return withDebounce ? debounce(wrapped, 300) : wrapped
}
</script>

<style lang="scss" scoped>
.wrapper {
  background-color: var(--ui-color-grey-100);
}

.content {
  padding: 20px 0;
  display: flex;
  gap: 32px;
  justify-content: center;
}

.preview {
  flex: 0 0 auto;
  width: 96px;
  height: 96px;
  display: flex;
  justify-content: center;
  align-items: center;

  border-radius: 8px;
  background: var(--ui-color-grey-300);

  :deep(svg) {
    width: 44px;
    height: 44px;
  }
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.divider {
  /* TODO: Should this be extracted as something like `<UIDivider dashed />` ? */
  width: 100%;
  height: 1px;
  background: repeating-linear-gradient(90deg, var(--ui-color-grey-500) 0 4px, #0000 0 7px);
}

.line {
  display: flex;
  gap: 12px;
  align-items: center;
}

.input {
  width: 180px;
}

.with-label {
  display: flex;
  gap: 4px;
  align-items: center;
  word-break: keep-all;
}
</style>
