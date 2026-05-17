<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

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
import moreIcon from '@/assets/editor/quick-config/more.svg?raw'
import positionQuickIcon from '@/assets/editor/quick-config/position.svg?raw'
import resizeQuickIcon from '@/assets/editor/quick-config/resize.svg?raw'
import rotateQuickIcon from '@/assets/editor/quick-config/rotate.svg?raw'
import defaultModeIcon from '@/assets/editor/navbar-icons/default-mode.svg?raw'
import mapEditModeIcon from '@/assets/editor/navbar-icons/map-edit-mode.svg?raw'
import cloudCheckIcon from '@/assets/editor/navbar-icons/cloud-check.svg?raw'
import exportProjectIcon from '@/assets/editor/navbar-icons/export-project.svg'
import editIcon from '@/assets/editor/quick-config/edit.svg?raw'
import failedToSaveIcon from '@/assets/editor/navbar-icons/failed-to-save.svg?raw'
import importAssetsScratchIcon from '@/assets/editor/navbar-icons/import-assets-scratch.svg'
import importProjectIcon from '@/assets/editor/navbar-icons/import-project.svg'
import importScratchIcon from '@/assets/editor/navbar-icons/import-scratch.svg'
import offlineIcon from '@/assets/editor/navbar-icons/offline.svg?raw'
import modifyProjectNameIcon from '@/assets/editor/navbar-icons/modify-project-name.svg'
import newProjectIcon from '@/assets/editor/navbar-icons/new.svg'
import openProjectIcon from '@/assets/editor/navbar-icons/open.svg'
import projectPageIcon from '@/assets/editor/navbar-icons/project-page.svg'
import publishIcon from '@/assets/editor/navbar-icons/publish.svg'
import removeProjectIcon from '@/assets/editor/navbar-icons/remove-project.svg'
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

const router = useRouter()

type SpriteCard = {
  id: string
  name: string
  shortName: string
  image: string
  hidden: boolean
}

type SnippetPart = {
  text: string
  type?: 'function' | 'hint' | 'string' | 'custom' | 'operator'
}

type EventSnippet = {
  id: string
  parts: SnippetPart[]
}

type EditorTarget = 'sprite' | 'stage'
type EditorTab = 'code' | 'costumes' | 'animations'
type StageTab = 'code' | 'backdrops' | 'sounds' | 'widgets'
type EditMode = 'default' | 'map'
type SaveState = 'saved' | 'pending' | 'saving' | 'failed' | 'offline'
type CodeCategoryId = 'event' | 'look' | 'motion' | 'control' | 'sensing' | 'sound' | 'game'

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
const activeEditorTarget = ref<EditorTarget>('sprite')
const activeEditorTab = ref<EditorTab>('code')
const activeStageTab = ref<StageTab>('code')
const activeCodeCategory = ref<CodeCategoryId>('event')
const activeEditMode = ref<EditMode>('default')
const projectDisplayName = ref(project.value.title)
const draftProjectDisplayName = ref(project.value.title)
const projectNameEditing = ref(false)
const projectMenuOpen = ref(false)
const addSpriteMenuOpen = ref(false)
const spriteMenuOpenFor = ref<string | null>(null)
const saveState = ref<SaveState>('saved')
const selectedSpriteId = ref('niu-xiao-qi')
const selectedCostumeId = ref('niu-xiao-qi-default')
const selectedAnimationId = ref('niu-run')
const selectedBackdropId = ref('grass-field')
const selectedSoundId = ref('pop')
const selectedWidgetId = ref('score')
const selectedMapSpriteId = ref('niu-xiao-qi')
const mapSpriteNameEditing = ref(false)
const mapSpriteConfigExpanded = ref(true)
const draftMapSpriteName = ref('')
const mapWidth = ref(480)
const mapHeight = ref(360)
const projectNameInputRef = ref<HTMLInputElement>()
const projectMenuRef = ref<HTMLElement>()
const addSpriteMenuRef = ref<HTMLElement>()
const spriteMenuRef = ref<HTMLElement>()
const mapSpriteNameInputRef = ref<HTMLInputElement>()
const saveStateTimeouts: number[] = []

function snippet(id: string, parts: SnippetPart[]): EventSnippet {
  return { id, parts }
}

