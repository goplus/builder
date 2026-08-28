<template>
  <UIFormModal
    :radar="{ name: 'Create project modal', desc: 'Modal for creating a new project' }"
    class="project-create-modal"
    :title="$t({ en: 'Create a new project', zh: '创建新的项目' })"
    :visible="visible"
    :mask-closable="false"
    @update:visible="emit('update:visible', $event)"
  >
    <UIForm :form="form" has-success-feedback @submit="handleSubmit">
      <div data-testid="project-create-fields">
        <div class="h-7.5 text-grey-900">
          {{
            $t({
              en: 'The project name will also be used in project URLs.',
              zh: '项目名同时也会用于项目 URL。'
            })
          }}
        </div>
        <UIFormItem path="name">
          <UITextInput
            v-model:value="form.value.name"
            v-radar="{ name: 'Project name input', desc: 'Input field for project name' }"
            data-testid="project-name-input"
            :placeholder="$t({ en: 'Please enter the project name', zh: '请输入项目名' })"
          />
        </UIFormItem>

        <div class="mt-6">
          <div class="mb-3 text-title">{{ $t({ en: 'Game size', zh: '游戏尺寸' }) }}</div>

          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="preset in presets"
              :key="preset.id"
              v-radar="{
                name: `${preset.label.en} size preset`,
                desc: `Apply ${preset.width} by ${preset.height}`
              }"
              type="button"
              class="rounded-md border px-2 py-2 text-left transition-colors"
              :class="
                selectedPresetId === preset.id
                  ? 'border-primary-500 bg-primary-100 text-primary-700'
                  : 'border-grey-400 bg-grey-100 hover:bg-grey-300'
              "
              :data-testid="`create-preset-${preset.id}`"
              @click="applyPreset(preset)"
            >
              <div class="truncate text-xs">{{ $t(preset.label) }}</div>
              <div class="mt-1 text-2xs text-grey-700">{{ preset.width }} × {{ preset.height }}</div>
            </button>
          </div>

          <UIButton
            class="mt-3"
            type="neutral"
            :aria-expanded="customSizeVisible"
            @click="customSizeVisible = !customSizeVisible"
          >
            {{
              $t(
                customSizeVisible
                  ? { en: 'Hide custom size', zh: '收起自定义尺寸' }
                  : { en: 'Custom size', zh: '自定义尺寸' }
              )
            }}
          </UIButton>

          <div v-if="customSizeVisible" class="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <label class="flex flex-col gap-1 text-xs text-grey-800">
              {{ $t({ en: 'Width', zh: '宽度' }) }}
              <UINumberInput
                aria-label="Game width"
                data-testid="create-width-input"
                :value="widthInput"
                :min="1"
                @update:value="handleWidthInput"
              />
            </label>
            <span class="pb-2 text-grey-600">×</span>
            <label class="flex flex-col gap-1 text-xs text-grey-800">
              {{ $t({ en: 'Height', zh: '高度' }) }}
              <UINumberInput
                aria-label="Game height"
                data-testid="create-height-input"
                :value="heightInput"
                :min="1"
                @update:value="handleHeightInput"
              />
            </label>
          </div>
        </div>
      </div>

      <footer class="mt-8 flex justify-center">
        <UIButton
          v-radar="{ name: 'Create button', desc: 'Click to create the project' }"
          class="create-button"
          data-testid="create-project-button"
          type="primary"
          html-type="submit"
          :loading="loading"
          :disabled="!sizeValid"
        >
          {{ $t({ en: 'Create', zh: '创建' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>

<script lang="ts">
type GameSize = {
  width: number
  height: number
}

type Preset = GameSize & {
  id: 'classic' | 'wide' | 'portrait'
  label: { en: string; zh: string }
}

const presets: Preset[] = [
  { id: 'classic', label: { en: 'Original 4:3', zh: '原有 4:3' }, width: 480, height: 360 },
  { id: 'wide', label: { en: 'Wide example 16:9', zh: '横屏示例 16:9' }, width: 720, height: 405 },
  { id: 'portrait', label: { en: 'Portrait example 9:16', zh: '竖屏示例 9:16' }, width: 360, height: 640 }
]
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  UIButton,
  UIForm,
  UIFormItem,
  UIFormModal,
  UINumberInput,
  UITextInput,
  useForm,
  type FormValidationResult
} from '@/components/ui'
import { useI18n } from '@/utils/i18n'

defineProps<{
  visible: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  created: [payload: { name: string; gameSize: GameSize }]
}>()

const { t } = useI18n()
const form = useForm({
  name: ['MyGame', validateName]
})
const widthInput = ref<number | null>(480)
const heightInput = ref<number | null>(360)
const customSizeVisible = ref(false)

const sizeValid = computed(
  () => widthInput.value != null && widthInput.value > 0 && heightInput.value != null && heightInput.value > 0
)
const selectedPresetId = computed(() => {
  return presets.find((preset) => preset.width === widthInput.value && preset.height === heightInput.value)?.id ?? null
})
function applyPreset(preset: Preset) {
  widthInput.value = preset.width
  heightInput.value = preset.height
  customSizeVisible.value = false
}

function handleWidthInput(value: number | null) {
  widthInput.value = value
}

function handleHeightInput(value: number | null) {
  heightInput.value = value
}

function handleSubmit() {
  if (!sizeValid.value || widthInput.value == null || heightInput.value == null) return
  const gameSize = { width: widthInput.value, height: heightInput.value }
  emit('created', {
    name: form.value.name.trim(),
    gameSize
  })
}

function validateName(name: string): FormValidationResult {
  name = name.trim()
  if (name === '') return t({ en: 'The project name must not be blank', zh: '项目名不可为空' })
  if (!/^[\w-]+$/.test(name)) {
    return t({
      en: 'The project name can only contain letters, digits, and the characters - and _.',
      zh: '项目名仅可包含字母、数字以及字符 - 和 _。'
    })
  }
  return null
}
</script>
