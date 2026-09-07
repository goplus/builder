<script setup lang="ts">
import { computed } from 'vue'
import { useFileUrl } from '@/utils/file'
import { useAsyncComputed } from '@/utils/utils'
import type { File } from '@/models/common/file'
import type { Costume } from '@/models/spx/costume'
import type { ReferenceImageSelection } from '@/models/spx/gen/reference-image'
import { UIIcon } from '@/components/ui'
import ParamSelector from './param-settings/ParamSelector.vue'
import imgCostume from './param-settings/assets/costume.svg'
import { useReferenceImageUpload } from './useReferenceImageUpload'

const props = withDefaults(
  defineProps<{
    selection: ReferenceImageSelection
    referenceImage: File | null
    costumes: Costume[]
    clearable?: boolean
  }>(),
  {
    clearable: true
  }
)

const emit = defineEmits<{
  'update:selection': [selection: ReferenceImageSelection]
  'update:referenceImage': [file: File | null]
}>()

const name = { en: 'Reference image', zh: '参考图片' }
const localImageLabel = { en: 'Local image', zh: '本地图片' }
const localImageOption = { type: 'local-image' } as const
type OptionValue = Costume | typeof localImageOption

function isLocalImageOption(value: OptionValue): value is typeof localImageOption {
  return value === localImageOption
}

const costumeOptions = useAsyncComputed((onCleanup) =>
  Promise.all(
    props.costumes.map(async (costume) => ({
      value: costume,
      label: { en: costume.name, zh: costume.name },
      image: await costume.img.url(onCleanup)
    }))
  )
)
const [referenceImageUrl] = useFileUrl(() => props.referenceImage)

const options = computed(() => {
  const result = costumeOptions.value ?? []
  if (props.referenceImage == null) return result
  return [
    ...result,
    {
      value: localImageOption,
      label: localImageLabel,
      image: referenceImageUrl.value ?? undefined,
      removable: true
    }
  ]
})

const selectedValue = computed<OptionValue | null>(() => {
  const selection = props.selection
  if (selection == null) return null
  if (selection.type === 'local-image') return localImageOption
  return props.costumes.find((costume) => costume.id === selection.costumeId) ?? null
})

const placeholder = { label: name, image: imgCostume }

function handleSelection(value: OptionValue | null) {
  if (value == null) {
    emit('update:selection', null)
  } else if (isLocalImageOption(value)) {
    emit('update:selection', localImageOption)
  } else {
    emit('update:selection', { type: 'costume', costumeId: value.id })
  }
}

function handleRemoveOption(value: OptionValue) {
  if (isLocalImageOption(value)) emit('update:referenceImage', null)
}

const handleUpload = useReferenceImageUpload((file) => emit('update:referenceImage', file))
</script>

<template>
  <ParamSelector
    v-if="costumeOptions != null"
    :name="name"
    :tips="{ en: 'Select a costume or local image', zh: '请选择造型或本地图片' }"
    :options="options"
    :placeholder="placeholder"
    :clearable="clearable"
    :value="selectedValue"
    @update:value="handleSelection"
    @remove:option="handleRemoveOption"
  >
    <template v-if="referenceImage == null" #additional-options="{ disabled }">
      <button
        v-radar="{
          name: 'Upload local reference image',
          desc: 'Click to upload a local reference image'
        }"
        type="button"
        class="h-22 w-22 flex-none flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-grey-400 bg-grey-100 text-xs text-grey-700 cursor-pointer transition-colors enabled:hover:border-primary-main enabled:hover:bg-grey-300 enabled:active:bg-grey-400 focus-visible:border-primary-main focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-grey-300 disabled:text-grey-600"
        :disabled="disabled"
        :aria-label="$t({ en: 'Upload reference image', zh: '上传参考图片' })"
        @click="handleUpload"
      >
        <UIIcon type="upload" class="h-6 w-6" />
      </button>
    </template>
  </ParamSelector>
</template>
