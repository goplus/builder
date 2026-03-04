<script lang="ts" setup>
import { computed, inject, shallowRef, watch } from 'vue'
import { UIBlockItem, UIBlockItemTitle, UICornerIcon, UIDropdownWithTooltip, UIIcon, UIImg } from '@/components/ui'
import { useFileUrl, imgExts } from '@/utils/file'
import { useAsyncComputed } from '@/utils/utils'
import { selectFileWithUploadLimit } from '@/models/common/cloud'
import { fromNativeFile, type File } from '@/models/common/file'
import { useMessageHandle } from '@/utils/exception'
import type { Costume } from '@/models/spx/costume'
import { settingsInputCtxKey } from './SettingsInput.vue'
import imgCostume from './param-settings/assets/costume.svg'

const props = withDefaults(
  defineProps<{
    /** Available costumes to select from. When omitted, only local upload is shown. */
    costumes?: Costume[]
    /** The selected costume ID (mutually exclusive with referenceImage) */
    selectedCostumeId?: string | null
    /** The reference image file (mutually exclusive with selectedCostumeId) */
    referenceImage: File | null
    /** Whether to allow clearing the selection */
    clearable?: boolean
  }>(),
  {
    costumes: undefined,
    selectedCostumeId: null,
    clearable: true
  }
)

const emit = defineEmits<{
  'update:selectedCostumeId': [id: string | null]
  'update:referenceImage': [File | null]
}>()

const settingsInputCtx = inject(settingsInputCtxKey)
if (settingsInputCtx == null) throw new Error('settingsInputCtxKey should be provided')

const disabled = computed(() => settingsInputCtx.disabled || settingsInputCtx.readonly)
const iconOnly = computed(() => settingsInputCtx.iconOnly)

// Costume options with resolved image URLs
const costumeOptions = useAsyncComputed((onCleanup) => {
  if (props.costumes == null) return Promise.resolve([])
  return Promise.all(
    props.costumes.map(async (c) => {
      const url = await c.img.url(onCleanup)
      return { id: c.id, name: c.name, imageUrl: url }
    })
  )
})

// Track uploaded file locally so deselecting doesn't lose it
const uploadedFile = shallowRef<File | null>(props.referenceImage)
watch(
  () => props.referenceImage,
  (image) => {
    if (image != null) uploadedFile.value = image
  }
)
const [uploadedThumbnailUrl] = useFileUrl(() => uploadedFile.value)

// Current active state
const hasSelection = computed(() => props.selectedCostumeId != null || props.referenceImage != null)

// Determine button display: show selected costume image, uploaded image, or placeholder
const selectedCostumeOption = computed(() => {
  if (props.selectedCostumeId == null) return null
  return costumeOptions.value?.find((o) => o.id === props.selectedCostumeId) ?? null
})
const buttonImageUrl = computed(() => {
  if (selectedCostumeOption.value != null) return selectedCostumeOption.value.imageUrl
  if (props.referenceImage != null && uploadedThumbnailUrl.value != null) return uploadedThumbnailUrl.value
  return null
})

const name = { en: 'Reference image', zh: '参考图' }

const tooltipText = computed(() => {
  if (selectedCostumeOption.value != null) {
    return {
      en: `Reference image: ${selectedCostumeOption.value.name}`,
      zh: `参考图：${selectedCostumeOption.value.name}`
    }
  }
  if (props.referenceImage != null) {
    return { en: `Reference image: ${props.referenceImage.name}`, zh: `参考图：${props.referenceImage.name}` }
  }
  return name
})

const dropdownHintText = computed(() => {
  if (props.costumes == null) {
    return { en: 'Upload a local image as reference', zh: '上传本地图片作为参考' }
  }
  return {
    en: 'Select a generated costume or upload a local image as reference',
    zh: '选择已生成的造型或上传本地图片作为参考'
  }
})

function handleSelectCostume(id: string) {
  if (props.clearable && props.selectedCostumeId === id) {
    emit('update:selectedCostumeId', null)
  } else {
    emit('update:selectedCostumeId', id)
    emit('update:referenceImage', null)
  }
}

function handleClearCostume() {
  emit('update:selectedCostumeId', null)
}

const handleUpload = useMessageHandle(
  async () => {
    const nativeFile = await selectFileWithUploadLimit({ accept: imgExts })
    const file = fromNativeFile(nativeFile)
    uploadedFile.value = file
    emit('update:referenceImage', file)
    emit('update:selectedCostumeId', null)
  },
  { en: 'Failed to upload reference image', zh: '上传参考图失败' }
).fn