const categorySnippetGroups: Record<CodeCategoryId, Array<{ title: string; items: EventSnippet[] }>> = {
  event: [
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
    }
  ],
  look: [
    { title: 'Visibility', items: [snippet('visible', [{ text: 'visible', type: 'function' }]), snippet('show', [{ text: 'show', type: 'function' }]), snippet('hide', [{ text: 'hide', type: 'function' }])] },
    { title: 'Costume', items: [snippet('setCostume', [{ text: 'setCostume', type: 'function' }, { text: ' name:', type: 'hint' }, { text: '"牛小七"', type: 'string' }])] },
    { title: 'Graphic Effect', items: [snippet('clearGraphicEffects', [{ text: 'clearGraphicEffects', type: 'function' }])] }
  ],
  motion: [
    { title: 'Position', items: [snippet('stepTo', [{ text: 'stepTo', type: 'function' }, { text: ' obj:', type: 'hint' }, { text: 'Mouse', type: 'custom' }]), snippet('setXYpos', [{ text: 'setXYpos', type: 'function' }, { text: ' x:', type: 'hint' }, { text: '0', type: 'custom' }, { text: ', y:', type: 'hint' }, { text: '0', type: 'custom' }])] },
    { title: 'Heading', items: [snippet('turnTo', [{ text: 'turnTo', type: 'function' }, { text: ' target:', type: 'hint' }, { text: 'Mouse', type: 'custom' }])] },
    { title: 'Physics', items: [snippet('touching', [{ text: 'touching', type: 'function' }, { text: ' target:', type: 'hint' }, { text: 'Sprite', type: 'custom' }])] }
  ],
  control: [
    { title: 'Time', items: [snippet('wait', [{ text: 'wait', type: 'function' }, { text: ' seconds:', type: 'hint' }, { text: '1', type: 'custom' }])] },
    { title: 'Flow Control', items: [snippet('forever', [{ text: 'forever', type: 'function' }, { text: ' => {}', type: 'operator' }]), snippet('repeat', [{ text: 'repeat', type: 'function' }, { text: ' times:', type: 'hint' }, { text: '10', type: 'custom' }])] },
    { title: 'Declaration', items: [snippet('var', [{ text: 'var', type: 'function' }, { text: ' score', type: 'custom' }])] }
  ],
  sensing: [
    { title: 'Mouse', items: [snippet('mouseX', [{ text: 'mouseX', type: 'function' }]), snippet('mouseY', [{ text: 'mouseY', type: 'function' }]), snippet('mousePressed', [{ text: 'mousePressed', type: 'function' }])] },
    { title: 'Keyboard', items: [snippet('keyPressed', [{ text: 'keyPressed', type: 'function' }, { text: ' key:', type: 'hint' }, { text: 'KeyA', type: 'custom' }])] },
    { title: 'Ask', items: [snippet('ask', [{ text: 'ask', type: 'function' }, { text: ' question:', type: 'hint' }, { text: '"name?"', type: 'string' }])] }
  ],
  sound: [
    { title: 'Play / Stop', items: [snippet('play', [{ text: 'play', type: 'function' }, { text: ' name:', type: 'hint' }, { text: '"pop"', type: 'string' }]), snippet('stopAllSounds', [{ text: 'stopAllSounds', type: 'function' }])] },
    { title: 'Volume', items: [snippet('volume', [{ text: 'volume', type: 'function' }]), snippet('setVolume', [{ text: 'setVolume', type: 'function' }, { text: ' volume:', type: 'hint' }, { text: '80', type: 'custom' }])] }
  ],
  game: [
    { title: 'Start / Stop', items: [snippet('start', [{ text: 'start', type: 'function' }]), snippet('stop', [{ text: 'stop', type: 'function' }]), snippet('wait', [{ text: 'wait', type: 'function' }, { text: ' seconds:', type: 'hint' }, { text: '1', type: 'custom' }])] },
    { title: 'Sprite', items: [snippet('getSprite', [{ text: 'getSprite', type: 'function' }, { text: ' name:', type: 'hint' }, { text: '"牛小七"', type: 'string' }]), snippet('cloneSprite', [{ text: 'cloneSprite', type: 'function' }, { text: ' sprite:', type: 'hint' }, { text: '牛小七', type: 'custom' }])] },
    { title: 'Camera', items: [snippet('cameraFollow', [{ text: 'cameraFollow', type: 'function' }, { text: ' target:', type: 'hint' }, { text: '牛小七', type: 'custom' }]), snippet('cameraShake', [{ text: 'cameraShake', type: 'function' }, { text: ' strength:', type: 'hint' }, { text: '4', type: 'custom' }])] },
    { title: 'Others', items: [snippet('timer', [{ text: 'timer', type: 'function' }]), snippet('resetTimer', [{ text: 'resetTimer', type: 'function' }]), snippet('getWidget', [{ text: 'getWidget', type: 'function' }, { text: ' name:', type: 'hint' }, { text: '"Score"', type: 'string' }])] }
  ]
}

