<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

import { getProject } from '@/apis/project'
import PrototypeProjectRunner from '@/components/project/PrototypeProjectRunner.vue'
import controlIcon from '@/assets/editor/category-icons/control.svg'
import eventIcon from '@/assets/editor/category-icons/event.svg'
import gameIcon from '@/assets/editor/category-icons/game.svg'
import lookIcon from '@/assets/editor/category-icons/look.svg'
import motionIcon from '@/assets/editor/category-icons/motion.svg'
import sensingIcon from '@/assets/editor/category-icons/sensing.svg'
import soundIcon from '@/assets/editor/category-icons/sound.svg'
import backdropPanelIcon from '@/assets/editor/stage-panel/backdrop.svg?raw'
import soundPanelIcon from '@/assets/editor/stage-panel/sound.svg?raw'
import widgetPanelIcon from '@/assets/editor/stage-panel/widget.svg?raw'
import layerQuickIcon from '@/assets/editor/quick-config/layer.svg?raw'
import positionQuickIcon from '@/assets/editor/quick-config/position.svg?raw'
import resizeQuickIcon from '@/assets/editor/quick-config/resize.svg?raw'
import rotateQuickIcon from '@/assets/editor/quick-config/rotate.svg?raw'
import defaultModeIcon from '@/assets/editor/navbar-icons/default-mode.svg?raw'
import mapEditModeIcon from '@/assets/editor/navbar-icons/map-edit-mode.svg?raw'
import cloudCheckIcon from '@/assets/editor/navbar-icons/cloud-check.svg?raw'
import failedToSaveIcon from '@/assets/editor/navbar-icons/failed-to-save.svg?raw'
import offlineIcon from '@/assets/editor/navbar-icons/offline.svg?raw'
import savingIcon from '@/assets/editor/navbar-icons/saving.svg?raw'
import backdropUrl from '@/assets/projects/niu-run/editor/backdrop.png'
import flowerUrl from '@/assets/projects/niu-run/editor/sprite-flower.png'
import niuXiaoHuaUrl from '@/assets/projects/niu-run/editor/sprite-niu-xiao-hua.png'
import niuXiaoQiUrl from '@/assets/projects/niu-run/editor/sprite-niu-xiao-qi.png'
import tornadoUrl from '@/assets/projects/niu-run/editor/sprite-tornado.svg'

const props = defineProps<{
  ownerNameInput: string
  projectNameInput: string
}>()

type SpriteCard = {
  id: string
  name: string
  shortName: string
  image: string
  hidden?: boolean
  active?: boolean
}

type SnippetPart = {
  text: string
  type?: 'function' | 'hint' | 'string' | 'custom' | 'operator'
}

type EventSnippet = {
  id: string
  parts: SnippetPart[]
}

type EditorTab = 'code' | 'costumes' | 'animations'
type EditMode = 'default' | 'map'
type SaveState = 'saved' | 'saving' | 'failed' | 'offline'

type AssetItem = {
  id: string
  name: string
  image: string
  frames?: string[]
  duration?: string
  binding?: string
  sound?: string
  active?: boolean
}

const project = computed(() => getProject(props.ownerNameInput, props.projectNameInput))
const runnerRef = ref<InstanceType<typeof PrototypeProjectRunner>>()
const runnerActive = ref(false)
const activeEditorTab = ref<EditorTab>('code')
const activeEditMode = ref<EditMode>('default')
const projectDisplayName = ref(project.value.title)
const draftProjectDisplayName = ref(project.value.title)
const projectNameEditing = ref(false)
const saveState = ref<SaveState>('saved')
const selectedCostumeId = ref('niu-xiao-qi-default')
const selectedAnimationId = ref('niu-run')
const selectedMapSpriteId = ref('niu-xiao-qi')
const projectNameInputRef = ref<HTMLInputElement>()

function snippet(id: string, parts: SnippetPart[]): EventSnippet {
  return { id, parts }
}

const eventGroups = [
  {
    title: 'Game Events',
    items: [snippet('onStart', [{ text: 'onStart', type: 'function' }, { text: ' => {}', type: 'operator' }])]
  },
  {
    title: 'Sensing Events',
    items: [
      snippet('onClick', [{ text: 'onClick', type: 'function' }, { text: ' => {}', type: 'operator' }]),
      snippet('onKey', [
        { text: 'onKey', type: 'function' },
        { text: ' key:', type: 'hint' },
        { text: 'KeyA', type: 'custom' },
        { text: ', => {}', type: 'operator' }
      ]),
      snippet('onSwipe', [
        { text: 'onSwipe', type: 'function' },
        { text: ' direction:', type: 'hint' },
        { text: 'left', type: 'custom' },
        { text: ',...', type: 'operator' }
      ]),
      snippet('onTouchStart-name', [
        { text: 'onTouchStart', type: 'function' },
        { text: ' name:', type: 'hint' },
        { text: '"牛小...', type: 'string' }
      ]),
      snippet('onTouchStart-names', [
        { text: 'onTouchStart', type: 'function' },
        { text: ' names:', type: 'hint' },
        { text: '["牛...', type: 'string' }
      ])
    ]
  },
  {
    title: 'Message Events',
    items: [
      snippet('broadcast', [
        { text: 'broadcast', type: 'function' },
        { text: ' msg:', type: 'hint' },
        { text: '"ping"', type: 'string' }
      ]),
      snippet('broadcastAndWait', [
        { text: 'broadcastAndWait', type: 'function' },
        { text: ' msg:', type: 'hint' },
        { text: '"p...', type: 'string' }
      ]),
      snippet('onMsg', [
        { text: 'onMsg', type: 'function' },
        { text: ' msg:', type: 'hint' },
        { text: '"ping"', type: 'string' },
        { text: ', => {}', type: 'operator' }
      ])
    ]
  },
  {
    title: 'Sprite Events',
    items: [
      snippet('onCloned', [
        { text: 'onCloned', type: 'function' },
        { text: ' data', type: 'custom' },
        { text: ' => {}', type: 'operator' }
      ])
    ]
  },
  {
    title: 'Stage Events',
    items: [
      snippet('onBackdrop', [
        { text: 'onBackdrop', type: 'function' },
        { text: ' name:', type: 'hint' },
        { text: '"backdr...', type: 'string' }
      ])
    ]
  },
  {
    title: 'Visibility',
    items: [
      snippet('visible', [{ text: 'visible', type: 'function' }]),
      snippet('show', [{ text: 'show', type: 'function' }])
    ]
  }
]

