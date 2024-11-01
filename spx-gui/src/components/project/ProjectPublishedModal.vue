<script setup lang="ts">
import { computed } from 'vue'
import { UIButton, UIFormModal, UITextInput, UILink } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { getProjectPageRoute } from '@/router'
import { Project } from '@/models/project'

const props = defineProps<{
  visible: boolean
  project: Project
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const projectPageRoute = computed(() => getProjectPageRoute(props.project.owner!, props.project.name!))
const projectPageLink = computed(() => `${location.origin}${projectPageRoute.value}`)

const handleCopy = useMessageHandle(
  () => navigator.clipboard.writeText(projectPageLink.value),
  { en: 'Failed to copy link to clipboard', zh: '分享链接复制到剪贴板失败' },
  { en: 'Link copied to clipboard', zh: '分享链接已复制到剪贴板' }
).fn
</script>

<template>
  <UIFormModal
    :title="$t({ en: `Project ${project.name} published`, zh: `项目 ${project.name} 发布成功` })"
    :visible="props.visible"
    :auto-focus="false"
    @update:visible="emit('cancelled')"
  >
    <div class="desc">
      <I18nT>
        <template #en>
          Visit <UILink target="_blank" :href="projectPageRoute">project page</UILink>, or copy the link below to share
          the project with others.
        </template>
        <template #zh>
          访问<UILink target="_blank" :href="projectPageRoute">项目主页</UILink>，或者复制下方链接将项目分享给其他人。
        </template>
      </I18nT>
    </div>
    <div class="link-wrapper">
      <UITextInput :value="projectPageLink" :readonly="true" @focus="$event.target.select()" />
      <UIButton class="copy-button" @click="handleCopy">
        {{ $t({ en: 'Copy link', zh: '复制链接' }) }}
      </UIButton>
    </div>
  </UIFormModal>
</template>

<style scoped lang="scss">
.desc {
  color: var(--ui-color-grey-900);
  margin-bottom: 8px;
}

.link-wrapper {
  display: flex;
  margin-bottom: 16px;
}

.copy-button {
  margin-left: 12px;
  white-space: nowrap;
}
</style>
