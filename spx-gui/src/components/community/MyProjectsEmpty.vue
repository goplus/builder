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
  { en: 'Failed to create new project', zh: '新建项目失败' }
).fn
</script>

<template>
  <UIEmpty size="extra-large">
    {{
      $t({
        en: 'No projects yet',
        zh: '没有项目'
      })
    }}
    <template #op>
      <UIButton
        v-radar="{ name: 'New project button', desc: 'Click to create a new project' }"
        color="boring"
        size="large"
        @click="handleNewProject"
      >
        <template #icon>
          <img :src="newProjectIcon" />
        </template>
        {{ $t({ en: 'New project', zh: '新建项目' }) }}
      </UIButton>
    </template>
  </UIEmpty>
</template>

<style lang="scss" scoped></style>