const sprites: SpriteCard[] = [
  {
    id: 'niu-xiao-qi',
    name: '牛小七',
    shortName: '牛小七',
    image: niuXiaoQiUrl,
    active: true
  },
  {
    id: 'niu-xiao-hua',
    name: '牛小花牛小花牛小花牛小花牛小花牛小花',
    shortName: '牛小花牛小花...',
    image: niuXiaoHuaUrl
  },
  {
    id: 'flower',
    name: '花朵花朵花朵花朵花朵花朵花朵花朵花朵',
    shortName: '花朵花...',
    image: flowerUrl,
    hidden: true
  },
  {
    id: 'tornado',
    name: '龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风',
    shortName: '龙卷风...',
    image: tornadoUrl,
    hidden: true
  }
]

const costumes: AssetItem[] = [
  {
    id: 'niu-xiao-qi-default',
    name: '牛小七',
    image: niuXiaoQiUrl
  }
]

const animations: AssetItem[] = [
  {
    id: 'niu-run',
    name: '跑步',
    image: niuXiaoQiUrl,
    frames: [niuXiaoQiUrl, niuXiaoHuaUrl, niuXiaoQiUrl, niuXiaoHuaUrl],
    duration: '0.8s',
    binding: '1',
    sound: 'None'
  }
]

const selectedCostume = computed(() => costumes.find((costume) => costume.id === selectedCostumeId.value) ?? costumes[0])
const selectedAnimation = computed(
  () => animations.find((animation) => animation.id === selectedAnimationId.value) ?? animations[0] ?? null
)

const codeLines = [
  ['onMsg', 'msg:"click", => {'],
  ['  turnTo', 'target:Mouse'],
  ['  stepTo', 'obj:Mouse'],
  ['}', ''],
  ['', ''],
  ['onTouchStart', 'sprite:"牛小花牛小花牛小花牛小花牛小花牛小花", sprite => {'],
  ['  stopped', '= true'],
  ['}', ''],
  ['onKey', 'key:KeyA, => {'],
  ['', ''],
  ['}', ''],
  ['onClick', '=> {'],
  ['', ''],
  ['}', '']
]

const codeCategories = [
  { id: 'event', label: 'Event', icon: eventIcon, active: true },
  { id: 'look', label: 'Look', icon: lookIcon },
  { id: 'motion', label: 'Motion', icon: motionIcon },
  { id: 'control', label: 'Control', icon: controlIcon },
  { id: 'sensing', label: 'Sensing', icon: sensingIcon },
  { id: 'sound', label: 'Sound', icon: soundIcon },
  { id: 'game', label: 'Game', icon: gameIcon }
]

const stageEntries = [
  { id: 'backdrops', label: 'Backdrops', icon: backdropPanelIcon },
  { id: 'sounds', label: 'Sounds', icon: soundPanelIcon },
  { id: 'widgets', label: 'Widgets', icon: widgetPanelIcon }
]

const quickConfigTools = [
  { id: 'position', label: 'Position', icon: positionQuickIcon },
  { id: 'rotation', label: 'Rotation', icon: rotateQuickIcon },
  { id: 'size', label: 'Size', icon: resizeQuickIcon },
  { id: 'layer', label: 'Layer order', icon: layerQuickIcon }
]

const selectedMapSprite = computed(() => sprites.find((sprite) => sprite.id === selectedMapSpriteId.value) ?? sprites[0])
const saveStateMeta = computed(() => {
  switch (saveState.value) {
    case 'saving':
      return { icon: savingIcon, label: 'Saving', className: 'saving' }
    case 'failed':
      return { icon: failedToSaveIcon, label: 'Failed to save', className: 'failed' }
    case 'offline':
      return { icon: offlineIcon, label: 'No internet connection', className: 'offline' }
    case 'saved':
    default:
      return { icon: cloudCheckIcon, label: 'Saved', className: 'saved' }
  }
})

function selectEditorTab(tab: EditorTab) {
  activeEditorTab.value = tab
}

function selectEditMode(mode: EditMode) {
  activeEditMode.value = mode
}

async function startProjectNameEdit() {
  draftProjectDisplayName.value = projectDisplayName.value
  projectNameEditing.value = true
  await nextTick()
  projectNameInputRef.value?.focus()
  projectNameInputRef.value?.select()
}

function cancelProjectNameEdit() {
  draftProjectDisplayName.value = projectDisplayName.value
  projectNameEditing.value = false
}

function submitProjectNameEdit() {
  if (!projectNameEditing.value) return
  const nextName = draftProjectDisplayName.value.trim()
  if (nextName === '' || nextName === projectDisplayName.value) {
    cancelProjectNameEdit()
    return
  }
  projectDisplayName.value = nextName
  projectNameEditing.value = false
  saveState.value = 'saving'
  window.setTimeout(() => {
    saveState.value = 'saved'
  }, 650)
}

