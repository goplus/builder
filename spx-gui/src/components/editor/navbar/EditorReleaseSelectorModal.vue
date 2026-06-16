<!-- Release selector: shows a list of releases and a 3-action confirmation dialog -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import dayjs from 'dayjs'
import type { ProjectRelease } from '@/apis/project-release'
import { UIButton, UIFormModal, UILoading, UIEmpty, UIError } from '@/components/ui'

export type ReleaseAction = 'diff' | 'checkout' | 'cancel'

const props = defineProps<{
  visible: boolean
  releases: ProjectRelease[]
  isLoading: boolean
  error: Error | null
  title: string
}>()

const emit = defineEmits<{
  cancelled: []
  action: [release: ProjectRelease, action: Exclude<ReleaseAction, 'cancel'>]
}>()

const selectedRelease = ref<ProjectRelease | null>(null)
const showConfirmDialog = ref(false)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      selectedRelease.value = null
      showConfirmDialog.value = false
    }
  }
)

function formatTime(iso: string) {
  return dayjs(iso).format('YYYY-MM-DD HH:mm')
}

function handleSelectRelease(release: ProjectRelease) {
  selectedRelease.value = release
  showConfirmDialog.value = true
}

function handleConfirmAction(action: Exclude<ReleaseAction, 'cancel'>) {
  const release = selectedRelease.value
  if (release == null) return
  emit('action', release, action)
}

function handleConfirmCancel() {
  showConfirmDialog.value = false
  selectedRelease.value = null
}
</script>

<template>
  <!-- Release selection step -->
  <UIFormModal
    v-if="!showConfirmDialog"
    :radar="{ name: 'Release selector modal', desc: 'Modal for selecting a historical release to checkout' }"
    :title="title"
    :visible="visible"
    :style="{ width: '560px' }"
    :mask-closable="true"
    @update:visible="emit('cancelled')"
  >
    <div class="min-h-40">
      <UILoading v-if="isLoading" class="flex h-40 items-center justify-center" />
      <UIError v-else-if="error != null" :retry="undefined">
        {{ $t({ en: 'Failed to load releases', zh: '加载版本列表失败' }) }}
      </UIError>
      <UIEmpty v-else-if="releases.length === 0" size="small">
        {{ $t({ en: 'No releases found', zh: '暂无发布版本' }) }}
      </UIEmpty>
      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="release in releases"
          :key="release.id"
          class="flex cursor-pointer items-center justify-between rounded-lg border border-grey-300 px-4 py-3 transition-colors hover:border-primary-400 hover:bg-primary-100"
          @click="handleSelectRelease(release)"
        >
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-medium text-grey-900">{{ release.name }}</span>
            <span v-if="release.description" class="line-clamp-1 text-xs text-grey-700">{{ release.description }}</span>
          </div>
          <span class="ml-4 shrink-0 text-xs text-grey-600">{{ formatTime(release.createdAt) }}</span>
        </li>
      </ul>
    </div>
  </UIFormModal>

  <!-- 3-action confirmation dialog -->
  <UIFormModal
    v-else
    :radar="{
      name: 'Release checkout confirm modal',
      desc: 'Modal for confirming checkout action after selecting a release'
    }"
    :title="$t({ en: 'Checkout release', zh: '检出版本' })"
    :visible="visible"
    :style="{ width: '480px' }"
    :mask-closable="false"
    @update:visible="emit('cancelled')"
  >
    <div class="flex flex-col gap-4">
      <p class="text-grey-900">
        {{
          $t({
            en: `You selected release "${selectedRelease?.name}". How would you like to proceed?`,
            zh: `您选择了版本"${selectedRelease?.name}"，请选择操作方式：`
          })
        }}
      </p>
      <p class="text-sm text-grey-700">
        {{
          $t({
            en: 'Checkout will replace the current project content with the selected release. Unsaved changes will be lost.',
            zh: '检出操作将使用所选版本内容替换当前项目，未保存的更改将会丢失。'
          })
        }}
      </p>
    </div>
    <div class="mt-6 flex justify-end gap-3">
      <UIButton type="neutral" @click="handleConfirmCancel">
        {{ $t({ en: 'Cancel', zh: '取消' }) }}
      </UIButton>
      <UIButton type="secondary" @click="handleConfirmAction('diff')">
        {{ $t({ en: 'Diff', zh: '查看差异' }) }}
      </UIButton>
      <UIButton type="primary" @click="handleConfirmAction('checkout')">
        {{ $t({ en: 'Checkout', zh: '检出' }) }}
      </UIButton>
    </div>
  </UIFormModal>
</template>
