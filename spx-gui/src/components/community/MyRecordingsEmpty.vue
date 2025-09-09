<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useMessageHandle } from '@/utils/exception'
import { getOwnProjectEditorRoute } from '@/router'
import { UIEmpty, UIButton } from '@/components/ui'
import newProjectIcon from '@/components/navbar/icons/new.svg'
import { useCreateProject } from '@/components/project'

const router = useRouter()
const createProject = useCreateProject()
const handleNewProject = useMessageHandle(
  async () => {
    const name = await createProject()
    router.push(getOwnProjectEditorRoute(name))
  },
  { en: 'Failed to create new recording', zh: '新建录屏失败' }
).fn
</script>

<template>
  <UIEmpty size="extra-large">
    {{
      $t({
        en: 'No recordings yet',
        zh: '没有录屏'
      })
    }}
    <template #op>
      <UIButton type="boring" size="large" @click="handleNewProject">
        <template #icon>
          <img :src="newProjectIcon" />
        </template>
        {{ $t({ en: 'New recording', zh: '新建录屏' }) }}
      </UIButton>
    </template>
  </UIEmpty>
</template>

<style lang="scss" scoped></style>