async function runProject() {
  runnerActive.value = true
  await nextTick()
  await runnerRef.value?.run()
}

onMounted(() => {
  document.title = `Edit ${project.value.title} - XBuilder`
})
</script>

<template>
  <main class="prototype-editor min-w-360 bg-[#f1f5f7] text-grey-1000">
    <header class="editor-navbar">
      <div class="navbar-left">
        <RouterLink class="brand" to="/" aria-label="XBuilder home">
          <img src="@/assets/navbar-logo.svg" alt="XBuilder" />
        </RouterLink>
        <div class="navbar-divider"></div>
        <button class="icon-button" type="button" aria-label="Project menu">
          <svg class="file-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M6.6084 1.77051C7.00493 1.77063 7.39605 1.8695 7.74512 2.05762C8.09163 2.24443 8.38686 2.51387 8.60449 2.8418L9.2793 3.8418L9.28418 3.84961C9.37032 3.98023 9.4879 4.08753 9.62598 4.16113C9.76424 4.23474 9.91955 4.27199 10.0762 4.27051H16.667C17.3023 4.27059 17.9121 4.52343 18.3613 4.97266C18.8104 5.42193 19.0625 6.03173 19.0625 6.66699V15C19.0625 15.6353 18.8105 16.245 18.3613 16.6943C17.9121 17.1436 17.3023 17.3954 16.667 17.3955H3.33301C2.69771 17.3954 2.0879 17.1436 1.63867 16.6943C1.18947 16.245 0.9375 15.6353 0.9375 15V4.16699C0.9375 3.53173 1.18957 2.92193 1.63867 2.47266C2.0879 2.02343 2.69771 1.77059 3.33301 1.77051H6.6084ZM2.39551 15C2.39551 15.2486 2.49421 15.4873 2.66992 15.6631C2.84566 15.8388 3.08448 15.9374 3.33301 15.9375H16.667C16.9155 15.9374 17.1543 15.8388 17.3301 15.6631C17.5058 15.4873 17.6045 15.2486 17.6045 15V9.0625H2.39551V15ZM3.33301 3.22949C3.08456 3.22958 2.84565 3.32729 2.66992 3.50293C2.49411 3.67875 2.39551 3.91835 2.39551 4.16699V7.60449H17.6045V6.66699C17.6045 6.41835 17.5059 6.17875 17.3301 6.00293C17.1544 5.82729 16.9154 5.72958 16.667 5.72949H10.083C9.68507 5.73215 9.29276 5.63524 8.94141 5.44824C8.59002 5.26111 8.29029 4.98894 8.07031 4.65723L7.39551 3.6582L7.39062 3.65039C7.30537 3.52117 7.18899 3.4153 7.05273 3.3418C6.91626 3.2683 6.7634 3.22957 6.6084 3.22949H3.33301Z"
            />
          </svg>
          <span class="caret"></span>
        </button>
        <button class="icon-button muted" type="button" aria-label="Undo">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 7 4 12l5 5" />
            <path d="M5 12h9a5 5 0 0 1 5 5" />
          </svg>
        </button>
        <button class="icon-button muted" type="button" aria-label="Redo">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 7 5 5-5 5" />
            <path d="M19 12h-9a5 5 0 0 0-5 5" />
          </svg>
        </button>
      </div>

      <div class="navbar-title">
        <button
          v-if="!projectNameEditing"
          class="project-name-trigger"
          type="button"
          aria-label="Edit project display name"
          @click="startProjectNameEdit"
        >
          <span>{{ projectDisplayName }}</span>
          <span class="project-name-edit-icon">✎</span>
        </button>
        <form v-else class="project-name-form" @submit.prevent="submitProjectNameEdit">
          <input
            ref="projectNameInputRef"
            v-model="draftProjectDisplayName"
            aria-label="Project display name"
            @blur="submitProjectNameEdit"
            @keydown.esc.prevent="cancelProjectNameEdit"
          />
        </form>
        <button
          class="auto-save-state"
          :class="saveStateMeta.className"
          type="button"
          :aria-label="saveStateMeta.label"
          :title="saveStateMeta.label"
          @click="saveState = saveState === 'offline' ? 'saved' : 'offline'"
        >
          <span v-html="saveStateMeta.icon"></span>
        </button>
      </div>

      <div class="navbar-right">
        <button
          class="mode-button"
          :class="{ active: activeEditMode === 'default' }"
          type="button"
          aria-label="Default mode"
          @click="selectEditMode('default')"
        >
          <span v-html="defaultModeIcon"></span>
        </button>
        <button
          class="mode-button"
          :class="{ active: activeEditMode === 'map' }"
          type="button"
          aria-label="Map edit mode"
          @click="selectEditMode('map')"
        >
          <span v-html="mapEditModeIcon"></span>
        </button>
        <img class="profile" src="@ui-images/avatar.png" alt="" />
      </div>
    </header>

    <section v-if="activeEditMode === 'default'" class="editor-main">
      <section class="code-card">
        <header class="code-tabs">
          <button class="tab" :class="{ active: activeEditorTab === 'code' }" type="button" @click="selectEditorTab('code')">
            Code
          </button>
          <button class="tab" :class="{ active: activeEditorTab === 'costumes' }" type="button" @click="selectEditorTab('costumes')">
            Costumes
          </button>
          <button
            class="tab"
            :class="{ active: activeEditorTab === 'animations' }"
            type="button"
            @click="selectEditorTab('animations')"
          >
            Animations
          </button>
          <button v-if="activeEditorTab === 'code'" class="format-button" type="button">Format</button>
        </header>

        <div v-if="activeEditorTab === 'code'" class="code-body">
          <aside class="category-rail" aria-label="Code categories">
            <button
              v-for="category in codeCategories"
              :key="category.id"
              class="category"
              :class="{ active: category.active }"
              type="button"
            >
              <img class="category-icon" :src="category.icon" alt="" />
              <span>{{ category.label }}</span>
            </button>
          </aside>

          <aside class="events-list" aria-label="Event snippets">
            <section v-for="group in eventGroups" :key="group.title" class="event-group">
              <h3>{{ group.title }}</h3>
              <button v-for="item in group.items" :key="item.id" class="event-snippet" type="button">
                <span v-for="(part, index) in item.parts" :key="`${item.id}-${index}`" :class="part.type && `token-${part.type}`">
                  {{ part.text }}
                </span>
              </button>
            </section>
          </aside>

          <section class="code-editor" aria-label="Sprite code editor">
            <div v-for="(line, index) in codeLines" :key="index" class="code-line">
              <span class="line-number">{{ index + 1 }}</span>
              <span class="keyword">{{ line[0] }}</span>
              <span class="source">{{ line[1] }}</span>
            </div>
            <div class="zoom-tools">
              <button type="button" aria-label="Zoom in">⌕</button>
              <button type="button" aria-label="Zoom out">⌔</button>
              <button type="button" aria-label="Reset zoom">⊜</button>
            </div>
          </section>
        </div>

        <div v-else-if="activeEditorTab === 'costumes'" class="asset-editor-body">
          <aside class="asset-editor-list" aria-label="Costumes list">
            <button
              v-for="costume in costumes"
              :key="costume.id"
              class="editor-asset-item"
              :class="{ active: selectedCostumeId === costume.id }"
              type="button"
              @click="selectedCostumeId = costume.id"
            >
              <img :src="costume.image" :alt="costume.name" />
              <span>{{ costume.name }}</span>
            </button>
            <button class="asset-add-button" type="button" aria-label="Add costume">+</button>
          </aside>
          <section class="asset-detail" aria-label="Costume detail">
            <header class="asset-detail-header">
              <h2>{{ selectedCostume.name }}</h2>
              <button type="button" aria-label="Rename costume">✎</button>
            </header>
            <div class="costume-preview">
              <img :src="selectedCostume.image" :alt="selectedCostume.name" />
            </div>
          </section>
        </div>

        <div v-else class="asset-editor-body">
          <aside class="asset-editor-list" aria-label="Animations list">
            <button
              v-for="animation in animations"
              :key="animation.id"
              class="editor-asset-item"
              :class="{ active: selectedAnimationId === animation.id }"
              type="button"
              @click="selectedAnimationId = animation.id"
            >
              <img :src="animation.image" :alt="animation.name" />
              <span>{{ animation.name }}</span>
            </button>
            <button class="asset-add-button" type="button" aria-label="Add animation">+</button>
          </aside>
          <section v-if="selectedAnimation != null" class="asset-detail" aria-label="Animation detail">
            <header class="asset-detail-header">
              <h2>{{ selectedAnimation.name }}</h2>
              <button type="button" aria-label="Rename animation">✎</button>
            </header>
            <div class="animation-detail-content">
              <div class="animation-player">
                <img
                  v-for="(frame, index) in selectedAnimation.frames ?? [selectedAnimation.image]"
                  :key="`${selectedAnimation.id}-frame-${index}`"
                  :src="frame"
                  :alt="selectedAnimation.name"
                />
              </div>
              <div class="animation-settings" aria-label="Animation settings">
                <button class="animation-setting" type="button">
                  <span class="setting-icon">◷</span>
                  <span>Duration</span>
                  <strong>{{ selectedAnimation.duration }}</strong>
                </button>
                <button class="animation-setting" type="button">
                  <span class="setting-icon">●</span>
                  <span>Binding</span>
                  <strong>{{ selectedAnimation.binding }}</strong>
                </button>
                <button class="animation-setting" type="button">
                  <span class="setting-icon">♪</span>
                  <span>Sound</span>
                  <strong>{{ selectedAnimation.sound }}</strong>
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>

      <aside class="preview-column">
        <section class="preview-card">
          <header class="panel-header">
            <h2>Preview</h2>
            <div class="panel-actions">
              <button class="run-button" type="button" @click="runProject">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z" /></svg>
                Run
              </button>
              <button class="publish-button" type="button">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7 18-4-8-8-4 19-6Z" /></svg>
                Publish
              </button>
            </div>
          </header>

          <div class="stage-frame">
            <template v-if="!runnerActive">
              <img class="stage-backdrop" :src="backdropUrl" alt="" />
              <img class="stage-sprite cow-flower" :src="niuXiaoHuaUrl" alt="" />
              <div class="selected-sprite">
                <img :src="niuXiaoQiUrl" alt="" />
                <span class="coordinate">-224, 74</span>
                <span class="handle left"></span>
                <span class="handle right"></span>
                <span class="corner bottom-left"></span>
                <span class="corner top-right"></span>
              </div>
              <div class="stage-tools">
                <button v-for="tool in quickConfigTools" :key="tool.id" type="button" :aria-label="tool.label">
                  <span v-html="tool.icon"></span>
                </button>
              </div>
            </template>
            <PrototypeProjectRunner v-show="runnerActive" ref="runnerRef" :project="project" :show-controls="false" />
          </div>
        </section>

        <section class="asset-card">
          <div class="sprites-panel">
            <header class="asset-header">
              <h2>Sprites</h2>
              <button type="button" aria-label="Add sprite">+</button>
            </header>
            <div class="sprite-list">
              <button v-for="sprite in sprites" :key="sprite.id" class="sprite-card" :class="{ active: sprite.active }" type="button">
                <span v-if="sprite.active" class="sprite-menu">•••</span>
                <img :src="sprite.image" :alt="sprite.name" />
                <span class="sprite-title">
                  <span class="sprite-name">{{ sprite.shortName }}</span>
                  <span v-if="sprite.hidden" class="hidden-mark">⌁</span>
                </span>
              </button>
            </div>
          </div>

          <div class="stage-panel">
            <header class="stage-panel-header">Stage</header>
            <button class="stage-thumb" type="button">
              <img :src="backdropUrl" alt="" />
            </button>
            <button v-for="entry in stageEntries" :key="entry.id" class="stage-entry" type="button">
              <span class="stage-entry-icon" v-html="entry.icon"></span>
              <span>{{ entry.label }}</span>
            </button>
          </div>
        </section>
      </aside>
    </section>

    <section v-else class="map-editor-main">
      <section class="map-workspace">
        <div class="map-stage">
          <img class="map-backdrop" :src="backdropUrl" alt="" />
          <button
            v-for="sprite in sprites"
            :key="`map-${sprite.id}`"
            class="map-sprite"
            :class="[`map-sprite-${sprite.id}`, { active: selectedMapSpriteId === sprite.id }]"
            type="button"
            @click="selectedMapSpriteId = sprite.id"
          >
            <img :src="sprite.image" :alt="sprite.name" />
            <span v-if="selectedMapSpriteId === sprite.id" class="map-sprite-coordinate">-224, 74</span>
          </button>
          <div class="map-zoom-controls">
            <button type="button" aria-label="Zoom in">+</button>
            <button type="button" aria-label="Zoom out">-</button>
            <button type="button" aria-label="Reset zoom">100%</button>
          </div>
        </div>
      </section>

      <aside class="map-side">
        <section class="map-card">
          <header class="map-card-header">
            <h2>Global Config</h2>
            <button type="button" aria-label="Collapse global config">⌄</button>
          </header>
          <div class="map-config">
            <label>
              <span>Map size</span>
              <strong>480 × 360</strong>
            </label>
            <label>
              <span>Physics</span>
              <strong>On</strong>
            </label>
            <label>
              <span>Layer Sorting</span>
              <strong>By Y position</strong>
            </label>
          </div>
        </section>

        <section class="map-card map-sprites-card">
          <header class="map-card-header active">
            <h2>Sprites</h2>
            <button type="button" aria-label="Add sprite">+</button>
          </header>
          <div class="map-sprite-list">
            <button
              v-for="sprite in sprites"
              :key="`map-list-${sprite.id}`"
              class="sprite-card"
              :class="{ active: selectedMapSpriteId === sprite.id }"
              type="button"
              @click="selectedMapSpriteId = sprite.id"
            >
              <span v-if="selectedMapSpriteId === sprite.id" class="sprite-menu">•••</span>
              <img :src="sprite.image" :alt="sprite.name" />
              <span class="sprite-title">
                <span class="sprite-name">{{ sprite.shortName }}</span>
                <span v-if="sprite.hidden" class="hidden-mark">⌁</span>
              </span>
            </button>
          </div>
          <footer class="map-sprite-config">
            <div class="map-config-title">
              <strong>{{ selectedMapSprite.name }}</strong>
              <button type="button" aria-label="Rename sprite">✎</button>
              <button type="button" aria-label="Collapse sprite config">⌄</button>
            </div>
            <div class="map-config-grid">
              <label><span>X</span><input value="-224" readonly /></label>
              <label><span>Y</span><input value="74" readonly /></label>
              <label><span>W</span><input value="54" readonly /></label>
              <label><span>H</span><input value="60" readonly /></label>
            </div>
            <div class="map-config-row">
              <span>Rotation</span>
              <button type="button">Normal</button>
            </div>
            <div class="map-config-row">
              <span>Show</span>
              <button type="button">Visible</button>
            </div>
            <div class="map-config-row">
              <span>Physics</span>
              <button type="button">No physics</button>
            </div>
          </footer>
        </section>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.prototype-editor {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-navbar {
  height: 56px;
  display: grid;
  grid-template-columns: minmax(210px, 1fr) auto minmax(210px, 1fr);
  align-items: center;
  background: var(--ui-color-grey-100);
  border-bottom: 1px solid var(--ui-color-grey-400);
  padding: 0 24px;
}

.navbar-left,
.navbar-right,
.navbar-title,
.panel-actions,
.asset-header,
.sprite-list {
  display: flex;
  align-items: center;
}

.navbar-left {
  gap: 16px;
}

.navbar-right {
  justify-content: flex-end;
  gap: 6px;
}

.brand img {
  display: block;
  width: 99px;
  height: auto;
}

.navbar-divider {
  width: 1px;
  height: 24px;
  background: var(--ui-color-grey-400);
}

.icon-button,
.mode-button,
.stage-tools button,
.stage-entry,
.asset-header button {
  border: 0;
  background: transparent;
  color: var(--ui-color-grey-900);
}

.icon-button {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.icon-button svg,
.mode-button :deep(svg),
.navbar-title svg,
.run-button svg,
.publish-button svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.icon-button.muted {
  color: var(--ui-color-grey-500);
}

.icon-button svg.file-icon {
  fill: currentColor;
  stroke: none;
  stroke-width: 0;
}

.caret {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
}

.navbar-title {
  min-width: 0;
  gap: 8px;
  font-size: 18px;
  font-weight: 500;
}

.project-name-trigger {
  min-width: 0;
  max-width: 248px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: var(--ui-border-radius-md);
  background: transparent;
  padding: 3px 12px;
  color: var(--ui-color-grey-1000);
  font: inherit;
}

.project-name-trigger:hover,
.project-name-trigger:focus-visible {
  background: var(--ui-color-grey-400);
}

.project-name-trigger span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-name-edit-icon {
  display: none;
  color: var(--ui-color-grey-800);
  font-size: 14px;
}

.project-name-trigger:hover .project-name-edit-icon,
.project-name-trigger:focus-visible .project-name-edit-icon {
  display: inline;
}

.project-name-form {
  max-width: 248px;
}

.project-name-form input {
  width: 248px;
  height: 34px;
  border: 1px solid var(--ui-color-primary-main);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 0 12px;
  color: var(--ui-color-grey-1000);
  font: inherit;
  outline: none;
}

.auto-save-state {
  width: 24px;
  height: 24px;
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--ui-color-grey-900);
}

.auto-save-state span,
.auto-save-state :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.auto-save-state.saving :deep(svg) path {
  stroke-dasharray: 2;
  animation: dash 1s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: 24;
  }
}

