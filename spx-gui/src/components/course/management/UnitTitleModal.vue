<script setup lang="ts">
import { courseSeriesUnitTitleMaxLength } from '@/apis/course-series'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { UIButton, UIForm, UIFormItem, UIFormModal, UITextInput, useForm } from '@/components/ui'

const props = defineProps<{
  visible: boolean
  /** What the title is asked for, such as "New unit". */
  action: LocaleMessage
  /** The unit's title so far, empty for a new unit. */
  title: string
  /** What else the action does. */
  tip?: LocaleMessage
}>()

const emit = defineEmits<{
  resolved: [title: string]
  cancelled: []
}>()

const i18n = useI18n()

const form = useForm({
  title: [
    props.title,
    (v: string) => {
      const title = v.trim()
      if (title === '') return i18n.t({ en: 'Please enter unit title', zh: '请输入单元名称' })
      if ([...title].length > courseSeriesUnitTitleMaxLength)
        return i18n.t({
          en: `Title too long (max ${courseSeriesUnitTitleMaxLength} chars)`,
          zh: `名称过长（最多 ${courseSeriesUnitTitleMaxLength} 字符）`
        })
      return null
    }
  ]
})

function handleSubmit() {
  emit('resolved', form.value.title.trim())
}
</script>

<template>
  <UIFormModal
    :radar="{ name: 'unit-title-modal', desc: 'Modal for entering the title of a unit' }"
    style="width: 512px"
    :title="$t(action)"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <UIForm :form="form" @submit="handleSubmit">
      <UIFormItem path="title">
        <UITextInput
          v-model:value="form.value.title"
          v-radar="{ name: 'unit-title-input', desc: 'Input field for the unit title' }"
          :placeholder="$t({ en: 'Unit title', zh: '单元名称' })"
        />
        <template v-if="tip != null" #tip>{{ $t(tip) }}</template>
      </UIFormItem>
      <footer class="mt-10 flex justify-end gap-xl">
        <UIButton
          v-radar="{ name: 'cancel-button', desc: 'Click to cancel' }"
          type="neutral"
          @click="emit('cancelled')"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton v-radar="{ name: 'confirm-button', desc: 'Click to confirm' }" type="primary" html-type="submit">
          {{ $t({ en: 'Confirm', zh: '确认' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>
