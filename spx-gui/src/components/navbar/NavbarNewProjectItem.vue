<template>
  <UIMenuItem @click="handleNewProject">
    <template #icon><img :src="newSvg" /></template>
    {{ $t({ en: 'New project...', zh: '新建项目...' }) }}
  </UIMenuItem>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { getOwnProjectEditorRoute } from '@/router'
import { UIMenuItem } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useCreateProject } from '@/components/project'
import newSvg from './icons/new.svg'
import { useEnsureSignedIn } from '@/utils/user'

const router = useRouter()
const ensureSignedIn = useEnsureSignedIn()
const createProject = useCreateProject()
const handleNewProject = useMessageHandle(
  async () => {
    await ensureSignedIn()
    const name = await createProject()
    router.push(getOwnProjectEditorRoute(name))
  },
  { en: 'Failed to create new project', zh: '新建项目失败' }
).fn
</script>