.mode-button {
  width: 37px;
  height: 30px;
  border-radius: 6px;
  background: var(--ui-color-grey-200);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.mode-button span {
  width: 20px;
  height: 20px;
  display: flex;
}

.mode-button.active {
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-lg);
}

.profile {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  object-fit: cover;
}

.editor-main {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 496px;
  gap: 16px;
  padding: 8px 16px 16px;
}

.map-editor-main {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 24px;
  padding: 20px 24px 24px;
}

.map-workspace {
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-stage {
  position: relative;
  width: min(100%, 820px);
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: var(--ui-border-radius-lg);
  background: var(--ui-color-grey-300);
  box-shadow: var(--ui-box-shadow-lg);
}

.map-backdrop {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.map-sprite {
  position: absolute;
  border: 0;
  background: transparent;
  padding: 0;
  transform: translate(-50%, -50%);
}

.map-sprite img {
  display: block;
  object-fit: contain;
}

.map-sprite-niu-xiao-qi {
  left: 49%;
  top: 46%;
}

.map-sprite-niu-xiao-qi img {
  width: 58px;
}

.map-sprite-niu-xiao-hua {
  left: 26%;
  top: 33%;
}

.map-sprite-niu-xiao-hua img {
  width: 72px;
}

.map-sprite-flower {
  left: 68%;
  top: 48%;
}

.map-sprite-flower img {
  width: 46px;
}

.map-sprite-tornado {
  left: 82%;
  top: 61%;
}

.map-sprite-tornado img {
  width: 54px;
}

.map-sprite.active {
  outline: 1px solid var(--ui-color-primary-main);
  outline-offset: 6px;
}

.map-sprite.active::before,
.map-sprite.active::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--ui-color-grey-100);
  border: 1px solid var(--ui-color-grey-500);
}

