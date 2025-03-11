<template>
  <section class="editor-home">
    <header class="editor-header">
      <EditorNavbar :project="project" />
    </header>
    <main v-if="userInfo" class="editor-main">
      <UILoading v-if="allQueryRet.isLoading.value" />
      <UIError v-else-if="allQueryRet.error.value != null" :retry="allQueryRet.refetch">
        {{ $t(allQueryRet.error.value.userMessage) }}
      </UIError>
      <EditorContextProvider v-else :project="project!" :runtime="runtimeQueryRet.data.value!" :user-info="userInfo">
        <ProjectEditor />
      </EditorContextProvider>
      <LevelPlayer v-if="isGuidanceMode" class="level-player" :level="level" />
    </main>
  </section>
</template>

<script setup lang="ts">
import { watchEffect, watch, onMounted, onUnmounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { AutoSaveMode, Project } from '@/models/project'
import { getProjectEditorRoute } from '@/router'
import { Cancelled } from '@/utils/exception'
import { composeQuery, useQuery } from '@/utils/query'
import { getStringParam } from '@/utils/route'
import { clear } from '@/models/common/local'
import { Runtime } from '@/models/runtime'
import { UILoading, UIError, useConfirmDialog, useMessage } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { untilNotNull, usePageTitle } from '@/utils/utils'
import EditorNavbar from '@/components/editor/navbar/EditorNavbar.vue'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import ProjectEditor from '@/components/editor/ProjectEditor.vue'
import { useProvideCodeEditorCtx } from '@/components/editor/code-editor/context'
import { usePublishProject } from '@/components/project'
import { ListFilter } from '@/models/list-filter'
import LevelPlayer from '@/components/guidance/LevelPlayer.vue'
import { type Level } from '@/apis/guidance'

const props = defineProps<{
  projectName: string
}>()

const isGuidanceMode = ref<boolean>(false)
const level: Level = {
  cover: 'http://ssbvnda4w.hn-bkt.clouddn.com/qny/img/green.png',
  placement: {
    x: 30,
    y: 50
  },
  title: {
    zh: '创建精灵和背景.',
    en: 'Create a sprite and a background.'
  },
  description: {
    zh: '创建精灵和背景，让你的项目栩栩如生。精灵可以是一个角色或物体，背景则为场景设定基调。你可以通过颜色、图片或动画对它们进行自定义，让你的作品独一无二。',
    en: 'Create sprites and backgrounds to bring your project to life. The Sprite can be a character or object, and the background sets the tone for the scene. You can customize them with colors, pictures, or animations to make your creations unique.'
  },
  video: 'http://ssbvnda4w.hn-bkt.clouddn.com/qny/video/spirit%26backdrop.mkv',
  achievement: {
    icon: 'http://ssbvnda4w.hn-bkt.clouddn.com/qny/img/primacy.png',
    title: {
      zh: '初级',
      en: 'primary'
    }
  },
  nodeTasks: [
    {
      name: {
        zh: '创建精灵',
        en: 'Create Sprite'
      },
      triggerTime: 5,
      video: '',
      steps: [
        {
          title: {
            zh: '点击素材库',
            en: 'click asset library'
          },
          description: {
            zh: '素材库里会存在由系统提供的丰富素材，点击素材库，选择你所喜欢的素材！',
            en: 'The asset library contains a rich collection of resources provided by the system. Click on the asset library and choose your favorite ones!'
          },
          tip: {
            zh: '请点击此处，打开素材库',
            en: 'Please click here to open the asset library.'
          },
          duration: 20,
          target: [
            // TODO
            '',
            ''
          ],
          type: 'following',
          isCheck: false,
          isApiControl: false,
          isAssetControl: false,
          isSpriteControl: false,
          isSoundControl: false,
          isCostumeControl: false,
          isAnimationControl: false,
          isWidgetControl: false,
          isBackdropControl: false,
          apis: [],
          assets: [],
          sprites: [],
          sounds: [],
          costumes: [],
          animations: [],
          widgets: [],
          backdrops: [],
          snapshot: {
            startSnapshot:
              '{"assets/backdrop.png": "kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264","assets/index.json": "data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%5D%2C%22builder_spriteOrder%22%3A%5B%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D","main.spx": "data:;,"}',
            endSnapshot: ''
          }
        },
        {
          title: {
            zh: '选择精灵1',
            en: 'Select Sprite 1'
          },
          description: {
            zh: '在素材库中通过点击鼠标左键选择精灵！',
            en: 'Select the sprite by clicking the left mouse button in the asset library!'
          },
          tip: {
            zh: '请用鼠标左键点击此处，选择精灵1',
            en: 'Please click here with the left mouse button to select Sprite 1.'
          },
          duration: 20,
          target: [
            // TODO
            '',
            ''
          ],
          type: 'following',
          isCheck: false,
          isApiControl: false,
          isAssetControl: true,
          isSpriteControl: false,
          isSoundControl: false,
          isCostumeControl: false,
          isAnimationControl: false,
          isWidgetControl: false,
          isBackdropControl: false,
          apis: [],
          assets: ['11122', '10885'],
          sprites: [],
          sounds: [],
          costumes: [],
          animations: [],
          widgets: [],
          backdrops: [],
          snapshot: {
            startSnapshot:
              '{"assets/backdrop.png": "kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264","assets/index.json": "data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%5D%2C%22builder_spriteOrder%22%3A%5B%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D","main.spx": "data:;,"}',
            endSnapshot: ''
          }
        },
        {
          title: {
            zh: '选择精灵2',
            en: 'Select Sprite 2'
          },
          description: {
            zh: '素材库中可以一次性勾选多个精灵。勾选你的第二个精灵。',
            en: 'In the material library, you can select multiple sprites at once. Check your second sprite.'
          },
          tip: {
            zh: '素材库中可以一次性勾选多个精灵！点击此处，选择你的第二个精灵吧！',
            en: 'You can select multiple sprites at once in the asset library! Click here to choose your second sprite!'
          },
          duration: 20,
          target: [
            // TODO
            '',
            ''
          ],
          type: 'following',
          isCheck: false,
          isApiControl: false,
          isAssetControl: true,
          isSpriteControl: false,
          isSoundControl: false,
          isCostumeControl: false,
          isAnimationControl: false,
          isWidgetControl: false,
          isBackdropControl: false,
          apis: [],
          assets: ['11122', '10885'],
          sprites: [],
          sounds: [],
          costumes: [],
          animations: [],
          widgets: [],
          backdrops: [],
          snapshot: {
            startSnapshot:
              '{"assets/backdrop.png": "kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264","assets/index.json": "data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%5D%2C%22builder_spriteOrder%22%3A%5B%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D","main.spx": "data:;,"}',
            endSnapshot: ''
          }
        },
        {
          title: {
            zh: '点击确定按钮',
            en: 'Click OK button'
          },
          description: {
            zh: '点击确定按钮',
            en: 'Click OK button'
          },
          tip: {
            zh: '请点击此处确定按钮',
            en: 'Click OK button'
          },
          duration: 20,
          target: [
            // TODO
            '',
            ''
          ],
          type: 'following',
          isCheck: true,
          isApiControl: false,
          isAssetControl: true,
          isSpriteControl: false,
          isSoundControl: false,
          isCostumeControl: false,
          isAnimationControl: false,
          isWidgetControl: false,
          isBackdropControl: false,
          apis: [],
          assets: ['11122', '10885'],
          sprites: [],
          sounds: [],
          costumes: [],
          animations: [],
          widgets: [],
          backdrops: [],
          snapshot: {
            startSnapshot:
              '{"assets/backdrop.png": "kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264","assets/index.json": "data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%5D%2C%22builder_spriteOrder%22%3A%5B%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D","main.spx": "data:;,"}',
            endSnapshot:
              '{"assets/index.json": "data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D","main.spx": "data:;,","assets/backdrop.png": "kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264","assets/sprites/WizardBlue/cover.svg": "kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856","assets/sprites/WizardBlue/__animation_death__animation_death_0.svg": "kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562","assets/sprites/WizardBlue/__animation_death__animation_death_1.svg": "kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028","assets/sprites/WizardBlue/__animation_death__animation_death_2.svg": "kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838","assets/sprites/WizardBlue/__animation_death__animation_death_3.svg": "kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305","assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg": "kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856","assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg": "kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981","assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg": "kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676","assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg": "kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130","assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg": "kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441","assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg": "kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682","assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg": "kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305","WizardBlue.spx": "data:;,","assets/sprites/WizardBlue/index.json": "data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.7003891050583657%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D","assets/sprites/Convertible/convertible.svg": "kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038","Convertible.spx": "data:;,","assets/sprites/Convertible/index.json": "data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.15748031496062992%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D"}'
          }
        }
      ]
    }
  ]
}
usePageTitle(() => ({
  en: `Edit ${props.projectName}`,
  zh: `编辑 ${props.projectName}`
}))

const LOCAL_CACHE_KEY = 'GOPLUS_BUILDER_CACHED_PROJECT'

const userStore = useUserStore()
const userInfo = computed(() => userStore.getSignedInUser())

const router = useRouter()

const withConfirm = useConfirmDialog()
const { t } = useI18n()
const { isOnline } = useNetwork()
const m = useMessage()

const askToOpenTargetWithAnotherInCache = (targetName: string, cachedName: string): Promise<boolean> => {
  return new Promise((resolve) =>
    withConfirm({
      title: t({
        en: `Open project ${targetName}?`,
        zh: `打开项目 ${targetName}？`
      }),
      content: t({
        en: `There are unsaved changes for project ${cachedName}. The changes will be discarded if you continue to open project ${targetName}. Are you sure to continue?`,
        zh: `项目 ${cachedName} 存在未保存的变更，若继续打开项目 ${targetName}，项目 ${cachedName} 的变更将被丢弃。确定继续吗？`
      }),
      cancelText: t({
        en: `Open project ${cachedName}`,
        zh: `打开项目 ${cachedName}`
      })
    })
      .then(() => {
        resolve(true)
      })
      .catch(() => {
        resolve(false)
      })
  )
}

const projectQueryRet = useQuery(
  async (ctx) => {
    if (userInfo.value == null) throw new Error('User not signed in') // This should not happen as the route is protected
    // We need to read `userInfo.value?.name` & `projectName.value` synchronously,
    // so their change will drive `useQuery` to re-fetch
    const project = await loadProject(userInfo.value.name, props.projectName, ctx.signal)
    ;(window as any).project = project // for debug purpose, TODO: remove me
    return project
  },
  { en: 'Failed to load project', zh: '加载项目失败' }
)

const project = projectQueryRet.data

const runtimeQueryRet = useQuery(async (ctx) => {
  const project = await composeQuery(ctx, projectQueryRet)
  ctx.signal.throwIfAborted()
  const runtime = new Runtime(project)
  runtime.disposeOnSignal(ctx.signal)
  return runtime
})

const filterQueryRet = useQuery(() => Promise.resolve(new ListFilter()))

const codeEditorQueryRet = useProvideCodeEditorCtx(projectQueryRet, runtimeQueryRet, filterQueryRet)

const allQueryRet = useQuery(
  (ctx) =>
    Promise.all([
      composeQuery(ctx, projectQueryRet),
      composeQuery(ctx, runtimeQueryRet),
      composeQuery(ctx, codeEditorQueryRet)
    ]),
  { en: 'Failed to load editor', zh: '加载编辑器失败' }
)

// `?publish`
if (getStringParam(router, 'publish') != null) {
  const publishProject = usePublishProject()
  onMounted(async () => {
    const p = await untilNotNull(project)
    publishProject(p)
  })
}

async function loadProject(user: string, projectName: string, signal: AbortSignal) {
  let localProject: Project | null
  try {
    localProject = new Project()
    localProject.disposeOnSignal(signal)
    await localProject.loadFromLocalCache(LOCAL_CACHE_KEY)
  } catch (e) {
    console.warn('Failed to load project from local cache', e)
    localProject = null
    await clear(LOCAL_CACHE_KEY)
  }
  signal.throwIfAborted()

  // https://github.com/goplus/builder/issues/259
  // https://github.com/goplus/builder/issues/393
  // Local Cache Saving & Restoring
  if (localProject != null && localProject.owner !== user) {
    // Case 4: Different user: Discard local cache
    await clear(LOCAL_CACHE_KEY)
    localProject = null
  }

  if (localProject != null && localProject.name !== projectName && localProject.hasUnsyncedChanges) {
    const stillOpenTarget = await askToOpenTargetWithAnotherInCache(projectName, localProject.name!)
    signal.throwIfAborted()
    if (stillOpenTarget) {
      await clear(LOCAL_CACHE_KEY)
      localProject = null
    } else {
      openProject(localProject.name!)
      throw new Cancelled('Open another project')
    }
  }

  let newProject = new Project()
  newProject.disposeOnSignal(signal)
  await newProject.loadFromCloud(user, projectName)
  signal.throwIfAborted()

  // If there is no newer cloud version, use local version without confirmation.
  // If there is a newer cloud version, use cloud version without confirmation.
  // (clear local cache if cloud version is newer)
  if (localProject?.hasUnsyncedChanges) {
    if (newProject.version <= localProject.version) {
      newProject = localProject
    } else {
      await clear(LOCAL_CACHE_KEY)
    }
  }

  setProjectAutoSaveMode(newProject)
  await newProject.startEditing(LOCAL_CACHE_KEY)
  signal.throwIfAborted()
  return newProject
}

// watch for online <-> offline switches, and set autoSaveMode accordingly
function setProjectAutoSaveMode(project: Project | null) {
  project?.setAutoSaveMode(isOnline.value ? AutoSaveMode.Cloud : AutoSaveMode.LocalCache)
}
watch(isOnline, () => setProjectAutoSaveMode(project.value))

watchEffect((onCleanup) => {
  const cleanup = router.beforeEach(async () => {
    if (!project.value?.hasUnsyncedChanges) return true
    try {
      await withConfirm({
        title: t({
          en: 'Save changes',
          zh: '保存变更'
        }),
        content: t({
          en: 'There are changes not saved yet. You must save them to the cloud before leaving.',
          zh: '存在未保存的变更，你必须先保存到云端才能离开。'
        }),
        confirmText: t({
          en: 'Save',
          zh: '保存'
        }),
        async confirmHandler() {
          try {
            if (project.value?.hasUnsyncedChanges) await project.value!.saveToCloud()
            await clear(LOCAL_CACHE_KEY)
          } catch (e) {
            m.error(t({ en: 'Failed to save changes', zh: '保存变更失败' }))
            throw e
          }
        },
        autoConfirm: true
      })
      return true
    } catch {
      return false
    }
  })

  onCleanup(cleanup)
})

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (project.value?.hasUnsyncedChanges) {
    event.preventDefault()
  }
}

onMounted(() => {
  if ('guide' in router.currentRoute.value.query) {
    isGuidanceMode.value = true
  }
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

function openProject(projectName: string) {
  router.push(getProjectEditorRoute(projectName))
}
</script>

<style scoped lang="scss">
.editor-home {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  background-color: #e9fcff; // TODO: define as UI vars
}

.editor-header {
  flex: 0 0 auto;
}

.editor-main {
  flex: 1 1 0;
  display: flex;
  gap: var(--ui-gap-middle);
  padding: 16px;
}

.level-player {
  z-index: 10;
}
</style>
