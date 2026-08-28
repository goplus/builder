<template>
  <div v-if="project == null" class="min-h-screen w-full flex flex-col overflow-y-auto bg-grey-300 text-grey-1000">
    <CommunityNavbar fluid :new-project-handler="openCreateModal" />
    <CommunityHome fluid :new-project-handler="openCreateModal" />
    <CommunityFooter />
  </div>
  <ProjectEditorDemo v-else :project="project" :new-project-handler="openCreateModal" />
  <ProjectCreateDemoModal
    :visible="createModalVisible"
    :loading="projectCreating"
    @update:visible="createModalVisible = $event"
    @created="handleProjectCreated"
  />
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue'
import { useMessage } from '@/components/ui'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'
import CommunityHome from '@/apps/xbuilder/pages/community/home.vue'
import { createDefaultProject } from '@/components/project/default-project'
import { createFileWithWebUrl } from '@/models/common/cloud'
import { Backdrop } from '@/models/spx/backdrop'
import { Costume } from '@/models/spx/costume'
import type { SpxProject, ViewportSize } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { useI18n } from '@/utils/i18n'
import ProjectCreateDemoModal from './ProjectCreateDemoModal.vue'
import ProjectEditorDemo from './ProjectEditorDemo.vue'
import demoBackdropUrl from './assets/grass.svg'
import demoSpriteUrl from './assets/squirrel-idle.svg'

const createModalVisible = ref(false)
const projectCreating = ref(false)
const project = shallowRef<SpxProject | null>(null)
const message = useMessage()
const { t } = useI18n()
const demoSpriteCount = 20

async function addDemoBackdrop(project: SpxProject) {
  const file = createFileWithWebUrl(demoBackdropUrl, 'grass.svg')
  const backdrop = await Backdrop.create('Grass', file)
  project.stage.addBackdrop(backdrop)
  project.stage.setDefaultBackdrop(backdrop.id)
}

async function addDemoSprite(project: SpxProject) {
  const file = createFileWithWebUrl(demoSpriteUrl, 'Idle.svg')
  const sprite = Sprite.create('Squirrel')
  sprite.addCostume(await Costume.create('Idle', file))
  sprite.setSize(0.08)
  project.addSprite(sprite)
  return sprite
}

async function populateDemoSprites(project: SpxProject) {
  const sourceSprite = project.sprites[0]
  if (sourceSprite == null) throw new Error('default sprite not found')

  const previewSprite = await addDemoSprite(project)
  for (let i = project.sprites.length; i < demoSpriteCount; i += 1) {
    project.addSprite(sourceSprite.clone())
  }

  project.moveSprite(project.sprites.indexOf(previewSprite), 0)
  project.sprites.forEach((sprite) => {
    sprite.setVisible(sprite === previewSprite)
  })
  previewSprite.setX(0)
  previewSprite.setY(0)
}

async function createDemoProject(name: string, gameSize: ViewportSize) {
  const createdProject = await createDefaultProject('demo', name, ['default'], gameSize)
  createdProject.setDisplayName(name)
  await addDemoBackdrop(createdProject)
  await populateDemoSprites(createdProject)
  return createdProject
}

function activateProject(createdProject: SpxProject) {
  const previousProject = project.value
  project.value = createdProject
  previousProject?.dispose()
}

async function handleProjectCreated(payload: { name: string; gameSize: ViewportSize }) {
  projectCreating.value = true
  try {
    activateProject(await createDemoProject(payload.name, payload.gameSize))
    createModalVisible.value = false
  } catch (error) {
    message.error(t({ en: 'Failed to create demo project', zh: '创建演示项目失败' }))
    throw error
  } finally {
    projectCreating.value = false
  }
}

function openCreateModal() {
  createModalVisible.value = true
}

onBeforeUnmount(() => project.value?.dispose())
</script>