.map-sprite.active::before {
  left: -11px;
  top: 50%;
  transform: translateY(-50%);
}

.map-sprite.active::after {
  right: -11px;
  top: 50%;
  transform: translateY(-50%);
}

.map-sprite-coordinate {
  position: absolute;
  right: -28px;
  top: -32px;
  border-radius: var(--ui-border-radius-sm);
  background: rgb(89 117 66 / 0.78);
  color: var(--ui-color-grey-100);
  padding: 3px 7px;
  font-size: 12px;
  white-space: nowrap;
}

.map-zoom-controls {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 4px;
  box-shadow: var(--ui-box-shadow-sm);
}

.map-zoom-controls button {
  height: 28px;
  min-width: 28px;
  border: 0;
  border-radius: var(--ui-border-radius-sm);
  background: transparent;
  color: var(--ui-color-grey-900);
}

.map-side {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.map-card {
  min-height: 0;
  overflow: hidden;
  border-radius: var(--ui-border-radius-lg);
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-lg);
}

.map-card-header {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--ui-color-grey-400);
  padding: 0 16px;
}

.map-card-header.active {
  color: var(--ui-color-primary-main);
}

.map-card-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.map-card-header button,
.map-config-title button,
.map-config-row button {
  border: 0;
  background: transparent;
  color: var(--ui-color-grey-800);
}

