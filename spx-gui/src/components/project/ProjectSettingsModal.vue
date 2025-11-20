<template>
  <UIFormModal
    :title="$t({ en: 'Project Settings', zh: '项目设置' })"
    :visible="props.visible"
    @update:visible="emit('cancelled')"
  >
    <UIForm :form="form" @submit="handleSubmit.fn">
      <UIFormItem :label="$t({ en: 'Art Style', zh: '美术风格' })" path="artStyle">
        <UISelect v-model:value="form.value.artStyle" clearable>
          <UISelectOption
            v-for="option in artStyleOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ $t(option.label) }}
          </UISelectOption>
        </UISelect>
      </UIFormItem>

      <UIFormItem :label="$t({ en: 'Perspective', zh: '视角' })" path="perspective">
        <UISelect v-model:value="form.value.perspective" clearable>
          <UISelectOption
            v-for="option in perspectiveOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ $t(option.label) }}
          </UISelectOption>
        </UISelect>
      </UIFormItem>

      <footer class="footer">
        <UIButton type="boring" @click="emit('cancelled')">
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton type="primary" html-type="submit" :loading="handleSubmit.isLoading.value">
          {{ $t({ en: 'Save', zh: '保存' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>

<script setup lang="ts">
import {
  UIForm,
  UIFormItem,
  UIFormModal,
  UISelect,
  UISelectOption,
  UIButton,
  useForm
} from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import type { Project } from '@/models/project'
import { artStyleOptions, perspectiveOptions } from './types'

const props = defineProps<{
  visible: boolean
  project: Project
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const form = useForm({
  artStyle: [props.project.settings?.artStyle ?? null],
  perspective: [props.project.settings?.perspective ?? null]
})

const handleSubmit = useMessageHandle(
  async () => {
    props.project.settings = {
      artStyle: form.value.artStyle || null,
      perspective: form.value.perspective || null
    }

    await props.project.saveToCloud()

    emit('resolved')
  },
  { en: 'Failed to save settings', zh: '保存设置失败' },
  { en: 'Settings saved', zh: '设置已保存' }
)
</script>

<style lang="scss" scoped>
.footer {
  margin-top: 40px;
  display: flex;
  gap: var(--ui-gap-middle);
  justify-content: flex-end;
}
</style>
