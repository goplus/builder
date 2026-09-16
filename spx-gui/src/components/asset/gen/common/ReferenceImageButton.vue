<script setup lang="ts">
import { ref } from 'vue'
import { useFileUrl } from '@/utils/file'
import type { File } from '@/models/common/file'
import { UIButton, UIDropdownWithTooltip, UIImg, UITooltip } from '@/components/ui'
import ImageOption from './ImageOption.vue'
import { useReferenceImageUpload } from './useReferenceImageUpload'

const props = withDefaults(
  defineProps<{
    file: File | null
    disabled?: boolean
    iconOnly?: boolean
  }>(),
  {
    disabled: false,
    iconOnly: false
  }
)

const emit = defineEmits<{
  'update:file': [file: File | null]
}>()

const [fileUrl] = useFileUrl(() => props.file)
const dropdownRef = ref<InstanceType<typeof UIDropdownWithTooltip> | null>(null)

const handleUpload = useReferenceImageUpload((file) => emit('update:file', file))

function removeReferenceImage() {
  dropdownRef.value?.setVisible(false)
  emit('update:file', null)
}
</script>

<template>
  <UIDropdownWithTooltip v-if="file != null" ref="dropdownRef" class="rounded-lg" :disabled="disabled" placement="top">
    <template #trigger>
      <UIButton
        v-radar="{
          name: $t({ en: 'Reference image', zh: '参考图片' }),
          desc: 'Click to manage the local reference image'
        }"
        type="white"
        shape="square"
        :disabled="disabled"
        :aria-label="$t({ en: 'Manage reference image', zh: '管理参考图片' })"
      >
        <UIImg class="h-6 w-6 rounded-sm" :src="fileUrl" size="cover" />
      </UIButton>
    </template>
    <template #dropdown-content>
      <div class="flex flex-col gap-3 p-4">
        <div>{{ $t({ en: 'Reference image', zh: '参考图片' }) }}</div>
        <ImageOption
          :active="true"
          :interactive="false"
          :removable="true"
          :label="file.name"
          :image="fileUrl"
          @remove="removeReferenceImage"
        />
      </div>
    </template>
    <template #tooltip-content>{{ $t({ en: 'Reference image', zh: '参考图片' }) }}</template>
  </UIDropdownWithTooltip>
  <UITooltip v-else placement="top">
    <template #trigger>
      <UIButton
        v-radar="{
          name: $t({ en: 'Reference image', zh: '参考图片' }),
          desc: 'Click to upload a local reference image'
        }"
        type="white"
        :shape="iconOnly ? 'square' : 'default'"
        icon="upload"
        :class="!iconOnly && 'px-2! text-sm!'"
        :disabled="disabled"
        :aria-label="$t({ en: 'Upload reference image', zh: '上传参考图片' })"
        @click="handleUpload"
      >
        <template v-if="!iconOnly">{{ $t({ en: 'Reference image', zh: '参考图片' }) }}</template>
      </UIButton>
    </template>
    {{ $t({ en: 'Upload reference image', zh: '上传参考图片' }) }}
  </UITooltip>
</template>