.map-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.map-config label,
.map-config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 14px;
}

.map-config strong,
.map-config-row button {
  min-width: 126px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-300);
  color: var(--ui-color-grey-1000);
  font-weight: 500;
}

.map-sprites-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.map-sprite-list {
  min-height: 120px;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px;
  padding: 12px;
  overflow: auto;
}

.map-sprite-config {
  border-top: 1px solid var(--ui-color-grey-400);
  background: var(--ui-color-grey-200);
  padding: 16px;
}

.map-config-title {
  height: 28px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.map-config-title strong {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.map-config-grid label {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.map-config-grid span {
  width: 16px;
  color: var(--ui-color-grey-800);
}

.map-config-grid input {
  min-width: 0;
  width: 100%;
  height: 30px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 0 8px;
  color: var(--ui-color-grey-1000);
}

.code-card,
.preview-card,
.asset-card {
  background: var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-lg);
  box-shadow: 0 1px 0 rgb(16 24 40 / 0.04);
  overflow: hidden;
}

.code-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.code-tabs {
  height: 47px;
  display: flex;
  align-items: flex-end;
  gap: 24px;
  padding: 0 8px;
  border-bottom: 1px solid var(--ui-color-grey-400);
}

.tab {
  height: 39px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: 0 8px;
  font-size: 18px;
  color: var(--ui-color-grey-700);
}

.tab.active {
  color: var(--ui-color-grey-1000);
  border-bottom-color: var(--ui-color-grey-1000);
}

.format-button {
  margin-left: auto;
  margin-bottom: 7px;
  min-width: 80px;
  height: 32px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-xl);
  background: var(--ui-color-grey-100);
  font-size: 14px;
  color: var(--ui-color-grey-700);
}

.code-body {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 60px 219px minmax(0, 1fr);
}

.asset-editor-body {
  min-height: 0;
  flex: 1;
  display: flex;
}

.asset-editor-list {
  width: 112px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 10px;
  border-right: 1px solid var(--ui-color-grey-400);
  overflow-y: auto;
}

.editor-asset-item {
  position: relative;
  box-sizing: border-box;
  width: 88px;
  height: 88px;
  flex: 0 0 auto;
  border: 0;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2px;
  color: var(--ui-color-grey-1000);
}

.editor-asset-item::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: inherit;
  pointer-events: none;
}