function handleToggleUploaded() {
  if (props.referenceImage != null) {
    if (!props.clearable) return
    emit('update:referenceImage', null)
  } else {
    emit('update:referenceImage', uploadedFile.value)
    emit('update:selectedCostumeId', null)
  }
}

function handleClearUploaded() {
  if (!props.clearable) return
  emit('update:referenceImage', null)
}
</script>

<template>
  <UIDropdownWithTooltip :disabled="disabled" placement="top">
    <template #trigger>
      <button
        v-radar="{
          name: $t(name),
          desc: 'Click to select a reference image for generation'
        }"
        class="param-button"
        :class="[{ 'icon-only': iconOnly }]"
        :disabled="disabled"
      >
        <img
          v-if="buttonImageUrl != null"
          :class="['button-image', { disabled, placeholder: !hasSelection }]"
          :src="buttonImageUrl"
          alt=""
        />
        <img v-else :class="['button-image', { disabled, placeholder: true }]" :src="imgCostume" alt="" />
        <template v-if="!iconOnly">
          {{ $t(name) }}
        </template>
      </button>
    </template>
    <template #tooltip-content>
      {{ $t(tooltipText) }}
    </template>
    <template #dropdown-content>
      <div class="dropdown-content">
        <div>{{ $t(dropdownHintText) }}</div>
        <ul class="options">
          <!-- Costume options -->
          <UIBlockItem
            v-for="option in costumeOptions"
            :key="option.id"
            v-radar="{
              name: `Option '${option.name}'`,
              desc: `Select '${option.name}' as reference image`
            }"
            class="option"
            :active="selectedCostumeId === option.id"
            @click="handleSelectCostume(option.id)"
          >
            <UIImg class="costume-image" :src="option.imageUrl" size="cover" />
            <UIBlockItemTitle size="medium">
              {{ option.name }}
            </UIBlockItemTitle>
            <UICornerIcon
              v-show="clearable && selectedCostumeId === option.id"
              type="minus"
              @click.stop.prevent="handleClearCostume"
            />
          </UIBlockItem>
          <!-- Uploaded image option -->
          <UIBlockItem
            v-if="uploadedFile != null && uploadedThumbnailUrl != null"
            v-radar="{ name: 'Uploaded reference', desc: 'Click to toggle uploaded reference image' }"
            class="option"
            :active="referenceImage != null"
            @click="handleToggleUploaded"
          >
            <img class="uploaded-image" :src="uploadedThumbnailUrl" alt="" />
            <UICornerIcon
              v-show="clearable && referenceImage != null"
              type="minus"
              @click.stop.prevent="handleClearUploaded"
            />
          </UIBlockItem>
          <!-- Upload button -->
          <UIBlockItem
            v-radar="{ name: 'Upload image', desc: 'Click to upload a local image' }"
            class="option"
            @click="handleUpload"
          >
            <div class="upload-placeholder">
              <UIIcon class="upload-icon" type="plus" />
            </div>
          </UIBlockItem>
        </ul>
      </div>
    </template>
  </UIDropdownWithTooltip>
</template>

<style lang="scss" scoped>
.param-button {
  height: 32px;
  padding: 0 8px 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 13px;
  line-height: 20px;

  color: var(--ui-color-grey-900);
  border-radius: var(--ui-border-radius-2);
  border: 1px solid var(--ui-color-grey-400);
  background: var(--ui-color-grey-100);

  &.icon-only {
    aspect-ratio: 1;
    padding: 0;
  }

  &:hover:not(:active, :disabled) {
    cursor: pointer;
    background: var(--ui-color-grey-300);
  }

  &:disabled {
    cursor: not-allowed;
    background: var(--ui-color-grey-300);
    color: var(--ui-color-grey-600);
  }
}

.button-image {
  width: 24px;
  height: 24px;
  border-radius: 10px;
  object-fit: cover;

  &.disabled {
    opacity: 0.4;
  }
  &.placeholder.disabled {
    filter: invert(96%) sepia(11%) saturate(163%) hue-rotate(169deg) brightness(91%) contrast(88%);
  }
}

.dropdown-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  max-width: 408px;

  .options {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }

  .costume-image {
    width: 80px;
    height: 60px;
    border-radius: 8px;
    margin-top: 2px;
    margin-bottom: 4px;
  }

  .uploaded-image,
  .upload-placeholder {
    width: 80px;
    height: 80px;
    border-radius: 8px;
    margin: 2px;
    object-fit: cover;
  }

  .upload-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ui-color-grey-400);

    .upload-icon {
      width: 24px;
      height: 24px;
      color: var(--ui-color-grey-700);
    }
  }
}
</style>
