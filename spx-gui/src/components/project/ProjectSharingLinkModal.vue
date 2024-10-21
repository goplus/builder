<template>
  <UIFormModal
    :title="$t({ en: 'Project sharing link', zh: '项目分享链接' })"
    :visible="props.visible"
    :auto-focus="false"
    @update:visible="emit('cancelled')"
  >
    <div class="desc">
      {{
        $t({
          en: 'A sharing link to the project has been created. Feel free to copy it below to share the project with others.',
          zh: '项目的分享链接已生成。请复制下方链接，与他人分享该项目。'
        })
      }}
    </div>
    <div class="link">
      <UITextInput :value="projectSharingLink" :readonly="true" @focus="$event.target.select()" />
      <UIButton class="copy-button" :loading="handleCopy.isLoading.value" @click="handleCopy.fn">
        {{ $t({ en: 'Copy', zh: '复制' }) }}
      </UIButton>
    </div>
  </UIFormModal>
</template>

<script setup lang="ts">
import { UIButton, UIFormModal, UITextInput } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { computed } from 'vue'
import { getProjectShareRoute } from '@/router'

const props = defineProps<{
  visible: boolean
  owner: string
  name: string
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const projectSharingLink = computed(() => {
  return `${location.origin}${getProjectShareRoute(props.owner, props.name)}`
})

const handleCopy = useMessageHandle(
  () => navigator.clipboard.writeText(projectSharingLink.value),
  { en: 'Failed to copy link to clipboard', zh: '分享链接复制到剪贴板失败' },
  { en: 'Link copied to clipboard', zh: '分享链接已复制到剪贴板' }
)
</script>

<style scoped lang="scss">
.desc {
  color: var(--ui-color-grey-900);
  margin-bottom: 8px;
}

.link {
  display: flex;
  margin-bottom: 16px;
}

.copy-button {
  margin-left: 12px;
  white-space: nowrap;
}
</style>