.editor-asset-item.active {
  background: var(--ui-color-primary-200);
}

.editor-asset-item.active::before {
  border-width: 2px;
  border-color: var(--ui-color-primary-main);
}

.editor-asset-item img {
  width: 60px;
  height: 60px;
  margin-bottom: 5px;
  object-fit: contain;
}

.editor-asset-item span {
  width: 100%;
  height: 22px;
  overflow: hidden;
  padding: 0 6px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  line-height: 22px;
}

.asset-add-button {
  height: 44px;
  width: calc(100% + 20px);
  margin: auto -10px -12px;
  flex: 0 0 auto;
  border: 0;
  border-top: 1px solid var(--ui-color-grey-400);
  border-radius: 0 0 0 var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  color: var(--ui-color-grey-800);
  font-size: 20px;
}

.asset-detail {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.asset-detail-header {
  height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.asset-detail-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.asset-detail-header button {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: var(--ui-border-radius-md);
  background: transparent;
  color: var(--ui-color-grey-700);
}

.costume-preview {
  position: relative;
  min-height: 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--ui-border-radius-sm);
  background-color: var(--ui-color-grey-100);
  background-image:
    linear-gradient(45deg, var(--ui-color-grey-400) 25%, transparent 25%),
    linear-gradient(-45deg, var(--ui-color-grey-400) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--ui-color-grey-400) 75%),
    linear-gradient(-45deg, transparent 75%, var(--ui-color-grey-400) 75%);
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
  background-size: 16px 16px;
}

.costume-preview img {
  max-width: 72%;
  max-height: 72%;
  object-fit: contain;
}

.animation-detail-content {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.animation-player {
  position: relative;
  min-height: 0;
  flex: 1;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: var(--ui-border-radius-sm);
  background-color: var(--ui-color-grey-100);
  background-image:
    linear-gradient(45deg, var(--ui-color-grey-400) 25%, transparent 25%),
    linear-gradient(-45deg, var(--ui-color-grey-400) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--ui-color-grey-400) 75%),
    linear-gradient(-45deg, transparent 75%, var(--ui-color-grey-400) 75%);
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
  background-size: 16px 16px;
}

.animation-player img {
  grid-area: 1 / 1;
  max-width: 64%;
  max-height: 64%;
  object-fit: contain;
  opacity: 0;
  animation: animation-frame-preview 1.6s steps(1, end) infinite;
}

.animation-player img:nth-child(1) {
  animation-delay: 0s;
}

.animation-player img:nth-child(2) {
  animation-delay: 0.4s;
}

.animation-player img:nth-child(3) {
  animation-delay: 0.8s;
}

.animation-player img:nth-child(4) {
  animation-delay: 1.2s;
}

.animation-settings {
  display: flex;
  justify-content: center;
}

.animation-settings {
  align-self: center;
  gap: 4px;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 4px;
  box-shadow: var(--ui-box-shadow-sm);
}

.animation-setting {
  min-width: 118px;
  height: 32px;
  border: 0;
  border-radius: var(--ui-border-radius-sm);
  background: transparent;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  color: var(--ui-color-grey-1000);
  font-size: 12px;
}

.animation-setting strong {
  max-width: 5em;
  overflow: hidden;
  border-radius: 999px;
  background: var(--ui-color-grey-400);
  padding: 1px 5px;
  color: var(--ui-color-grey-800);
  font-size: 10px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setting-icon {
  color: var(--ui-color-grey-900);
}

@keyframes animation-frame-preview {
  0%,
  24.99% {
    opacity: 1;
  }

  25%,
  100% {
    opacity: 0;
  }
}

.category-rail {
  border-right: 1px solid var(--ui-color-grey-400);
  padding: 13px 4px;
}

.category {
  width: 52px;
  height: 52px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--ui-color-grey-800);
  font-size: 12px;
}

.category.active {
  background: var(--ui-color-grey-300);
  color: var(--ui-color-grey-1000);
}

.category-icon {
  width: 20px;
  height: 20px;
  display: block;
}

.events-list {
  border-right: 1px solid var(--ui-color-grey-400);
  padding: 15px 16px;
  overflow: hidden;
}

