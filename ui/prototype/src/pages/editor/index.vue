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

const project = computed(() => getProject(props.ownerNameInput, props.projectNameInput))
const runnerRef = ref<InstanceType<typeof PrototypeProjectRunner>>()
const runnerActive = ref(false)

const eventGroups = [
  {
    title: 'Game Events',
    items: ['onStart => {}']
  },
  {
    title: 'Sensing Events',
    items: ['onClick => {}', 'onKey key:KeyA, => {}', 'onSwipe direction:left,...', 'onTouchStart name:"牛小...', 'onTouchStart names:["牛...']
  },
  {
    title: 'Message Events',
    items: ['broadcast msg:"ping"', 'broadcastAndWait msg:"p...', 'onMsg msg:"ping", => {}']
  },
  {
    title: 'Sprite Events',
    items: ['onCloned data => {}']
  },
  {
    title: 'Stage Events',
    items: ['onBackdrop name:"backdr...']
  },
  {
    title: 'Visibility',
    items: ['visible', 'show']
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
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 7.5h7l1.7 2H21v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9.5Z" />
          </svg>
          <span class="caret"></span>
        </button>
        <button class="icon-button" type="button" aria-label="New project">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 5h10v14H5z" />
            <path d="M18 8v8M14 12h8" />
          </svg>
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
        <span>{{ project.title }}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.5 18.5H17a4 4 0 0 0 .5-8 6 6 0 0 0-11.2 1.5A3.5 3.5 0 0 0 8.5 18.5Z" />
          <path d="m9.5 14 2 2 4-5" />
        </svg>
      </div>

      <div class="navbar-right">
        <button class="mode-button active" type="button" aria-label="Default mode">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 8h14a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-2a3 3 0 0 1 3-3Z" />
            <path d="M8 12h.01M16 12h.01M11 10h2v4h-2z" />
          </svg>
        </button>
        <button class="mode-button" type="button" aria-label="Map edit mode">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z" />
            <path d="M9 4v14M15 6v14" />
          </svg>
        </button>
        <img class="profile" src="@ui-images/avatar.png" alt="" />
      </div>
    </header>

    <section class="editor-main">
      <section class="code-card">
        <header class="code-tabs">
          <button class="tab active" type="button">Code</button>
          <button class="tab" type="button">Costumes</button>
          <button class="tab" type="button">Animations</button>
          <button class="format-button" type="button">Format</button>
        </header>

        <div class="code-body">
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
              <button v-for="item in group.items" :key="item" class="event-snippet" type="button">{{ item }}</button>
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
                <button type="button" aria-label="Center stage">⌾</button>
                <button type="button" aria-label="Restart">↻</button>
                <button type="button" aria-label="Full screen">↗</button>
                <button type="button" aria-label="Layers">▰</button>
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
                <span class="sprite-name">{{ sprite.shortName }}</span>
                <span v-if="sprite.hidden" class="hidden-mark">⌁</span>
              </button>
            </div>
          </div>

          <div class="stage-panel">
            <header class="stage-panel-header">Stage</header>
            <button class="stage-thumb" type="button">
              <img :src="backdropUrl" alt="" />
            </button>
            <button class="stage-entry" type="button">▧<span>Backdrops</span></button>
            <button class="stage-entry" type="button">≋<span>Sounds</span></button>
            <button class="stage-entry" type="button">▣<span>Widgets</span></button>
          </div>
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
.mode-button svg,
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

.caret {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
}

.navbar-title {
  gap: 10px;
  font-size: 18px;
  font-weight: 500;
}

.navbar-title svg {
  width: 24px;
  height: 24px;
}

.mode-button {
  width: 37px;
  height: 30px;
  border-radius: 6px;
  background: var(--ui-color-grey-200);
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
  color: #a57400;
  white-space: nowrap;
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
  color: #b48100;
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
  gap: 11px;
  align-items: center;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-lg);
}

.stage-tools button {
  width: 21px;
  height: 21px;
  font-size: 14px;
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
  width: 84px;
  height: 72px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-lg);
  background: var(--ui-color-grey-100);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--ui-color-grey-1000);
}

.sprite-card.active {
  border: 2px solid var(--ui-color-primary-main);
  background: var(--ui-color-primary-100);
}

.sprite-card img {
  width: 37px;
  height: 37px;
  object-fit: contain;
}

.sprite-name {
  max-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
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
  position: absolute;
  right: 9px;
  bottom: 8px;
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
  width: 47px;
  height: 46px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 14px;
  color: var(--ui-color-grey-800);
}

.stage-entry span {
  font-size: 10px;
}
</style>
