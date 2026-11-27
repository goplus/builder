<template>
  <UIMenuItem @click="handleExportProjectFile">
    <template #icon><img :src="exportProjectSvg" /></template>
    {{ $t({ en: 'Export project file', zh: '导出项目文件' }) }}
  </UIMenuItem>
</template>

<script setup lang="ts">
import saveAs from 'file-saver'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { xbpHelpers } from '@/models/common/xbp'
import type { SpxProject } from '@/models/spx/project'
import { UIMenuItem, useMessage } from '@/components/ui'
import exportProjectSvg from './icons/export-project.svg'

const props = defineProps<{ project: SpxProject | null }>()
const i18n = useI18n()
const m = useMessage()

const handleExportProjectFile = useMessageHandle(
  async () => {
    const project = props.project
    if (project == null) throw new Error('No project to export')
    const signal = project.getSignal()
    const xbpFile = await m.withLoading(
      project.export(signal).then((serialized) => xbpHelpers.save(serialized, signal)),
      i18n.t({ en: 'Exporting project file', zh: '导出项目文件中' })
    )
    saveAs(xbpFile, xbpFile.name) // TODO: what if user cancelled download?
  },
  { en: 'Failed to export project file', zh: '导出项目文件失败' }
).fn
</script>