.event-group {
  border-bottom: 1px dashed var(--ui-color-grey-400);
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.event-group h3 {
  margin: 0 0 14px;
  font-size: 12px;
  font-weight: 500;
  color: var(--ui-color-grey-600);
}

.event-snippet {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 5px 6px;
  text-align: left;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  color: #000;
  white-space: nowrap;
}

.token-function,
.token-custom {
  color: #b08a01;
}

.token-hint {
  color: var(--ui-color-grey-700);
}

.token-string {
  color: #9c2c2c;
}

.token-operator {
  color: #000;
}

.code-editor {
  position: relative;
  overflow: hidden;
  padding: 14px 18px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.55;
}

.code-line {
  display: grid;
  grid-template-columns: 26px max-content minmax(0, 1fr);
  gap: 8px;
  min-height: 18px;
}

.line-number {
  color: var(--ui-color-grey-500);
  text-align: right;
}

.keyword {
  color: #b08a01;
}

.source {
  color: var(--ui-color-grey-1000);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.source::first-letter {
  color: #9a3131;
}

.zoom-tools {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.zoom-tools button {
  width: 38px;
  height: 38px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: 6px;
  background: var(--ui-color-grey-100);
  font-size: 14px;
  color: var(--ui-color-grey-800);
}

.preview-column {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-card {
  flex: 0 0 auto;
}

.panel-header {
  height: 47px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid var(--ui-color-grey-400);
}

.panel-header h2,
.asset-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.panel-actions {
  gap: 12px;
}

.run-button,
.publish-button {
  height: 32px;
  border: 0;
  border-radius: var(--ui-border-radius-lg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 17px;
  font-size: 14px;
  font-weight: 500;
}

.run-button {
  background: var(--ui-color-primary-main);
  color: white;
}

.publish-button {
  background: var(--ui-color-primary-100);
  color: var(--ui-color-primary-main);
}

.stage-frame {
  position: relative;
  height: 354px;
  margin: 13px;
  overflow: hidden;
  border-radius: 6px;
  background: var(--ui-color-grey-300);
}

.stage-backdrop,
.stage-frame :deep(.relative) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.stage-backdrop {
  object-fit: cover;
}

.stage-sprite,
.selected-sprite {
  position: absolute;
}

.cow-flower {
  left: 79px;
  top: 86px;
  width: 64px;
}

.selected-sprite {
  left: 178px;
  top: 108px;
  width: 105px;
  height: 105px;
  border: 1px solid var(--ui-color-primary-main);
}

.selected-sprite img {
  position: absolute;
  left: 24px;
  top: 10px;
  width: 54px;
}

.coordinate {
  position: absolute;
  top: -28px;
  right: -18px;
  border-radius: 3px;
  background: rgb(89 117 66 / 0.78);
  color: white;
  padding: 4px 7px;
  font-size: 12px;
}

.handle,
.corner {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: white;
  border: 1px solid var(--ui-color-grey-400);
  box-shadow: var(--ui-box-shadow-sm);
}

.handle.left {
  left: -7px;
  top: 45px;
}

.handle.right {
  right: -7px;
  top: 45px;
}

.corner.bottom-left {
  left: -7px;
  bottom: -7px;
}

.corner.top-right {
  right: -7px;
  top: -7px;
}

.stage-tools {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 4px;
  border-radius: 8px;
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-lg);
}

.stage-tools button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ui-border-radius-md);
}

.stage-tools button:hover {
  background: var(--ui-color-turquoise-200);
}

.stage-tools button span,
.stage-tools button :deep(svg) {
  width: 16px;
  height: 16px;
  display: block;
}

.asset-card {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 80px;
  min-height: 0;
}

.sprites-panel {
  min-width: 0;
  border-right: 1px solid var(--ui-color-grey-400);
}

.asset-header {
  height: 42px;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid var(--ui-color-grey-400);
}

.asset-header button {
  font-size: 18px;
  color: var(--ui-color-grey-600);
}

.sprite-list {
  gap: 8px;
  padding: 12px;
  overflow: hidden;
}

.sprite-card {
  position: relative;
  box-sizing: border-box;
  width: 88px;
  height: 88px;
  border: 0;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 2px;
  color: var(--ui-color-grey-1000);
}

.sprite-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: inherit;
  pointer-events: none;
}

.sprite-card.active {
  background: var(--ui-color-primary-200);
}

.sprite-card.active::before {
  border-width: 2px;
  border-color: var(--ui-color-primary-main);
}

.sprite-card img {
  width: 60px;
  height: 60px;
  margin-bottom: 5px;
  object-fit: contain;
}

.sprite-title {
  display: flex;
  width: 100%;
  height: 22px;
  align-items: center;
  gap: 8px;
  padding: 0 6px;
  color: var(--ui-color-grey-1000);
  font-size: 11px;
  line-height: 22px;
  text-align: center;
}

.sprite-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sprite-menu {
  position: absolute;
  top: -10px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--ui-color-primary-main);
  color: white;
  display: grid;
  place-items: center;
  font-weight: 700;
}

.hidden-mark {
  flex: 0 0 auto;
  color: var(--ui-color-grey-500);
}

.stage-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stage-panel-header {
  width: 100%;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--ui-color-grey-400);
  font-size: 18px;
  font-weight: 500;
}

.stage-thumb {
  width: 40px;
  height: 40px;
  margin: 12px 0;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 3px;
}

.stage-thumb img {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  object-fit: cover;
}

.stage-entry {
  width: 56px;
  height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--ui-color-grey-800);
  border-radius: var(--ui-border-radius-md);
  padding: 4px;
}

.stage-entry-icon {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage-entry-icon :deep(svg) {
  width: 24px;
  height: 24px;
  display: block;
}

.stage-entry span {
  font-size: 10px;
}
</style>
