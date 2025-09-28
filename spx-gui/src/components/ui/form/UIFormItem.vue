<template>
  <div class="ui-form-item">
    <NFormItem
      :show-label="!!label"
      :label="label"
      :path="path"
      v-bind="nFormItemProps"
      @compositionstart="handleCompositionStart"
      @compositionend="handleCompositionEnd"
    >
      <UIFormItemInternal :handle-content-blur="handleContentBlur" :handle-content-input="handleContentInput">
        <slot></slot>
      </UIFormItemInternal>
    </NFormItem>
    <p v-if="!!slots.tip" class="tip"><slot name="tip"></slot></p>
  </div>
</template>

<script setup lang="ts">
import { useSlots, computed } from 'vue'
import { NFormItem } from 'naive-ui'
import { debounce } from 'lodash'
import UIFormItemInternal from './UIFormItemInternal.vue'
import { useForm } from './UIForm.vue'

const props = defineProps<{
  label?: string
  path?: string
}>()

const slots = useSlots()
const form = useForm()

const validated = computed(() => (props.path != null ? form.form.validated[props.path] : null))
const nFormItemProps = computed(() => {
  if (validated.value == null) return undefined
  if (validated.value.hasError) return { validationStatus: 'error' as const, feedback: validated.value.error }
  return form.hasSuccessFeedback ? { validationStatus: 'success' as const } : undefined
})

/**
 * See: https://github.com/goplus/builder/issues/2089
 *
 * When using IME (Input Method Editor), input characters may be lost due to component updates during composition.
 *
 * Introduce the `isComposing` flag to track IME composition status.
 * Prevent `handleContentInput` from triggering validation while composing.
 * Debounce is used to reduce validation frequency in normal scenarios.
 * Effectively avoids unexpected updates and character loss during rapid IME input.
 */
let isComposing = false
function handleCompositionStart() {
  isComposing = true
}
function handleCompositionEnd() {
  isComposing = false
}

function handleContentBlur() {
  const path = props.path
  if (path == null) return
  setTimeout(() => {
    form.form.validateWithPath(path)
  }, 200)
}

const handleContentInput = debounce(() => {
  const path = props.path
  if (path == null || isComposing) return
  form.form.validateWithPath(path)
}, 300)
</script>

<style lang="scss" scoped>
.ui-form-item :deep(.n-form-item-feedback-wrapper) {
  line-height: 1.57143;
  &:empty {
    display: none;
  }
}

.ui-form-item + .ui-form-item {
  margin-top: 24px;
}

.tip {
  margin-top: 4px;
  color: var(--ui-color-hint-1);
}
</style>