const sprites = ref<SpriteCard[]>([
  {
    id: 'niu-xiao-qi',
    name: '牛小七',
    shortName: '牛小七',
    image: niuXiaoQiUrl,
    hidden: false
  },
  {
    id: 'niu-xiao-hua',
    name: '牛小花牛小花牛小花牛小花牛小花牛小花',
    shortName: '牛小花牛小花...',
    image: niuXiaoHuaUrl,
    hidden: false
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
])

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

const backdrops: AssetItem[] = [
  {
    id: 'grass-field',
    name: 'backdrop',
    image: backdropUrl
  }
]

const sounds = [
  { id: 'pop', name: 'pop', duration: '0.18s' },
  { id: 'jump', name: 'jump', duration: '0.32s' }
]

const widgets = [
  { id: 'score', name: 'Score', value: '0' },
  { id: 'timer', name: 'Timer', value: '60' }
]

const selectedCostume = computed(() => costumes.find((costume) => costume.id === selectedCostumeId.value) ?? costumes[0])
const selectedAnimation = computed(
  () => animations.find((animation) => animation.id === selectedAnimationId.value) ?? animations[0] ?? null
)
const selectedBackdrop = computed(() => backdrops.find((backdrop) => backdrop.id === selectedBackdropId.value) ?? backdrops[0])
const selectedSound = computed(() => sounds.find((sound) => sound.id === selectedSoundId.value) ?? sounds[0])
const selectedWidget = computed(() => widgets.find((widget) => widget.id === selectedWidgetId.value) ?? widgets[0])

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

const codeCategories: Array<{ id: CodeCategoryId; label: string; icon: string }> = [
  { id: 'event', label: 'Event', icon: eventIcon },
  { id: 'look', label: 'Look', icon: lookIcon },
  { id: 'motion', label: 'Motion', icon: motionIcon },
  { id: 'control', label: 'Control', icon: controlIcon },
  { id: 'sensing', label: 'Sensing', icon: sensingIcon },
  { id: 'sound', label: 'Sound', icon: soundIcon },
  { id: 'game', label: 'Game', icon: gameIcon }
]

const stageEntries: Array<{ id: Exclude<StageTab, 'code'>; label: string; icon: string }> = [
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

const selectedSprite = computed(() => sprites.value.find((sprite) => sprite.id === selectedSpriteId.value) ?? sprites.value[0])
const selectedMapSprite = computed(() => sprites.value.find((sprite) => sprite.id === selectedMapSpriteId.value) ?? sprites.value[0])
const visibleSnippetGroups = computed(() => categorySnippetGroups[activeCodeCategory.value])
const saveStateMeta = computed(() => {
  switch (saveState.value) {
    case 'pending':
      return { icon: savingIcon, label: 'Pending save', className: 'pending' }
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

function clearSaveStateTimeouts() {
  saveStateTimeouts.splice(0).forEach((timeoutId) => {
    window.clearTimeout(timeoutId)
  })
}

function simulateAutoSave() {
  clearSaveStateTimeouts()
  saveState.value = 'pending'
  saveStateTimeouts.push(
    window.setTimeout(() => {
      saveState.value = 'saving'
    }, 300)
  )
  saveStateTimeouts.push(
    window.setTimeout(() => {
      saveState.value = 'saved'
    }, 900)
  )
}

function cycleSaveState() {
  clearSaveStateTimeouts()
  const states: SaveState[] = ['saved', 'pending', 'saving', 'failed', 'offline']
  const nextIndex = (states.indexOf(saveState.value) + 1) % states.length
  saveState.value = states[nextIndex]
}

const projectMenuGroups = [
  [
    { id: 'new', label: 'New project...', icon: newProjectIcon, action: createPrototypeProject },
    { id: 'open', label: 'Open project...', icon: openProjectIcon, action: openPrototypeProject }
  ],
  [
    { id: 'import-project', label: 'Import project file...', icon: importProjectIcon, action: markPrototypeAction },
    {
      id: 'import-scratch',
      label: 'Import Scratch project file...',
      icon: importScratchIcon,
      badge: 'Beta',
      action: markPrototypeAction
    },
    {
      id: 'import-assets-scratch',
      label: 'Import assets from Scratch...',
      icon: importAssetsScratchIcon,
      action: markPrototypeAction
    }
  ],
  [{ id: 'export-project', label: 'Export project file', icon: exportProjectIcon, action: markPrototypeAction }],
  [
    { id: 'publish-project', label: 'Publish project...', icon: publishIcon, action: markPrototypeAction },
    { id: 'project-page', label: 'Open project page', icon: projectPageIcon, action: openProjectPage },
    { id: 'modify-project-name', label: 'Modify project name', icon: modifyProjectNameIcon, action: startProjectNameEdit }
  ],
  [{ id: 'remove-project', label: 'Remove project...', icon: removeProjectIcon, action: markPrototypeAction }]
]

function selectEditorTab(tab: EditorTab) {
  activeEditorTarget.value = 'sprite'
  activeEditorTab.value = tab
}

function selectCodeCategory(categoryId: CodeCategoryId) {
  activeCodeCategory.value = categoryId
}

function selectSprite(id = selectedSpriteId.value) {
  activeEditorTarget.value = 'sprite'
  selectedSpriteId.value = id
  spriteMenuOpenFor.value = null
}

function selectStage(tab: StageTab = 'code') {
  activeEditorTarget.value = 'stage'
  activeStageTab.value = tab
}

function selectEditMode(mode: EditMode) {
  activeEditMode.value = mode
}

function selectMapSprite(spriteId: string) {
  selectedMapSpriteId.value = spriteId
  mapSpriteConfigExpanded.value = true
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
  simulateAutoSave()
}

function toggleProjectMenu() {
  projectMenuOpen.value = !projectMenuOpen.value
}

function closeProjectMenu() {
  projectMenuOpen.value = false
}

function toggleAddSpriteMenu() {
  addSpriteMenuOpen.value = !addSpriteMenuOpen.value
}

function closeAddSpriteMenu() {
  addSpriteMenuOpen.value = false
}

function toggleSpriteMenu(spriteId: string) {
  activeEditorTarget.value = 'sprite'
  selectedSpriteId.value = spriteId
  spriteMenuOpenFor.value = spriteMenuOpenFor.value === spriteId ? null : spriteId
}

function addLocalSprite(source: 'local' | 'library' | 'ai') {
  const nextIndex = sprites.value.length + 1
  const presets = {
    local: { name: `Local sprite ${nextIndex}`, image: niuXiaoQiUrl },
    library: { name: `Library sprite ${nextIndex}`, image: niuXiaoHuaUrl },
    ai: { name: `AI sprite ${nextIndex}`, image: flowerUrl }
  }
  const preset = presets[source]
  const sprite: SpriteCard = {
    id: `${source}-sprite-${Date.now()}`,
    name: preset.name,
    shortName: preset.name.length > 10 ? `${preset.name.slice(0, 8)}...` : preset.name,
    image: preset.image,
    hidden: false
  }
  sprites.value.push(sprite)
  selectedSpriteId.value = sprite.id
  activeEditorTarget.value = 'sprite'
  closeAddSpriteMenu()
}

function closeSpriteMenu() {
  spriteMenuOpenFor.value = null
}

async function handleProjectMenuItem(action: () => void | Promise<void>) {
  closeProjectMenu()
  await action()
}

function createPrototypeProject() {
  router.push('/editor/qingqing/niu-run')
}

function openPrototypeProject() {
  router.push('/user/qingqing/projects')
}

function openProjectPage() {
  router.push(`/project/${encodeURIComponent(project.value.owner.username)}/${encodeURIComponent(project.value.name)}`)
}

function markPrototypeAction() {
  simulateAutoSave()
}

function handleSpriteMenuAction(action: () => void) {
  closeSpriteMenu()
  action()
}

function toggleSelectedSpriteVisibility() {
  const sprite = selectedSprite.value
  if (sprite == null) return
  sprite.hidden = !sprite.hidden
}

function duplicateSelectedSprite() {
  const sprite = selectedSprite.value
  if (sprite == null) return
  const copyIndex = sprites.value.filter((item) => item.name.startsWith(sprite.name)).length + 1
  const copy: SpriteCard = {
    ...sprite,
    id: `${sprite.id}-copy-${Date.now()}`,
    name: `${sprite.name} ${copyIndex}`,
    shortName: `${sprite.shortName} ${copyIndex}`,
    hidden: false
  }
  sprites.value.push(copy)
  selectedSpriteId.value = copy.id
}

function renameSelectedSprite() {
  const sprite = selectedSprite.value
  if (sprite == null) return
  const nextName = window.prompt('Rename sprite', sprite.name)?.trim()
  if (!nextName) return
  sprite.name = nextName
  sprite.shortName = nextName.length > 10 ? `${nextName.slice(0, 8)}...` : nextName
}

async function startMapSpriteRename() {
  const sprite = selectedMapSprite.value
  if (sprite == null) return
  draftMapSpriteName.value = sprite.name
  mapSpriteNameEditing.value = true
  await nextTick()
  mapSpriteNameInputRef.value?.focus()
  mapSpriteNameInputRef.value?.select()
}

function cancelMapSpriteRename() {
  mapSpriteNameEditing.value = false
  draftMapSpriteName.value = ''
}

function submitMapSpriteRename() {
  if (!mapSpriteNameEditing.value) return
  const sprite = selectedMapSprite.value
  const nextName = draftMapSpriteName.value.trim()
  if (sprite == null || nextName === '' || nextName === sprite.name) {
    cancelMapSpriteRename()
    return
  }
  sprite.name = nextName
  sprite.shortName = nextName.length > 10 ? `${nextName.slice(0, 8)}...` : nextName
  cancelMapSpriteRename()
}

function saveSelectedSpriteToLibrary() {
  markPrototypeAction()
}

function removeSelectedSprite() {
  if (sprites.value.length <= 1) return
  const currentIndex = sprites.value.findIndex((sprite) => sprite.id === selectedSpriteId.value)
  if (currentIndex < 0) return
  sprites.value.splice(currentIndex, 1)
  selectedSpriteId.value = sprites.value[Math.max(0, currentIndex - 1)]?.id ?? sprites.value[0]?.id
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Node)) return
  if (!projectMenuRef.value?.contains(target)) closeProjectMenu()
  if (!addSpriteMenuRef.value?.contains(target)) closeAddSpriteMenu()
  if (!spriteMenuRef.value?.contains(target)) closeSpriteMenu()
}

async function runProject() {
  runnerActive.value = true
  await nextTick()
  await runnerRef.value?.run()
}

onMounted(() => {
  document.title = `Edit ${project.value.title} - XBuilder`
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  clearSaveStateTimeouts()
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
        <div ref="projectMenuRef" class="navbar-dropdown">
          <button
            class="icon-button project-menu-trigger"
            type="button"
            aria-label="Project menu"
            :aria-expanded="projectMenuOpen"
            aria-haspopup="menu"
            @click.stop="toggleProjectMenu"
          >
            <svg class="file-icon" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M6.6084 1.77051C7.00493 1.77063 7.39605 1.8695 7.74512 2.05762C8.09163 2.24443 8.38686 2.51387 8.60449 2.8418L9.2793 3.8418L9.28418 3.84961C9.37032 3.98023 9.4879 4.08753 9.62598 4.16113C9.76424 4.23474 9.91955 4.27199 10.0762 4.27051H16.667C17.3023 4.27059 17.9121 4.52343 18.3613 4.97266C18.8104 5.42193 19.0625 6.03173 19.0625 6.66699V15C19.0625 15.6353 18.8105 16.245 18.3613 16.6943C17.9121 17.1436 17.3023 17.3954 16.667 17.3955H3.33301C2.69771 17.3954 2.0879 17.1436 1.63867 16.6943C1.18947 16.245 0.9375 15.6353 0.9375 15V4.16699C0.9375 3.53173 1.18957 2.92193 1.63867 2.47266C2.0879 2.02343 2.69771 1.77059 3.33301 1.77051H6.6084ZM2.39551 15C2.39551 15.2486 2.49421 15.4873 2.66992 15.6631C2.84566 15.8388 3.08448 15.9374 3.33301 15.9375H16.667C16.9155 15.9374 17.1543 15.8388 17.3301 15.6631C17.5058 15.4873 17.6045 15.2486 17.6045 15V9.0625H2.39551V15ZM3.33301 3.22949C3.08456 3.22958 2.84565 3.32729 2.66992 3.50293C2.49411 3.67875 2.39551 3.91835 2.39551 4.16699V7.60449H17.6045V6.66699C17.6045 6.41835 17.5059 6.17875 17.3301 6.00293C17.1544 5.82729 16.9154 5.72958 16.667 5.72949H10.083C9.68507 5.73215 9.29276 5.63524 8.94141 5.44824C8.59002 5.26111 8.29029 4.98894 8.07031 4.65723L7.39551 3.6582L7.39062 3.65039C7.30537 3.52117 7.18899 3.4153 7.05273 3.3418C6.91626 3.2683 6.7634 3.22957 6.6084 3.22949H3.33301Z"
              />
            </svg>
            <span class="caret"></span>
          </button>
          <div v-if="projectMenuOpen" class="project-menu" role="menu" @click.stop>
            <div v-for="group in projectMenuGroups" :key="group[0]?.id" class="project-menu-group">
              <button
                v-for="item in group"
                :key="item.id"
                class="project-menu-item"
                type="button"
                role="menuitem"
                @click="handleProjectMenuItem(item.action)"
              >
                <img :src="item.icon" alt="" />
                <span>{{ item.label }}</span>
                <span v-if="item.badge" class="project-menu-badge">{{ item.badge }}</span>
              </button>
            </div>
          </div>
        </div>
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
          @click="cycleSaveState"
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
          <template v-if="activeEditorTarget === 'sprite'">
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
          </template>
          <template v-else>
            <button class="tab" :class="{ active: activeStageTab === 'code' }" type="button" @click="selectStage('code')">
              Code
            </button>
            <button class="tab" :class="{ active: activeStageTab === 'backdrops' }" type="button" @click="selectStage('backdrops')">
              Backdrops
            </button>
            <button class="tab" :class="{ active: activeStageTab === 'sounds' }" type="button" @click="selectStage('sounds')">
              Sounds
            </button>
            <button class="tab" :class="{ active: activeStageTab === 'widgets' }" type="button" @click="selectStage('widgets')">
              Widgets
            </button>
          </template>
          <button v-if="activeEditorTarget === 'sprite' ? activeEditorTab === 'code' : activeStageTab === 'code'" class="format-button" type="button">
            Format
          </button>
        </header>

        <div v-if="activeEditorTarget === 'sprite' && activeEditorTab === 'code'" class="code-body">
          <aside class="category-rail" aria-label="Code categories">
            <button
              v-for="category in codeCategories"
              :key="category.id"
              class="category"
              :class="{ active: activeCodeCategory === category.id }"
              type="button"
              @click="selectCodeCategory(category.id)"
            >
              <img class="category-icon" :src="category.icon" alt="" />
              <span>{{ category.label }}</span>
            </button>
          </aside>

          <aside class="events-list" aria-label="Event snippets">
            <section v-for="group in visibleSnippetGroups" :key="group.title" class="event-group">
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

        <div v-else-if="activeEditorTarget === 'sprite' && activeEditorTab === 'costumes'" class="asset-editor-body">
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
              <button type="button" aria-label="Rename costume" v-html="editIcon"></button>
            </header>
            <div class="costume-preview">
              <img :src="selectedCostume.image" :alt="selectedCostume.name" />
            </div>
          </section>
        </div>

        <div v-else-if="activeEditorTarget === 'sprite'" class="asset-editor-body">
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
              <button type="button" aria-label="Rename animation" v-html="editIcon"></button>
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

        <div v-else-if="activeStageTab === 'code'" class="code-body">
          <aside class="category-rail" aria-label="Code categories">
            <button
              v-for="category in codeCategories"
              :key="`stage-${category.id}`"
              class="category"
              :class="{ active: category.id === 'event' }"
              type="button"
            >
              <img class="category-icon" :src="category.icon" alt="" />
              <span>{{ category.label }}</span>
            </button>
          </aside>

          <aside class="events-list" aria-label="Stage snippets">
            <section class="event-group">
              <h3>Stage Events</h3>
              <button class="event-snippet" type="button">
                <span class="token-function">onBackdrop</span><span class="token-hint"> name:</span><span class="token-string">"backdrop"</span>
              </button>
              <button class="event-snippet" type="button"><span class="token-function">show</span></button>
              <button class="event-snippet" type="button"><span class="token-function">hide</span></button>
            </section>
          </aside>

          <section class="code-editor" aria-label="Stage code editor">
            <div class="code-line">
              <span class="line-number">1</span>
              <span class="keyword">onBackdrop</span>
              <span class="source">name:"backdrop", => {</span>
            </div>
            <div class="code-line">
              <span class="line-number">2</span>
              <span class="keyword">  show</span>
              <span class="source"></span>
            </div>
            <div class="code-line">
              <span class="line-number">3</span>
              <span class="keyword">}</span>
              <span class="source"></span>
            </div>
          </section>
        </div>

        <div v-else-if="activeStageTab === 'backdrops'" class="asset-editor-body">
          <aside class="asset-editor-list" aria-label="Backdrops list">
            <button
              v-for="backdrop in backdrops"
              :key="backdrop.id"
              class="editor-asset-item"
              :class="{ active: selectedBackdropId === backdrop.id }"
              type="button"
              @click="selectedBackdropId = backdrop.id"
            >
              <img :src="backdrop.image" :alt="backdrop.name" />
              <span>{{ backdrop.name }}</span>
            </button>
            <button class="asset-add-button" type="button" aria-label="Add backdrop">+</button>
          </aside>
          <section class="asset-detail" aria-label="Backdrop detail">
            <header class="asset-detail-header">
              <h2>{{ selectedBackdrop.name }}</h2>
              <button type="button" aria-label="Rename backdrop" v-html="editIcon"></button>
            </header>
            <div class="backdrop-preview">
              <img :src="selectedBackdrop.image" :alt="selectedBackdrop.name" />
            </div>
          </section>
        </div>

        <div v-else-if="activeStageTab === 'sounds'" class="asset-editor-body">
          <aside class="asset-editor-list" aria-label="Sounds list">
            <button
              v-for="sound in sounds"
              :key="sound.id"
              class="editor-asset-item sound-asset-item"
              :class="{ active: selectedSoundId === sound.id }"
              type="button"
              @click="selectedSoundId = sound.id"
            >
              <span class="sound-wave-icon" aria-hidden="true">
                <svg viewBox="0 0 24 25" fill="none">
                  <path d="M19.661 14.8859L9.58496 21.0519C7.57996 22.2789 5.00098 20.8398 5.00098 18.4938V6.50477C5.00098 4.15877 7.57996 2.71991 9.58496 3.94691L19.661 10.1129C21.446 11.2059 21.446 13.7939 19.661 14.8859Z" fill="currentColor" />
                </svg>
              </span>
              <span>{{ sound.name }}</span>
            </button>
            <button class="asset-add-button" type="button" aria-label="Add sound">+</button>
          </aside>
          <section class="asset-detail" aria-label="Sound detail">
            <header class="sound-detail-title">
              <div class="asset-detail-header">
                <h2>{{ selectedSound.name }}</h2>
                <button type="button" aria-label="Rename sound" v-html="editIcon"></button>
              </div>
              <div class="sound-duration">{{ selectedSound.duration }}</div>
            </header>
            <div class="sound-detail">
              <div class="sound-waveform" aria-hidden="true">
                <svg class="sound-waveform-canvas" viewBox="0 0 640 222" preserveAspectRatio="none">
                  <path class="waveform-shape" d="M0 111 C24 88 48 86 72 111 C96 136 120 132 144 111 C168 90 192 82 216 111 C240 140 264 136 288 111 C312 86 336 78 360 111 C384 144 408 139 432 111 C456 83 480 88 504 111 C528 134 552 126 576 111 C600 96 620 101 640 111 L640 111 C620 121 600 126 576 111 C552 96 528 88 504 111 C480 134 456 139 432 111 C408 83 384 78 360 111 C336 144 312 136 288 111 C264 86 240 82 216 111 C192 140 168 132 144 111 C120 90 96 86 72 111 C48 136 24 134 0 111 Z" />
                </svg>
                <div class="waveform-range-control">
                  <div class="waveform-shaded-area waveform-left-fixed"></div>
                  <div class="waveform-selection-area">
                    <div class="waveform-control-bar waveform-left-bar"></div>
                    <div class="waveform-control-bar waveform-right-bar"></div>
                  </div>
                  <div class="waveform-shaded-area waveform-right-fixed"></div>
                </div>
              </div>
              <div class="sound-controls">
                <button class="sound-play-control" type="button" aria-label="Play sound">
                  <svg class="sound-play-icon" viewBox="0 0 24 25" fill="none" aria-hidden="true">
                    <path d="M19.661 14.8859L9.58496 21.0519C7.57996 22.2789 5.00098 20.8398 5.00098 18.4938V6.50477C5.00098 4.15877 7.57996 2.71991 9.58496 3.94691L19.661 10.1129C21.446 11.2059 21.446 13.7939 19.661 14.8859Z" fill="currentColor" />
                  </svg>
                </button>
                <div class="sound-volume-slider" aria-hidden="true">
                  <svg class="sound-volume-icon" viewBox="0 0 24 24" fill="none">
                    <path d="M7.5 6.99989H9.26697C9.74097 6.99989 10.1991 6.83177 10.5601 6.52577L14.251 3.39882C15.336 2.47982 17.001 3.25099 17.001 4.67299V19.3268C17.001 20.7488 15.336 21.521 14.251 20.601L10.5601 17.474C10.1991 17.168 9.74097 16.9999 9.26697 16.9999H7.5C6.672 16.9999 6 16.3279 6 15.4999V8.50087C6 7.67187 6.672 6.99989 7.5 6.99989Z" fill="currentColor" />
                  </svg>
                  <div class="sound-slider-track"><span></span></div>
                  <svg class="sound-volume-icon" viewBox="0 0 24 24" fill="none">
                    <path d="M3.5 6.99989H5.26697C5.74097 6.99989 6.19906 6.83177 6.56006 6.52577L10.251 3.39882C11.336 2.47982 13.001 3.25099 13.001 4.67299V19.3268C13.001 20.7488 11.336 21.521 10.251 20.601L6.56006 17.474C6.19906 17.168 5.74097 16.9999 5.26697 16.9999H3.5C2.672 16.9999 2 16.3279 2 15.4999V8.50087C2 7.67187 2.672 6.99989 3.5 6.99989ZM16.767 16.7709C18.046 15.4979 18.75 13.8029 18.75 11.9999C18.75 10.1969 18.046 8.5019 16.767 7.2289C16.473 6.9369 15.9981 6.93685 15.7061 7.23085C15.4131 7.52385 15.415 7.99988 15.708 8.29188C16.702 9.28188 17.25 10.5999 17.25 12.0009C17.25 13.4019 16.702 14.7199 15.708 15.7099C15.415 16.0019 15.4131 16.4769 15.7061 16.7709C15.8521 16.9179 16.0451 16.9918 16.2371 16.9918C16.4291 16.9898 16.62 16.9169 16.767 16.7709ZM19.067 19.82C18.875 19.82 18.682 19.747 18.536 19.6C18.244 19.307 18.244 18.832 18.538 18.539C20.287 16.795 21.25 14.4729 21.25 11.9999C21.25 9.52689 20.287 7.20583 18.538 5.46083C18.244 5.16783 18.244 4.69279 18.536 4.39979C18.828 4.10679 19.303 4.10582 19.597 4.39882C21.63 6.42682 22.75 9.12689 22.75 11.9999C22.75 14.8729 21.63 17.573 19.597 19.601C19.45 19.747 19.259 19.82 19.067 19.82Z" fill="currentColor" />
                  </svg>
                </div>
                <div class="sound-controls-spacer"></div>
              </div>
            </div>
          </section>
        </div>

        <div v-else class="asset-editor-body">
          <aside class="asset-editor-list" aria-label="Widgets list">
            <button
              v-for="widget in widgets"
              :key="widget.id"
              class="editor-asset-item widget-asset-item"
              :class="{ active: selectedWidgetId === widget.id }"
              type="button"
              @click="selectedWidgetId = widget.id"
            >
              <span class="widget-icon">▣</span>
              <span>{{ widget.name }}</span>
            </button>
            <button class="asset-add-button" type="button" aria-label="Add widget">+</button>
          </aside>
          <section class="asset-detail" aria-label="Widget detail">
            <header class="asset-detail-header">
              <h2>{{ selectedWidget.name }}</h2>
              <button type="button" aria-label="Rename widget" v-html="editIcon"></button>
            </header>
            <div class="widget-detail">
              <label>
                <span>Value</span>
                <strong>{{ selectedWidget.value }}</strong>
              </label>
              <label>
                <span>Visible</span>
                <strong>On</strong>
              </label>
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
                <img :src="selectedSprite.image" alt="" />
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
              <span ref="addSpriteMenuRef" class="add-sprite-menu-wrap">
                <button
                  type="button"
                  aria-label="Add sprite"
                  :aria-expanded="addSpriteMenuOpen"
                  aria-haspopup="menu"
                  @click.stop="toggleAddSpriteMenu"
                >
                  +
                </button>
                <span v-if="addSpriteMenuOpen" class="add-sprite-menu" role="menu" @click.stop>
                  <button class="add-sprite-menu-item" type="button" role="menuitem" @click="addLocalSprite('local')">
                    Select local file
                  </button>
                  <button class="add-sprite-menu-item" type="button" role="menuitem" @click="addLocalSprite('library')">
                    Choose from asset library
                  </button>
                  <button class="add-sprite-menu-item" type="button" role="menuitem" @click="addLocalSprite('ai')">
                    Generate with AI
                  </button>
                </span>
              </span>
            </header>
            <div ref="spriteMenuRef" class="sprite-list">
              <div
                v-for="sprite in sprites"
                :key="sprite.id"
                class="sprite-card"
                :class="{ active: activeEditorTarget === 'sprite' && selectedSpriteId === sprite.id }"
                role="button"
                tabindex="0"
                @click="selectSprite(sprite.id)"
                @keydown.enter.prevent="selectSprite(sprite.id)"
              >
                <span
                  v-if="activeEditorTarget === 'sprite' && selectedSpriteId === sprite.id"
                  class="sprite-menu-wrap"
                  @click.stop
                >
                  <button
                    class="sprite-menu"
                    type="button"
                    aria-label="Options button"
                    :aria-expanded="spriteMenuOpenFor === sprite.id"
                    aria-haspopup="menu"
                    @click="toggleSpriteMenu(sprite.id)"
                    v-html="moreIcon"
                  ></button>
                  <span v-if="spriteMenuOpenFor === sprite.id" class="sprite-options-menu" role="menu">
                    <button class="sprite-options-item" type="button" role="menuitem" @click="handleSpriteMenuAction(toggleSelectedSpriteVisibility)">
                      {{ selectedSprite.hidden ? 'Show' : 'Hide' }}
                    </button>
                    <button class="sprite-options-item" type="button" role="menuitem" @click="handleSpriteMenuAction(duplicateSelectedSprite)">
                      Duplicate
                    </button>
                    <button class="sprite-options-item" type="button" role="menuitem" @click="handleSpriteMenuAction(renameSelectedSprite)">
                      Rename
                    </button>
                    <button class="sprite-options-item" type="button" role="menuitem" @click="handleSpriteMenuAction(saveSelectedSpriteToLibrary)">
                      Save to asset library
                    </button>
                    <button class="sprite-options-item danger" type="button" role="menuitem" @click="handleSpriteMenuAction(removeSelectedSprite)">
                      Remove
                    </button>
                  </span>
                </span>
                <img :src="sprite.image" :alt="sprite.name" />
                <span class="sprite-title">
                  <span class="sprite-name">{{ sprite.shortName }}</span>
                  <span v-if="sprite.hidden" class="hidden-mark">⌁</span>
                </span>
              </div>
            </div>
          </div>

          <div class="stage-panel">
            <header class="stage-panel-header">Stage</header>
            <button
              class="stage-thumb"
              :class="{ active: activeEditorTarget === 'stage' && activeStageTab === 'code' }"
              type="button"
              aria-label="Stage overview"
              @click="selectStage('code')"
            >
              <img :src="backdropUrl" alt="" />
            </button>
            <button
              v-for="entry in stageEntries"
              :key="entry.id"
              class="stage-entry"
              :class="{ active: activeEditorTarget === 'stage' && activeStageTab === entry.id }"
              type="button"
              @click="selectStage(entry.id)"
            >
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
            @click="selectMapSprite(sprite.id)"
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
              <span class="map-size-inputs">
                <label class="map-number-input">
                  <span>Width</span>
                  <input v-model.number="mapWidth" type="number" inputmode="numeric" min="1" />
                </label>
                <label class="map-number-input">
                  <span>Height</span>
                  <input v-model.number="mapHeight" type="number" inputmode="numeric" min="1" />
                </label>
              </span>
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
              @click="selectMapSprite(sprite.id)"
            >
              <span v-if="selectedMapSpriteId === sprite.id" class="sprite-menu" v-html="moreIcon"></span>
              <img :src="sprite.image" :alt="sprite.name" />
              <span class="sprite-title">
                <span class="sprite-name">{{ sprite.shortName }}</span>
                <span v-if="sprite.hidden" class="hidden-mark">⌁</span>
              </span>
            </button>
          </div>
          <footer v-if="mapSpriteConfigExpanded" class="map-sprite-config">
            <div class="map-config-title">
              <strong v-if="!mapSpriteNameEditing">{{ selectedMapSprite.name }}</strong>
              <form v-else class="map-sprite-name-form" @submit.prevent="submitMapSpriteRename">
                <input
                  ref="mapSpriteNameInputRef"
                  v-model="draftMapSpriteName"
                  aria-label="Sprite name"
                  @blur="submitMapSpriteRename"
                  @keydown.esc.prevent="cancelMapSpriteRename"
                />
              </form>
              <button type="button" aria-label="Rename sprite" @click="startMapSpriteRename">✎</button>
              <button type="button" aria-label="Collapse sprite config" @click="mapSpriteConfigExpanded = false">⌄</button>
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
          <button
            v-else
            class="map-config-expand"
            type="button"
            aria-label="Expand sprite config"
            @click="mapSpriteConfigExpanded = true"
          >
            ⌃
          </button>
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

.navbar-dropdown {
  position: relative;
  height: 56px;
  display: flex;
  align-items: center;
}

.project-menu-trigger {
  height: 100%;
  width: auto;
  padding: 0 12px;
}

.project-menu-trigger:hover {
  background: var(--ui-color-grey-400);
}

.project-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 40;
  min-width: 274px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 8px;
  box-shadow: var(--ui-box-shadow-md);
}

.project-menu-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.project-menu-group + .project-menu-group {
  position: relative;
  margin-top: 13px;
}

.project-menu-group + .project-menu-group::before {
  content: '';
  position: absolute;
  top: -7px;
  left: 0;
  width: 100%;
  border-top: 1px solid var(--ui-color-dividing-line-2);
}

.project-menu-item {
  width: 100%;
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: var(--ui-border-radius-sm);
  background: transparent;
  padding: 8px 40px 8px 8px;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  line-height: 20px;
  text-align: left;
  white-space: nowrap;
}

.project-menu-item:hover {
  background: var(--ui-color-grey-300);
}

.project-menu-item img {
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
}

.project-menu-item span:nth-of-type(1) {
  min-width: 0;
  flex: 1;
}

.project-menu-badge {
  height: 20px;
  display: inline-flex;
  align-items: center;
  border-radius: var(--ui-border-radius-sm);
  background: var(--ui-color-primary-100);
  padding: 0 6px;
  color: var(--ui-color-primary-700);
  font-size: 12px;
  line-height: 20px;
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

.auto-save-state.pending :deep(svg) path,
.auto-save-state.saving :deep(svg) path {
  stroke-dasharray: 2;
}

.auto-save-state.saving :deep(svg) path {
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

.map-size-inputs {
  min-width: 0;
  display: flex;
  gap: 8px;
}

.map-number-input {
  width: 118px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-300);
  box-shadow: inset 0 0 0 1px var(--ui-color-grey-300);
  padding: 0 12px;
  color: var(--ui-color-grey-1000);
  line-height: 22px;
  transition:
    background-color 0.2s,
    box-shadow 0.2s;
}

.map-number-input:hover {
  background: var(--ui-color-grey-400);
}

.map-number-input:focus-within {
  background: var(--ui-color-grey-100);
  box-shadow: inset 0 0 0 1px var(--ui-color-primary-main);
}

.map-number-input span {
  flex: 0 0 auto;
  color: var(--ui-color-grey-800);
}

.map-number-input input {
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
  color: var(--ui-color-grey-1000);
  font: inherit;
  text-align: right;
  outline: none;
}

.map-number-input input::-webkit-outer-spin-button,
.map-number-input input::-webkit-inner-spin-button {
  margin: 0;
  appearance: none;
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
  position: relative;
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

.map-config-expand {
  position: absolute;
  right: 12px;
  bottom: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--ui-border-radius-sm) var(--ui-border-radius-sm) 0 0;
  background: var(--ui-color-grey-300);
  color: var(--ui-color-grey-900);
  box-shadow: var(--ui-box-shadow-sm);
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

.map-sprite-name-form {
  min-width: 0;
  flex: 1;
}

.map-sprite-name-form input {
  width: 100%;
  height: 28px;
  border: 0;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  box-shadow: inset 0 0 0 1px var(--ui-color-primary-main);
  padding: 0 10px;
  color: var(--ui-color-grey-1000);
  font: inherit;
  outline: none;
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

.sound-asset-item,
.widget-asset-item {
  justify-content: flex-start;
  gap: 0;
}

.sound-wave-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  margin: 12px 0;
  border-radius: 50%;
  background: var(--ui-color-primary-main);
  color: var(--ui-color-grey-100);
  transition: transform 0.2s, background-color 0.2s;
}

.sound-asset-item:hover .sound-wave-icon {
  background: var(--ui-color-primary-400);
  transform: scale(1.15);
}

.sound-asset-item:active .sound-wave-icon {
  background: var(--ui-color-primary-600);
  transform: scale(1.15);
}

.sound-wave-icon svg {
  width: 16px;
  height: 16px;
}

.widget-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-primary-100);
  color: var(--ui-color-primary-main);
  font-size: 22px;
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
  gap: 20px;
  border-bottom-right-radius: var(--ui-border-radius-lg);
  background: var(--ui-color-grey-200);
  padding: 24px 20px;
}

.asset-detail-header {
  width: 100%;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 0;
}

.asset-detail-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
}

.asset-detail-header button {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--ui-color-grey-900);
}

.asset-detail-header button :deep(svg) {
  width: 14px;
  height: 14px;
  display: block;
}

.sound-detail-title {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sound-duration {
  color: var(--ui-color-grey-700);
  line-height: 18px;
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

.backdrop-preview {
  min-height: 0;
  flex: 1;
  overflow: hidden;
  border-radius: var(--ui-border-radius-sm);
  background: var(--ui-color-grey-100);
}

.backdrop-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.widget-detail {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  border-radius: var(--ui-border-radius-sm);
  background: var(--ui-color-grey-100);
  padding: 24px;
}

.sound-detail {
  width: 100%;
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px 20px;
}

.sound-waveform {
  position: relative;
  height: 222px;
  width: 100%;
  overflow: hidden;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-300);
}

.sound-waveform-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.waveform-shape {
  fill: var(--ui-color-grey-500);
}

.waveform-range-control {
  position: absolute;
  inset: 0;
  display: flex;
  margin: 0 16px;
  user-select: none;
}

.waveform-shaded-area {
  position: absolute;
  height: 100%;
  background: var(--ui-color-grey-600);
  opacity: 0.35;
}

.waveform-left-fixed {
  left: -16px;
  width: 16px;
}

.waveform-right-fixed {
  right: -16px;
  width: 16px;
}

.waveform-selection-area {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
}

.waveform-control-bar {
  position: absolute;
  z-index: 10;
  width: 16px;
  height: 100%;
  cursor: ew-resize;
  background: var(--ui-color-primary-400);
}

.waveform-control-bar::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 40px;
  border-radius: 1px;
  background: var(--ui-color-grey-100);
  transform: translate(-50%, -50%);
}

.waveform-left-bar {
  left: -16px;
}

.waveform-right-bar {
  right: -16px;
}

.sound-controls {
  display: flex;
  align-items: center;
}

.sound-play-control {
  display: flex;
  width: 36px;
  height: 36px;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: var(--ui-color-primary-main);
  color: var(--ui-color-grey-100);
  cursor: pointer;
  transition: transform 0.2s, background-color 0.2s;
}

.sound-play-control:hover {
  background: var(--ui-color-primary-400);
  transform: scale(1.15);
}

.sound-play-control:active {
  background: var(--ui-color-primary-600);
  transform: scale(1.15);
}

.sound-play-icon {
  width: 16px;
  height: 16px;
}

.sound-volume-slider {
  display: flex;
  flex: 0 1 438px;
  align-items: center;
  gap: 8px;
  margin: 0 24px;
}

.sound-volume-icon {
  width: 24px;
  height: 24px;
  flex: none;
  color: var(--ui-color-grey-800);
}

.sound-slider-track {
  position: relative;
  height: 4px;
  flex: 1;
  border-radius: 999px;
  background: var(--ui-color-grey-400);
}

.sound-slider-track span {
  position: absolute;
  inset: 0 45% 0 0;
  border-radius: inherit;
  background: var(--ui-color-primary-main);
}

.sound-controls-spacer {
  flex: 1 1 0;
}

.widget-detail label {
  width: min(360px, 90%);
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-200);
  padding: 0 14px;
}

.widget-detail strong {
  font-weight: 500;
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
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-size: 18px;
  color: var(--ui-color-grey-600);
}

.asset-header button:hover {
  background: var(--ui-color-grey-400);
}

.add-sprite-menu-wrap {
  position: relative;
  display: inline-flex;
}

.add-sprite-menu {
  position: absolute;
  top: 36px;
  right: 0;
  z-index: 30;
  min-width: 214px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 8px;
  box-shadow: var(--ui-box-shadow-md);
}

.add-sprite-menu-item {
  width: 100%;
  min-height: 36px;
  border: 0;
  border-radius: var(--ui-border-radius-sm);
  background: transparent;
  padding: 8px 10px;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  line-height: 20px;
  text-align: left;
  white-space: nowrap;
}

.add-sprite-menu-item:hover {
  background: var(--ui-color-grey-300);
}

.sprite-list {
  gap: 8px;
  padding: 12px;
  overflow: visible;
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
  cursor: pointer;
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

.sprite-menu-wrap {
  position: absolute;
  top: -6px;
  right: -6px;
  z-index: 5;
}

.sprite-menu {
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 999px;
  background: var(--ui-color-primary-main);
  color: white;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sprite-menu :deep(svg) {
  width: 16px;
  height: 16px;
  display: block;
}

.sprite-options-menu {
  position: absolute;
  top: 26px;
  right: 0;
  z-index: 20;
  min-width: 184px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 8px;
  box-shadow: var(--ui-box-shadow-md);
}

.sprite-options-item {
  min-height: 36px;
  border: 0;
  border-radius: var(--ui-border-radius-sm);
  background: transparent;
  padding: 8px 10px;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  line-height: 20px;
  text-align: left;
  white-space: nowrap;
}

.sprite-options-item:hover {
  background: var(--ui-color-grey-300);
}

.sprite-options-item + .sprite-options-item {
  margin-top: 1px;
}

.sprite-options-item.danger {
  color: var(--ui-color-danger-main);
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

.stage-thumb.active {
  border: 2px solid var(--ui-color-primary-main);
  background: var(--ui-color-primary-200);
  padding: 2px;
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
  background: var(--ui-color-grey-100);
  padding: 4px;
}

.stage-entry.active {
  color: var(--ui-color-grey-800);
}

.stage-entry:hover {
  background: var(--ui-color-grey-300);
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
