<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue'
import { useRouter } from 'vue-router'

import { getProject } from '@/apis/project'
import PublishProjectModal from '@/components/editor/PublishProjectModal.vue'
import SpriteGeneratorModal, { type SpriteGeneratorResult } from '@/components/editor/SpriteGeneratorModal.vue'
import SpriteItem from '@/components/editor/SpriteItem.vue'
import ProjectRunner from '@/components/project/ProjectRunner.vue'
import UIButton from '@/components/ui/UIButton.vue'
import UICard from '@/components/ui/UICard.vue'
import UICardHeader from '@/components/ui/UICardHeader.vue'
import UITab from '@/components/ui/UITab.vue'
import UITabs from '@/components/ui/UITabs.vue'
import UITag from '@/components/ui/UITag.vue'
import controlIcon from '@/assets/editor/category-icons/control.svg?raw'
import eventIcon from '@/assets/editor/category-icons/event.svg?raw'
import gameIcon from '@/assets/editor/category-icons/game.svg?raw'
import lookIcon from '@/assets/editor/category-icons/look.svg?raw'
import motionIcon from '@/assets/editor/category-icons/motion.svg?raw'
import sensingIcon from '@/assets/editor/category-icons/sensing.svg?raw'
import soundIcon from '@/assets/editor/category-icons/sound.svg?raw'
import zoomInIcon from '@/assets/editor/code-editor/zoom-in.svg?raw'
import zoomOutIcon from '@/assets/editor/code-editor/zoom-out.svg?raw'
import zoomResetIcon from '@/assets/editor/code-editor/zoom-reset.svg?raw'
import closeCircleIcon from '@/assets/editor/code-editor/close-circle.svg?raw'
import backdropPanelIcon from '@/assets/editor/stage-panel/backdrop.svg?raw'
import soundPanelIcon from '@/assets/editor/stage-panel/sound.svg?raw'
import widgetPanelIcon from '@/assets/editor/stage-panel/widget.svg?raw'
import monitorWidgetIcon from '@/assets/editor/widget/monitor.svg?raw'
import layerQuickIcon from '@/assets/editor/quick-config/layer.svg?raw'
import backQuickIcon from '@/assets/editor/quick-config/back.svg?raw'
import moreIcon from '@/assets/editor/quick-config/more.svg?raw'
import positionQuickIcon from '@/assets/editor/quick-config/position.svg?raw'
import resizeQuickIcon from '@/assets/editor/quick-config/resize.svg?raw'
import rotateQuickIcon from '@/assets/editor/quick-config/rotate.svg?raw'
import defaultModeIcon from '@/assets/editor/navbar-icons/default-mode.svg?raw'
import mapEditModeIcon from '@/assets/editor/navbar-icons/map-edit-mode.svg?raw'
import cloudCheckIcon from '@/assets/editor/navbar-icons/cloud-check.svg?raw'
import projectFileIcon from '@/assets/editor/navbar-icons/file.svg?raw'
import arrowMiniIcon from '@/assets/navbar-icons/arrow-mini.svg?raw'
import exportProjectIcon from '@/assets/editor/navbar-icons/export-project.svg'
import editIcon from '@/assets/editor/quick-config/edit.svg?raw'
import arrowDownIcon from '@/assets/editor/ui-icons/arrow-down.svg?raw'
import settingSoundIcon from '@/assets/editor/ui-icons/sound.svg?raw'
import settingStatusIcon from '@/assets/editor/ui-icons/status.svg?raw'
import settingTimerIcon from '@/assets/editor/ui-icons/timer.svg?raw'
import failedToSaveIcon from '@/assets/editor/navbar-icons/failed-to-save.svg?raw'
import importAssetsScratchIcon from '@/assets/editor/navbar-icons/import-assets-scratch.svg'
import importProjectIcon from '@/assets/editor/navbar-icons/import-project.svg'
import importScratchIcon from '@/assets/editor/navbar-icons/import-scratch.svg'
import offlineIcon from '@/assets/editor/navbar-icons/offline.svg?raw'
import modifyProjectNameIcon from '@/assets/editor/navbar-icons/modify-project-name.svg'
import newProjectIcon from '@/assets/editor/navbar-icons/new.svg'
import openProjectIcon from '@/assets/editor/navbar-icons/open.svg'
import plusIcon from '@/assets/editor/ui-icons/plus.svg?raw'
import projectPageIcon from '@/assets/editor/navbar-icons/project-page.svg'
import publishActionIcon from '@/assets/editor/ui-icons/publish.svg?raw'
import publishIcon from '@/assets/editor/navbar-icons/publish.svg'
import removeProjectIcon from '@/assets/editor/navbar-icons/remove-project.svg'
import savingIcon from '@/assets/editor/navbar-icons/saving.svg?raw'
import tutorialIcon from '@/assets/editor/navbar-icons/tutorial.svg?raw'
import stageBgUrl from '@/assets/stage-bg.svg'
import backdropUrl from '@/assets/projects/niu-run/editor/backdrop.png'
import flowerUrl from '@/assets/projects/niu-run/editor/sprite-flower.png'
import niuXiaoHuaUrl from '@/assets/projects/niu-run/editor/sprite-niu-xiao-hua.png'
import niuXiaoQiUrl from '@/assets/projects/niu-run/editor/sprite-niu-xiao-qi.png'
import tornadoUrl from '@/assets/projects/niu-run/editor/sprite-tornado.svg'
import weatherggggBackdropUrl from '@/assets/projects/weathergggg/editor/urban1.png'
import jaimeUrl from '@/assets/projects/weathergggg/editor/jaime.png'
import kaiUrl from '@/assets/projects/weathergggg/editor/kai.png'

const rotateAroundIcon =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.22562 2.20918C6.23356 1.73213 7.3608 1.56446 8.4639 1.72773C9.5671 1.89109 10.5973 2.37843 11.4239 3.12715L11.4258 3.12812C12.5806 4.18235 13.2832 5.64311 13.3868 7.20332L13.4063 7.59785L14.3467 6.56074C14.563 6.32214 14.9322 6.30446 15.1709 6.5207C15.4094 6.73702 15.4271 7.10529 15.211 7.34394L13.3311 9.41914C13.2919 9.46365 13.2464 9.50241 13.1953 9.5334C13.133 9.56822 13.0844 9.58716 13.0332 9.5998C12.852 9.6364 12.6693 9.59083 12.501 9.46601L10.42 7.58125C10.1814 7.36506 10.1631 6.99576 10.3789 6.75703C10.5952 6.51827 10.9644 6.50073 11.2032 6.71699L12.2412 7.65644L12.2227 7.27949C12.139 6.02027 11.5724 4.84152 10.6407 3.99043C9.98523 3.39685 9.16774 3.01156 8.29301 2.88203C7.41825 2.75257 6.52493 2.88563 5.72562 3.26387C4.92627 3.64224 4.25627 4.24934 3.80179 5.00801C3.34761 5.76652 3.12837 6.64255 3.17191 7.52558C3.21554 8.409 3.51984 9.26061 4.04691 9.9709C4.57392 10.681 5.30021 11.2191 6.13285 11.5168C6.96561 11.8144 7.8688 11.8579 8.7266 11.6428C9.03876 11.5648 9.35513 11.7546 9.43363 12.0666C9.51197 12.379 9.32212 12.6961 9.0098 12.7746C7.92834 13.0457 6.79016 12.9906 5.74027 12.6154C4.6903 12.24 3.77393 11.5616 3.10941 10.6662C2.44501 9.77082 2.06201 8.69777 2.00687 7.58418C1.95187 6.47053 2.22796 5.36498 2.80082 4.4084C3.3738 3.45187 4.21786 2.68629 5.22562 2.20918Z" fill="currentColor"/></svg>'
const leftRightIcon =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8.00098 12.75C8.32303 12.75 8.58381 13.011 8.58398 13.333V14.667C8.58381 14.989 8.32303 15.25 8.00098 15.25C7.67892 15.25 7.41814 14.989 7.41797 14.667V13.333C7.41814 13.011 7.67892 12.75 8.00098 12.75ZM1.77734 4.12793C1.99532 4.03764 2.24723 4.08707 2.41406 4.25391L5.74707 7.58691C5.97488 7.81472 5.97488 8.18528 5.74707 8.41309L2.41406 11.7461C2.24723 11.9129 1.99532 11.9624 1.77734 11.8721C1.5596 11.7817 1.41797 11.5688 1.41797 11.333V4.66699C1.41797 4.4312 1.5596 4.21832 1.77734 4.12793ZM13.5879 4.25391C13.7547 4.08707 14.0066 4.03764 14.2246 4.12793C14.4424 4.21832 14.584 4.4312 14.584 4.66699V11.333C14.584 11.5688 14.4424 11.7817 14.2246 11.8721C14.0066 11.9624 13.7547 11.9129 13.5879 11.7461L10.2549 8.41309C10.0271 8.18528 10.0271 7.81472 10.2549 7.58691L13.5879 4.25391ZM8.00098 8.75C8.32303 8.75 8.58381 9.01099 8.58398 9.33301V10.667C8.58381 10.989 8.32303 11.25 8.00098 11.25C7.67892 11.25 7.41814 10.989 7.41797 10.667V9.33301C7.41814 9.01099 7.67892 8.75 8.00098 8.75ZM2.58398 9.9248L4.50879 8L2.58398 6.0752V9.9248ZM11.4932 8L13.418 9.9248V6.0752L11.4932 8ZM8.00098 4.75C8.32303 4.75 8.58381 5.01099 8.58398 5.33301V6.66699C8.58381 6.98901 8.32303 7.25 8.00098 7.25C7.67892 7.25 7.41814 6.98901 7.41797 6.66699V5.33301C7.41814 5.01099 7.67892 4.75 8.00098 4.75ZM8.00098 0.75C8.32303 0.75 8.58381 1.01099 8.58398 1.33301V2.66699C8.58381 2.98901 8.32303 3.25 8.00098 3.25C7.67892 3.25 7.41814 2.98901 7.41797 2.66699V1.33301C7.41814 1.01099 7.67892 0.75 8.00098 0.75Z" fill="currentColor"/></svg>'
const notRotateIcon =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.6716 1.57439C11.8791 1.3282 12.2476 1.29714 12.4939 1.50408C12.7402 1.71141 12.7724 2.07983 12.5652 2.32634L2.38159 14.425C2.17418 14.6712 1.80568 14.7031 1.55933 14.4963C1.31318 14.289 1.28108 13.9205 1.48804 13.674L2.96949 11.9123C2.85671 11.78 2.74894 11.6425 2.6482 11.4992C2.01135 10.5929 1.65093 9.5125 1.61304 8.39666C1.57539 7.28099 1.86239 6.17794 2.43628 5.22869C3.01031 4.27977 3.84659 3.52551 4.83863 3.06267C5.83097 2.60002 6.93631 2.4486 8.01245 2.6281C8.75754 2.75257 9.46709 3.03187 10.0974 3.44451L11.6716 1.57439ZM5.66187 12.3322C6.4456 12.6231 7.29609 12.6751 8.10816 12.4797C8.43623 12.401 8.76509 12.6098 8.84253 12.9455C8.9194 13.2815 8.71556 13.6182 8.38745 13.6974C7.32598 13.9529 6.21341 13.8815 5.19214 13.4904C5.06643 13.4422 4.94243 13.3884 4.82105 13.3312L5.66187 12.3322ZM7.81616 3.86248C6.97848 3.72271 6.11786 3.8413 5.34546 4.20134C4.57336 4.56156 3.92214 5.1484 3.47534 5.88689C3.02859 6.62583 2.80535 7.48511 2.83472 8.35369C2.86426 9.22207 3.14479 10.0623 3.64038 10.7677C3.68453 10.8306 3.73092 10.8922 3.77808 10.9523L9.28882 4.40447C8.83683 4.13446 8.33775 3.94965 7.81616 3.86248ZM11.7439 5.10564C12.3397 6.01144 12.6918 7.07259 12.7478 8.17986L12.7576 8.46306L13.6101 7.52752C13.8403 7.27572 14.2269 7.26216 14.4734 7.49724C14.7196 7.73272 14.7332 8.12841 14.5037 8.38103L12.6453 10.4211C12.5327 10.519 12.3933 10.5871 12.2195 10.6203C12.1868 10.6214 12.1533 10.6184 12.1218 10.6144C12.0646 10.6057 12.0304 10.5967 11.9978 10.5851C11.9191 10.5511 11.8629 10.5166 11.7976 10.466L9.78882 8.549C9.54255 8.31339 9.52873 7.9168 9.75855 7.66423C9.98874 7.41218 10.3762 7.39879 10.6228 7.63396L11.5359 8.50603L11.5271 8.24431C11.4885 7.48271 11.2731 6.74817 10.9089 6.09783L11.7439 5.10564Z" fill="currentColor"/></svg>'

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
  x: number
  y: number
  size: number
  heading: number
  rotationStyle: RotationStyle
}

type StageSpriteDragState = {
  pointerId: number
  startX: number
  startY: number
  spriteStartX: number
  spriteStartY: number
  sprite: SpriteCard
  moved: boolean
}

type MapSpriteDragState = {
  pointerId: number
  startX: number
  startY: number
  spriteStartX: number
  spriteStartY: number
  stageWidth: number
  stageHeight: number
  sprite: SpriteCard
  moved: boolean
}

type SnippetPart = {
  text: string
  type?: 'function' | 'hint' | 'string' | 'identifier' | 'number' | 'keyword' | 'custom' | 'operator'
}

type CodeTokenType = NonNullable<SnippetPart['type']>

const codeTokenClass: Record<CodeTokenType, string> = {
  function: 'text-[#b08a01]',
  hint: 'text-grey-700',
  string: 'text-[#9c2c2c]',
  identifier: 'text-[#0774cd]',
  number: 'text-[#139707]',
  keyword: 'text-[#892ba8]',
  custom: 'text-[#0774cd]',
  operator: 'text-grey-1000'
}

const stageSpriteScale = 0.5
const stageSpriteOrigin = { left: 290, top: 145 }

function getCodeTokenClass(type?: SnippetPart['type']) {
  return type != null ? codeTokenClass[type] : undefined
}

function getSourceParts(source: string): SnippetPart[] {
  if (source.length === 0) return []
  const parts: SnippetPart[] = []
  const tokenPattern = /"[^"]*"|\b\d+(?:\.\d+)?\b|[A-Za-z_][A-Za-z0-9_]*|[\u4e00-\u9fff]+/g
  let cursor = 0
  for (const match of source.matchAll(tokenPattern)) {
    const text = match[0]
    const index = match.index ?? 0
    if (index > cursor) parts.push({ text: source.slice(cursor, index), type: 'operator' })
    if (text.startsWith('"')) {
      parts.push({ text, type: 'string' })
    } else if (/^\d/.test(text)) {
      parts.push({ text, type: 'number' })
    } else if (text === 'true' || text === 'false' || text === 'nil') {
      parts.push({ text, type: 'keyword' })
    } else {
      parts.push({ text, type: 'identifier' })
    }
    cursor = index + text.length
  }
  if (cursor < source.length) parts.push({ text: source.slice(cursor), type: 'operator' })
  return parts
}

type EventSnippet = {
  id: string
  parts: SnippetPart[]
}

type EditorTarget = 'sprite' | 'stage'
type EditorTab = 'code' | 'costumes' | 'animations'
type StageTab = 'code' | 'backdrops' | 'sounds' | 'widgets'
type EditMode = 'default' | 'map'
type QuickConfigType = 'default' | 'position' | 'rotation' | 'size' | 'layer'
type RotationStyle = 'normal' | 'left-right' | 'none'
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

type SoundItem = {
  id: string
  name: string
  duration: string
}

type SoundEditState = {
  left: number
  right: number
  gain: number
  savedLeft: number
  savedRight: number
  savedGain: number
}

type WidgetItem = {
  id: string
  name: string
  value: string
}

type CodeLine = [string, string]

type CodeDocumentTab = {
  id: string
  label: string
  image: string
  active: boolean
  kind: EditorTarget
  spriteId?: string
}

type EditorProjectData = {
  sprites: SpriteCard[]
  costumes: AssetItem[]
  animations: AssetItem[]
  backdrops: AssetItem[]
  sounds: SoundItem[]
  widgets: WidgetItem[]
  codeLines: CodeLine[]
  stageCodeLines: CodeLine[]
  physicsEnabled: boolean
  layerSorting: 'default' | 'vertical'
}

const project = computed(() => getProject(props.ownerNameInput, props.projectNameInput))
const runnerRef = ref<InstanceType<typeof ProjectRunner>>()
const runnerActive = ref(false)
const activeEditorTarget = ref<EditorTarget>('sprite')
const activeEditorTab = ref<EditorTab>('code')
const activeStageTab = ref<StageTab>('code')
const activeCodeCategory = ref<CodeCategoryId>('event')
const activeEditMode = ref<EditMode>('default')
const activeQuickConfig = ref<QuickConfigType>('default')
const projectDisplayName = ref(project.value.title)
const draftProjectDisplayName = ref(project.value.title)
const projectNameEditing = ref(false)
const projectMenuOpen = ref(false)
const profileMenuOpen = ref(false)
const profileLanguage = ref<'English' | '中文'>('English')
const publishModalOpen = ref(false)
const publishSubmitting = ref(false)
const publishStatusMessage = ref('')
const addSpriteMenuOpen = ref(false)
const addCostumeMenuOpen = ref(false)
const addAnimationMenuOpen = ref(false)
const costumeMenuOpenFor = ref<string | null>(null)
const animationMenuOpenFor = ref<string | null>(null)
const animationPendingRemoval = ref<AssetItem | null>(null)
const preserveRemovedAnimationFrames = ref(false)
const spritePendingRename = ref<SpriteCard | null>(null)
const draftSpriteRenameName = ref('')
const spriteRenameError = ref('')
const spriteGenModalOpen = ref(false)
const spriteMenuOpenFor = ref<string | null>(null)
const spriteMenuPosition = ref({ top: 0, left: 0 })
const addCostumeMenuPosition = ref({ top: 0, left: 0 })
const costumeMenuPosition = ref({ top: 0, left: 0 })
const addAnimationMenuPosition = ref({ top: 0, left: 0 })
const animationMenuPosition = ref({ top: 0, left: 0 })
const codeZoom = ref(1)
const tempCodeDocumentsOpen = ref(true)
const saveState = ref<SaveState>('saved')
const editorRevision = ref(0)
const selectedSpriteId = ref('niu-xiao-qi')
const selectedCostumeId = ref('niu-xiao-qi-default')
const selectedAnimationId = ref('niu-run')
const selectedBackdropId = ref('grass-field')
const selectedSoundId = ref('pop')
const selectedWidgetId = ref('score')
const soundEditStates = ref<Record<string, SoundEditState>>({})
const selectedMapSpriteId = ref('niu-xiao-qi')
const mapSpriteNameEditing = ref(false)
const mapSpriteConfigExpanded = ref(true)
const mapPhysicsEnabled = ref(true)
const mapLayerSorting = ref<'default' | 'vertical'>('vertical')
const mapSpritePhysicsFlags = ref<string[]>([])
const draftMapSpriteName = ref('')
const mapWidth = ref(480)
const mapHeight = ref(360)
const projectNameInputRef = ref<HTMLInputElement>()
const projectMenuRef = ref<HTMLElement>()
const profileMenuRef = ref<HTMLElement>()
const addSpriteMenuRef = ref<HTMLElement>()
const mapAddSpriteMenuRef = ref<HTMLElement>()
const addCostumeMenuRef = ref<HTMLElement>()
const costumeMenuRef = ref<HTMLElement>()
const addAnimationMenuRef = ref<HTMLElement>()
const animationMenuRef = ref<HTMLElement>()
const spriteMenuRef = ref<HTMLElement>()
const mapSpriteNameInputRef = ref<HTMLInputElement>()
const spriteRenameInputRef = ref<HTMLInputElement>()
const saveStateTimeouts: number[] = []
let publishTimer: number | null = null
let stageSpriteDragState: StageSpriteDragState | null = null
let mapSpriteDragState: MapSpriteDragState | null = null

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
          { text: 'KeyA', type: 'identifier' },
          { text: ', => {}', type: 'operator' }
        ]),
        snippet('onSwipe', [
          { text: 'onSwipe', type: 'function' },
          { text: ' direction:', type: 'hint' },
          { text: 'left', type: 'identifier' },
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
          { text: ' data', type: 'identifier' },
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
    { title: 'Position', items: [snippet('stepTo', [{ text: 'stepTo', type: 'function' }, { text: ' obj:', type: 'hint' }, { text: 'Mouse', type: 'identifier' }]), snippet('setXYpos', [{ text: 'setXYpos', type: 'function' }, { text: ' x:', type: 'hint' }, { text: '0', type: 'number' }, { text: ', y:', type: 'hint' }, { text: '0', type: 'number' }])] },
    { title: 'Heading', items: [snippet('turnTo', [{ text: 'turnTo', type: 'function' }, { text: ' target:', type: 'hint' }, { text: 'Mouse', type: 'identifier' }])] },
    { title: 'Physics', items: [snippet('touching', [{ text: 'touching', type: 'function' }, { text: ' target:', type: 'hint' }, { text: 'Sprite', type: 'identifier' }])] }
  ],
  control: [
    { title: 'Time', items: [snippet('wait', [{ text: 'wait', type: 'function' }, { text: ' seconds:', type: 'hint' }, { text: '1', type: 'number' }])] },
    { title: 'Flow Control', items: [snippet('forever', [{ text: 'forever', type: 'function' }, { text: ' => {}', type: 'operator' }]), snippet('repeat', [{ text: 'repeat', type: 'function' }, { text: ' times:', type: 'hint' }, { text: '10', type: 'number' }])] },
    { title: 'Declaration', items: [snippet('var', [{ text: 'var', type: 'keyword' }, { text: ' score', type: 'identifier' }])] }
  ],
  sensing: [
    { title: 'Mouse', items: [snippet('mouseX', [{ text: 'mouseX', type: 'function' }]), snippet('mouseY', [{ text: 'mouseY', type: 'function' }]), snippet('mousePressed', [{ text: 'mousePressed', type: 'function' }])] },
    { title: 'Keyboard', items: [snippet('keyPressed', [{ text: 'keyPressed', type: 'function' }, { text: ' key:', type: 'hint' }, { text: 'KeyA', type: 'identifier' }])] },
    { title: 'Ask', items: [snippet('ask', [{ text: 'ask', type: 'function' }, { text: ' question:', type: 'hint' }, { text: '"name?"', type: 'string' }])] }
  ],
  sound: [
    { title: 'Play / Stop', items: [snippet('play', [{ text: 'play', type: 'function' }, { text: ' name:', type: 'hint' }, { text: '"pop"', type: 'string' }]), snippet('stopAllSounds', [{ text: 'stopAllSounds', type: 'function' }])] },
    { title: 'Volume', items: [snippet('volume', [{ text: 'volume', type: 'function' }]), snippet('setVolume', [{ text: 'setVolume', type: 'function' }, { text: ' volume:', type: 'hint' }, { text: '80', type: 'number' }])] }
  ],
  game: [
    { title: 'Start / Stop', items: [snippet('start', [{ text: 'start', type: 'function' }]), snippet('stop', [{ text: 'stop', type: 'function' }]), snippet('wait', [{ text: 'wait', type: 'function' }, { text: ' seconds:', type: 'hint' }, { text: '1', type: 'number' }])] },
    { title: 'Sprite', items: [snippet('getSprite', [{ text: 'getSprite', type: 'function' }, { text: ' name:', type: 'hint' }, { text: '"牛小七"', type: 'string' }]), snippet('cloneSprite', [{ text: 'cloneSprite', type: 'function' }, { text: ' sprite:', type: 'hint' }, { text: '牛小七', type: 'identifier' }])] },
    { title: 'Camera', items: [snippet('cameraFollow', [{ text: 'cameraFollow', type: 'function' }, { text: ' target:', type: 'hint' }, { text: '牛小七', type: 'identifier' }]), snippet('cameraShake', [{ text: 'cameraShake', type: 'function' }, { text: ' strength:', type: 'hint' }, { text: '4', type: 'number' }])] },
    { title: 'Others', items: [snippet('timer', [{ text: 'timer', type: 'function' }]), snippet('resetTimer', [{ text: 'resetTimer', type: 'function' }]), snippet('getWidget', [{ text: 'getWidget', type: 'function' }, { text: ' name:', type: 'hint' }, { text: '"Score"', type: 'string' }])] }
  ]
}

const niuRunSprites = ref<SpriteCard[]>([
  {
    id: 'niu-xiao-qi',
    name: '牛小七',
    shortName: '牛小七',
    image: niuXiaoQiUrl,
    hidden: false,
    x: -224,
    y: 74,
    size: 100,
    heading: 90,
    rotationStyle: 'normal'
  },
  {
    id: 'niu-xiao-hua',
    name: '牛小花牛小花牛小花牛小花牛小花牛小花',
    shortName: '牛小花牛小花...',
    image: niuXiaoHuaUrl,
    hidden: false,
    x: -130,
    y: 94,
    size: 100,
    heading: 90,
    rotationStyle: 'normal'
  },
  {
    id: 'flower',
    name: '花朵花朵花朵花朵花朵花朵花朵花朵花朵',
    shortName: '花朵花...',
    image: flowerUrl,
    hidden: true,
    x: 0,
    y: 0,
    size: 100,
    heading: 90,
    rotationStyle: 'normal'
  },
  {
    id: 'tornado',
    name: '龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风龙卷风',
    shortName: '龙卷风...',
    image: tornadoUrl,
    hidden: true,
    x: 120,
    y: -20,
    size: 100,
    heading: 90,
    rotationStyle: 'normal'
  }
])

const niuRunCostumes: AssetItem[] = [
  {
    id: 'niu-xiao-qi-default',
    name: '牛小七',
    image: niuXiaoQiUrl
  }
]

const niuRunAnimations: AssetItem[] = [
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

const niuRunBackdrops: AssetItem[] = [
  {
    id: 'grass-field',
    name: 'backdrop',
    image: backdropUrl
  }
]

const niuRunSounds: SoundItem[] = [
  { id: 'pop', name: 'pop', duration: '0.18s' },
  { id: 'jump', name: 'jump', duration: '0.32s' }
]

const defaultWidgets: WidgetItem[] = [
  { id: 'score', name: 'Score', value: '0' },
  { id: 'timer', name: 'Timer', value: '60' }
]

const niuRunCodeLines: CodeLine[] = [
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

const niuRunStageCodeLines: CodeLine[] = [
  ['onBackdrop', 'name:"backdrop", => {'],
  ['  show', ''],
  ['}', '']
]

const weatherggggSprites = ref<SpriteCard[]>([
  {
    id: 'jaime',
    name: 'Jaime',
    shortName: 'Jaime',
    image: jaimeUrl,
    hidden: false,
    x: -80,
    y: 40,
    size: 100,
    heading: 90,
    rotationStyle: 'normal'
  },
  {
    id: 'kai',
    name: 'Kai',
    shortName: 'Kai',
    image: kaiUrl,
    hidden: false,
    x: 80,
    y: 40,
    size: 100,
    heading: 90,
    rotationStyle: 'normal'
  }
])

const weatherggggCostumes: AssetItem[] = [
  {
    id: 'jaime-b',
    name: 'jaime-b',
    image: jaimeUrl
  }
]

const weatherggggAnimations: AssetItem[] = []

const weatherggggBackdrops: AssetItem[] = [
  {
    id: 'urban1',
    name: 'urban1',
    image: weatherggggBackdropUrl
  }
]

const weatherggggCodeLines: CodeLine[] = [
  ['onMsg', 'msg:"1", => {'],
  ['  say', '"I come from England.", 2'],
  ['  broadcast', '"2"'],
  ['}', ''],
  ['', ''],
  ['onMsg', 'msg:"3", => {'],
  ['  say', "\"It's mild, but it's not always pleasant.\", 4"],
  ['  setCostume', 'Next'],
  ['', ''],
  ['  say', "\"The weather's often cold in the North and windy in the East.\", 5.5"],
  ['  say', "\"It's often wet in the West and sometimes warm in the South.\", 5"],
  ['  broadcast', '"4"'],
  ['}', '']
]

const weatherggggStageCodeLines: CodeLine[] = []

const niuRunEditorData: EditorProjectData = {
  sprites: niuRunSprites.value,
  costumes: niuRunCostumes,
  animations: niuRunAnimations,
  backdrops: niuRunBackdrops,
  sounds: niuRunSounds,
  widgets: defaultWidgets,
  codeLines: niuRunCodeLines,
  stageCodeLines: niuRunStageCodeLines,
  physicsEnabled: true,
  layerSorting: 'vertical'
}

const weatherggggEditorData: EditorProjectData = {
  sprites: weatherggggSprites.value,
  costumes: weatherggggCostumes,
  animations: weatherggggAnimations,
  backdrops: weatherggggBackdrops,
  sounds: [],
  widgets: defaultWidgets,
  codeLines: weatherggggCodeLines,
  stageCodeLines: weatherggggStageCodeLines,
  physicsEnabled: false,
  layerSorting: 'default'
}

const editorProjectData = computed(() => (project.value.name === 'weathergggg' ? weatherggggEditorData : niuRunEditorData))
const sprites = computed(() => editorProjectData.value.sprites)
const costumes = computed(() => editorProjectData.value.costumes)
const animations = computed(() => editorProjectData.value.animations)
const backdrops = computed(() => editorProjectData.value.backdrops)
const sounds = computed(() => editorProjectData.value.sounds)
const widgets = computed(() => editorProjectData.value.widgets)
const codeLines = computed(() => editorProjectData.value.codeLines)
const stageCodeLines = computed(() => editorProjectData.value.stageCodeLines)

const selectedCostume = computed(() => costumes.value.find((costume) => costume.id === selectedCostumeId.value) ?? costumes.value[0])
const costumeMenuCostume = computed(() => costumes.value.find((costume) => costume.id === costumeMenuOpenFor.value) ?? null)
const selectedAnimation = computed(() => {
  editorRevision.value
  return animations.value.find((animation) => animation.id === selectedAnimationId.value) ?? animations.value[0] ?? null
})
const animationMenuAnimation = computed(() => animations.value.find((animation) => animation.id === animationMenuOpenFor.value) ?? null)
const selectedBackdrop = computed(() => backdrops.value.find((backdrop) => backdrop.id === selectedBackdropId.value) ?? backdrops.value[0])
const selectedSound = computed(() => sounds.value.find((sound) => sound.id === selectedSoundId.value) ?? sounds.value[0] ?? null)
const selectedSoundEdit = computed(() => (selectedSound.value == null ? null : getSoundEditState(selectedSound.value.id)))
const selectedSoundEditing = computed(() => {
  const edit = selectedSoundEdit.value
  if (edit == null) return false
  return edit.left !== edit.savedLeft || edit.right !== edit.savedRight || edit.gain !== edit.savedGain
})
const selectedSoundDuration = computed(() => {
  const sound = selectedSound.value
  const edit = selectedSoundEdit.value
  if (sound == null || edit == null) return ''
  const duration = Number.parseFloat(sound.duration)
  if (!Number.isFinite(duration)) return sound.duration
  return `${Math.max(0.01, duration * (edit.right - edit.left)).toFixed(2)}s`
})
const soundWaveformRangeStyle = computed<CSSProperties>(() => {
  const edit = selectedSoundEdit.value ?? createSoundEditState()
  return {
    '--sound-range-left': `${edit.left * 100}%`,
    '--sound-range-right': `${(1 - edit.right) * 100}%`
  }
})
const soundVolumeStyle = computed<CSSProperties>(() => {
  const edit = selectedSoundEdit.value ?? createSoundEditState()
  return { '--sound-gain': `${edit.gain * 100}%` }
})
const selectedWidget = computed(() => widgets.value.find((widget) => widget.id === selectedWidgetId.value) ?? widgets.value[0])

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

const quickConfigTools: Array<{ id: QuickConfigType; label: string; icon: string }> = [
  { id: 'position', label: 'Position', icon: positionQuickIcon },
  { id: 'rotation', label: 'Rotation', icon: rotateQuickIcon },
  { id: 'size', label: 'Size', icon: resizeQuickIcon },
  { id: 'layer', label: 'Layer order', icon: layerQuickIcon }
]

const selectedSprite = computed(() => sprites.value.find((sprite) => sprite.id === selectedSpriteId.value) ?? sprites.value[0])
const selectedMapSprite = computed(() => sprites.value.find((sprite) => sprite.id === selectedMapSpriteId.value) ?? sprites.value[0])
const spriteMenuSprite = computed(() => sprites.value.find((sprite) => sprite.id === spriteMenuOpenFor.value))
const visibleSnippetGroups = computed(() => categorySnippetGroups[activeCodeCategory.value])
const stageBackdrop = computed(() => selectedBackdrop.value?.image ?? project.value.thumbnail)
const stageCompanionSprite = computed(() => sprites.value.find((sprite) => sprite.id !== selectedSprite.value?.id))
const stageCompanionSprites = computed(() => sprites.value.filter((sprite) => !sprite.hidden && sprite.id !== selectedSprite.value?.id))
const mainCodeDocumentTab = computed<CodeDocumentTab>(() => {
  if (activeEditorTarget.value === 'stage') {
    return {
      id: 'stage',
      label: 'Stage code',
      image: stageBackdrop.value,
      active: true,
      kind: 'stage'
    }
  }
  return {
    id: selectedSprite.value?.id ?? 'sprite',
    label: `${selectedSprite.value?.name ?? 'Sprite'} code`,
    image: selectedSprite.value?.image ?? project.value.thumbnail,
    active: true,
    kind: 'sprite',
    spriteId: selectedSprite.value?.id
  }
})
const tempCodeDocumentTabs = computed<CodeDocumentTab[]>(() => {
  if (!tempCodeDocumentsOpen.value) return []
  const tabs: CodeDocumentTab[] = []
  const companion = stageCompanionSprite.value
  if (activeEditorTarget.value !== 'stage') {
    tabs.push({
      id: 'stage',
      label: 'Stage code',
      image: stageBackdrop.value,
      active: false,
      kind: 'stage'
    })
  }
  if (companion != null && companion.id !== selectedSprite.value?.id) {
    tabs.push({
      id: companion.id,
      label: `${companion.name} code`,
      image: companion.image,
      active: false,
      kind: 'sprite',
      spriteId: companion.id
    })
  }
  return tabs
})
const selectedSpriteFrameStyle = computed(() => getStageSpriteFrameStyle(selectedSprite.value))
const selectedSpriteCoordinate = computed(() => `${selectedSprite.value?.x ?? -224}, ${selectedSprite.value?.y ?? 74}`)
const selectedMapSpriteCoordinate = computed(() => `${selectedMapSprite.value?.x ?? -224}, ${selectedMapSprite.value?.y ?? 74}`)
const codeEditorStyle = computed<CSSProperties>(() => ({
  '--prototype-code-zoom': codeZoom.value
}))
const mapWorkspaceStyle = computed(() => ({ backgroundImage: `url(${stageBgUrl})` }))
const mapStageStyle = computed(() => ({ backgroundImage: `url(${stageBackdrop.value})` }))
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

function syncProjectSelection(data: EditorProjectData) {
  selectedSpriteId.value = data.sprites[0]?.id ?? ''
  selectedMapSpriteId.value = data.sprites[0]?.id ?? ''
  selectedCostumeId.value = data.costumes[0]?.id ?? ''
  selectedAnimationId.value = data.animations[0]?.id ?? ''
  selectedBackdropId.value = data.backdrops[0]?.id ?? ''
  selectedSoundId.value = data.sounds[0]?.id ?? ''
  selectedWidgetId.value = data.widgets[0]?.id ?? ''
  mapPhysicsEnabled.value = data.physicsEnabled
  mapLayerSorting.value = data.layerSorting
}

watch(
  project,
  (nextProject) => {
    projectDisplayName.value = nextProject.title
    draftProjectDisplayName.value = nextProject.title
    syncProjectSelection(editorProjectData.value)
  },
  { immediate: true }
)

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
    { id: 'publish-project', label: 'Publish project...', icon: publishIcon, action: openPublishModal },
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

type SnippetDragState = {
  pointerId: number
  startX: number
  scrollLeft: number
  target: HTMLElement
  dragged: boolean
}

let snippetDragState: SnippetDragState | null = null

function startSnippetHorizontalDrag(event: PointerEvent) {
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (target.scrollWidth <= target.clientWidth) return
  snippetDragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    scrollLeft: target.scrollLeft,
    target,
    dragged: false
  }
  target.classList.add('dragging')
  target.setPointerCapture?.(event.pointerId)
}

function moveSnippetHorizontalDrag(event: PointerEvent) {
  const dragState = snippetDragState
  if (dragState == null || dragState.pointerId !== event.pointerId) return
  const deltaX = event.clientX - dragState.startX
  if (Math.abs(deltaX) > 2) dragState.dragged = true
  dragState.target.scrollLeft = dragState.scrollLeft - deltaX
  if (dragState.dragged) event.preventDefault()
}

function endSnippetHorizontalDrag(event: PointerEvent) {
  const dragState = snippetDragState
  if (dragState == null || dragState.pointerId !== event.pointerId) return
  if (dragState.target.hasPointerCapture?.(event.pointerId)) {
    dragState.target.releasePointerCapture(event.pointerId)
  }
  dragState.target.classList.remove('dragging')
  snippetDragState = null
}

function selectSprite(id = selectedSpriteId.value) {
  activeEditorTarget.value = 'sprite'
  selectedSpriteId.value = id
  spriteMenuOpenFor.value = null
  activeQuickConfig.value = 'default'
}

function selectStage(tab: StageTab = 'code') {
  activeEditorTarget.value = 'stage'
  activeStageTab.value = tab
}

function openCodeDocumentTab(tab: CodeDocumentTab) {
  if (tab.kind === 'stage') {
    selectStage('code')
    return
  }
  if (tab.spriteId == null) return
  selectSprite(tab.spriteId)
  activeEditorTab.value = 'code'
}

function closeTempCodeDocuments() {
  tempCodeDocumentsOpen.value = false
}

function selectEditMode(mode: EditMode) {
  activeEditMode.value = mode
  activeQuickConfig.value = 'default'
}

function openQuickConfig(type: QuickConfigType) {
  activeQuickConfig.value = type
}

function backToDefaultQuickConfig() {
  activeQuickConfig.value = 'default'
}

function selectedSpriteTransform(sprite: SpriteCard | undefined) {
  const size = (sprite?.size ?? 100) / 100
  const heading = sprite?.heading ?? 90
  const rotationStyle = sprite?.rotationStyle ?? 'normal'
  const rotation = rotationStyle === 'normal' ? heading - 90 : 0
  const flip = rotationStyle === 'left-right' && heading < 0 ? ' scaleX(-1)' : ''
  return `scale(${size}) rotate(${rotation}deg)${flip}`
}

function getStageSpriteFrameStyle(sprite: SpriteCard | undefined): CSSProperties {
  return {
    left: `${stageSpriteOrigin.left + (sprite?.x ?? 0) * stageSpriteScale}px`,
    top: `${stageSpriteOrigin.top - (sprite?.y ?? 0) * stageSpriteScale}px`,
    transform: selectedSpriteTransform(sprite)
  }
}

function getMapSpriteFrameStyle(sprite: SpriteCard): CSSProperties {
  return {
    left: `${((sprite.x + mapWidth.value / 2) / mapWidth.value) * 100}%`,
    top: `${((mapHeight.value / 2 - sprite.y) / mapHeight.value) * 100}%`
  }
}

function updateSelectedSpriteSize(event: Event) {
  const nextSize = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(nextSize) || selectedSprite.value == null) return
  selectedSprite.value.size = Math.max(1, Math.min(400, Math.round(nextSize)))
  markPrototypeAction()
}

function updateSelectedSpriteX(event: Event) {
  const nextX = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(nextX) || selectedSprite.value == null) return
  selectedSprite.value.x = Math.max(-999, Math.min(999, Math.round(nextX)))
  markPrototypeAction()
}

function updateSelectedSpriteY(event: Event) {
  const nextY = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(nextY) || selectedSprite.value == null) return
  selectedSprite.value.y = Math.max(-999, Math.min(999, Math.round(nextY)))
  markPrototypeAction()
}

function updateSelectedMapSpriteX(event: Event) {
  const nextX = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(nextX) || selectedMapSprite.value == null) return
  selectedMapSprite.value.x = Math.max(-999, Math.min(999, Math.round(nextX)))
  markPrototypeAction()
}

function updateSelectedMapSpriteY(event: Event) {
  const nextY = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(nextY) || selectedMapSprite.value == null) return
  selectedMapSprite.value.y = Math.max(-999, Math.min(999, Math.round(nextY)))
  markPrototypeAction()
}

function updateSelectedSpriteHeading(event: Event) {
  const nextHeading = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(nextHeading) || selectedSprite.value == null) return
  selectedSprite.value.heading = Math.max(-180, Math.min(180, Math.round(nextHeading)))
  markPrototypeAction()
}

function updateSelectedSpriteRotationStyle(style: RotationStyle) {
  const sprite = selectedSprite.value
  if (sprite == null) return
  sprite.rotationStyle = style
  if (style === 'none') {
    sprite.heading = 90
  } else if (style === 'left-right') {
    sprite.heading = sprite.heading >= 0 ? 90 : -90
  }
  markPrototypeAction()
}

function updateSelectedSpriteLeftRight(direction: 'left' | 'right') {
  if (selectedSprite.value == null) return
  selectedSprite.value.heading = direction === 'right' ? 90 : -90
  markPrototypeAction()
}

function startStageSpriteDrag(sprite: SpriteCard, event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return
  selectedSpriteId.value = sprite.id
  activeEditorTarget.value = 'sprite'
  stageSpriteDragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    spriteStartX: sprite.x,
    spriteStartY: sprite.y,
    sprite,
    moved: false
  }
  target.setPointerCapture?.(event.pointerId)
  target.classList.add('dragging')
}

function moveStageSpriteDrag(event: PointerEvent) {
  const dragState = stageSpriteDragState
  if (dragState == null || dragState.pointerId !== event.pointerId) return
  const deltaX = event.clientX - dragState.startX
  const deltaY = event.clientY - dragState.startY
  if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) dragState.moved = true
  dragState.sprite.x = Math.max(-999, Math.min(999, Math.round(dragState.spriteStartX + deltaX / stageSpriteScale)))
  dragState.sprite.y = Math.max(-999, Math.min(999, Math.round(dragState.spriteStartY - deltaY / stageSpriteScale)))
  event.preventDefault()
}

function endStageSpriteDrag(event: PointerEvent) {
  const dragState = stageSpriteDragState
  if (dragState == null || dragState.pointerId !== event.pointerId) return
  const target = event.currentTarget
  if (target instanceof HTMLElement && target.hasPointerCapture?.(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
  if (target instanceof HTMLElement) target.classList.remove('dragging')
  if (dragState.moved) markPrototypeAction()
  stageSpriteDragState = null
}

function startMapSpriteDrag(sprite: SpriteCard, event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return
  const stage = target.closest<HTMLElement>('.map-stage')
  if (stage == null) return
  const rect = stage.getBoundingClientRect()
  selectedMapSpriteId.value = sprite.id
  mapSpriteConfigExpanded.value = true
  mapSpriteDragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    spriteStartX: sprite.x,
    spriteStartY: sprite.y,
    stageWidth: rect.width,
    stageHeight: rect.height,
    sprite,
    moved: false
  }
  target.setPointerCapture?.(event.pointerId)
  target.classList.add('dragging')
}

function moveMapSpriteDrag(event: PointerEvent) {
  const dragState = mapSpriteDragState
  if (dragState == null || dragState.pointerId !== event.pointerId) return
  const deltaX = event.clientX - dragState.startX
  const deltaY = event.clientY - dragState.startY
  if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) dragState.moved = true
  dragState.sprite.x = Math.max(-999, Math.min(999, Math.round(dragState.spriteStartX + (deltaX / dragState.stageWidth) * mapWidth.value)))
  dragState.sprite.y = Math.max(-999, Math.min(999, Math.round(dragState.spriteStartY - (deltaY / dragState.stageHeight) * mapHeight.value)))
  event.preventDefault()
}

function endMapSpriteDrag(event: PointerEvent) {
  const dragState = mapSpriteDragState
  if (dragState == null || dragState.pointerId !== event.pointerId) return
  const target = event.currentTarget
  if (target instanceof HTMLElement && target.hasPointerCapture?.(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
  if (target instanceof HTMLElement) target.classList.remove('dragging')
  if (dragState.moved) markPrototypeAction()
  mapSpriteDragState = null
}

function moveSelectedSpriteLayer(direction: 'up' | 'top' | 'down' | 'bottom') {
  const sprite = selectedSprite.value
  if (sprite == null) return
  const index = sprites.value.findIndex((item) => item.id === sprite.id)
  if (index < 0) return
  const [item] = sprites.value.splice(index, 1)
  if (direction === 'top') {
    sprites.value.push(item)
  } else if (direction === 'bottom') {
    sprites.value.unshift(item)
  } else if (direction === 'up') {
    sprites.value.splice(Math.min(index + 1, sprites.value.length), 0, item)
  } else {
    sprites.value.splice(Math.max(index - 1, 0), 0, item)
  }
  activeQuickConfig.value = 'default'
  markPrototypeAction()
}

function selectMapSprite(spriteId: string) {
  selectedMapSpriteId.value = spriteId
  mapSpriteConfigExpanded.value = true
}

function updateMapSpriteRotationStyle(style: RotationStyle) {
  const sprite = selectedMapSprite.value
  if (sprite == null) return
  sprite.rotationStyle = style
  if (style === 'none') {
    sprite.heading = 90
  } else if (style === 'left-right') {
    sprite.heading = sprite.heading >= 0 ? 90 : -90
  }
  markPrototypeAction()
}

function updateMapSpriteVisibility(visible: boolean) {
  const sprite = selectedMapSprite.value
  if (sprite == null) return
  sprite.hidden = !visible
  markPrototypeAction()
}

function toggleMapSpritePhysicsFlag(flag: string) {
  const flags = new Set(mapSpritePhysicsFlags.value)
  if (flags.has(flag)) {
    flags.delete(flag)
  } else {
    flags.add(flag)
    if (flag === 'Gravity') flags.add('Collision')
    if (flag === 'Immovable') {
      flags.add('Collision')
      flags.delete('Gravity')
    }
  }
  mapSpritePhysicsFlags.value = Array.from(flags)
  markPrototypeAction()
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

function openPublishModal() {
  publishStatusMessage.value = ''
  publishModalOpen.value = true
}

function cancelPublishProject() {
  if (publishSubmitting.value) return
  publishModalOpen.value = false
}

function submitPublishProject() {
  if (publishSubmitting.value) return
  publishSubmitting.value = true
  publishTimer = window.setTimeout(() => {
    publishTimer = null
    publishSubmitting.value = false
    publishModalOpen.value = false
    publishStatusMessage.value = `Published ${projectDisplayName.value} to the local prototype.`
    simulateAutoSave()
  }, 700)
}

function toggleProfileMenu() {
  profileMenuOpen.value = !profileMenuOpen.value
}

function closeProfileMenu() {
  profileMenuOpen.value = false
}

async function handleProfileMenuItem(action: () => void | Promise<void>) {
  closeProfileMenu()
  await action()
}

function toggleProfileLanguage() {
  profileLanguage.value = profileLanguage.value === 'English' ? '中文' : 'English'
}

function openSignedInUserPage() {
  router.push('/user/qingqing')
}

function openSignedInUserProjects() {
  router.push('/user/qingqing/projects')
}

function signOutPrototypeUser() {
  router.push('/')
}

function toggleAddSpriteMenu() {
  addSpriteMenuOpen.value = !addSpriteMenuOpen.value
}

function closeAddSpriteMenu() {
  addSpriteMenuOpen.value = false
}

function getMenuPositionStyle(position: { top: number; left: number }): CSSProperties {
  return {
    top: `${position.top}px`,
    left: `${position.left}px`
  }
}

function getAddCostumeMenuStyle(): CSSProperties {
  return getMenuPositionStyle(addCostumeMenuPosition.value)
}

function updateAddCostumeMenuPosition(trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect()
  const menuWidth = 184
  const menuHeight = 44
  const viewportPadding = 8
  const left = Math.min(
    Math.max(viewportPadding, rect.left),
    Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding)
  )
  const top = Math.max(viewportPadding, rect.top - menuHeight - 8)
  addCostumeMenuPosition.value = { top, left }
}

function toggleAddCostumeMenu(event: MouseEvent) {
  const trigger = event.currentTarget
  if (!(trigger instanceof HTMLElement)) return
  updateAddCostumeMenuPosition(trigger)
  addCostumeMenuOpen.value = !addCostumeMenuOpen.value
}

function closeAddCostumeMenu() {
  addCostumeMenuOpen.value = false
}

function getCostumeMenuStyle(): CSSProperties {
  return getMenuPositionStyle(costumeMenuPosition.value)
}

function updateCostumeMenuPosition(trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect()
  const menuWidth = 184
  const viewportPadding = 8
  const left = Math.min(
    Math.max(viewportPadding, rect.right - menuWidth),
    Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding)
  )
  const top = Math.min(rect.bottom + 6, Math.max(viewportPadding, window.innerHeight - 164))
  costumeMenuPosition.value = { top, left }
}

function toggleCostumeMenu(costumeId: string, event: MouseEvent) {
  const trigger = event.currentTarget
  if (!(trigger instanceof HTMLElement)) return
  selectedCostumeId.value = costumeId
  if (costumeMenuOpenFor.value === costumeId) {
    closeCostumeMenu()
    return
  }
  updateCostumeMenuPosition(trigger)
  costumeMenuOpenFor.value = costumeId
}

function closeCostumeMenu() {
  costumeMenuOpenFor.value = null
}

function getAddAnimationMenuStyle(): CSSProperties {
  return getMenuPositionStyle(addAnimationMenuPosition.value)
}

function updateAddAnimationMenuPosition(trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect()
  const menuWidth = 240
  const menuHeight = 44
  const viewportPadding = 8
  const left = Math.min(
    Math.max(viewportPadding, rect.left),
    Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding)
  )
  const top = Math.max(viewportPadding, rect.top - menuHeight - 8)
  addAnimationMenuPosition.value = { top, left }
}

function toggleAddAnimationMenu(event: MouseEvent) {
  const trigger = event.currentTarget
  if (!(trigger instanceof HTMLElement)) return
  updateAddAnimationMenuPosition(trigger)
  addAnimationMenuOpen.value = !addAnimationMenuOpen.value
}

function closeAddAnimationMenu() {
  addAnimationMenuOpen.value = false
}

function handleGroupCostumesAsAnimation() {
  closeAddAnimationMenu()
  groupCostumesAsAnimation()
}

function getAnimationMenuStyle(): CSSProperties {
  return getMenuPositionStyle(animationMenuPosition.value)
}

function updateAnimationMenuPosition(trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect()
  const menuWidth = 184
  const viewportPadding = 8
  const left = Math.min(
    Math.max(viewportPadding, rect.right - menuWidth),
    Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding)
  )
  const top = Math.min(rect.bottom + 6, Math.max(viewportPadding, window.innerHeight - 164))
  animationMenuPosition.value = { top, left }
}

function toggleAnimationMenu(animationId: string, event: MouseEvent) {
  const trigger = event.currentTarget
  if (!(trigger instanceof HTMLElement)) return
  selectedAnimationId.value = animationId
  if (animationMenuOpenFor.value === animationId) {
    closeAnimationMenu()
    return
  }
  updateAnimationMenuPosition(trigger)
  animationMenuOpenFor.value = animationId
}

function closeAnimationMenu() {
  animationMenuOpenFor.value = null
}

function getSpriteMenuStyle(): CSSProperties {
  return {
    top: `${spriteMenuPosition.value.top}px`,
    left: `${spriteMenuPosition.value.left}px`
  }
}

function updateSpriteMenuPosition(trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect()
  const menuWidth = 184
  const viewportPadding = 8
  const left = Math.min(
    Math.max(viewportPadding, rect.right - menuWidth),
    Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding)
  )
  const top = Math.min(rect.bottom + 6, Math.max(viewportPadding, window.innerHeight - 220))
  spriteMenuPosition.value = { top, left }
}

function toggleSpriteMenu(spriteId: string, event: MouseEvent) {
  const trigger = event.currentTarget
  if (!(trigger instanceof HTMLElement)) return
  activeEditorTarget.value = 'sprite'
  selectedSpriteId.value = spriteId
  if (spriteMenuOpenFor.value === spriteId) {
    closeSpriteMenu()
    return
  }
  updateSpriteMenuPosition(trigger)
  spriteMenuOpenFor.value = spriteId
}

function createSpriteCard(source: string, name: string, image: string): SpriteCard {
  const sprite: SpriteCard = {
    id: `${source}-sprite-${Date.now()}`,
    name,
    shortName: name.length > 10 ? `${name.slice(0, 8)}...` : name,
    image,
    hidden: false,
    x: -224,
    y: 74,
    size: 100,
    heading: 90,
    rotationStyle: 'normal'
  }
  return sprite
}

function appendSprite(sprite: SpriteCard) {
  sprites.value.push(sprite)
  selectedSpriteId.value = sprite.id
  selectedMapSpriteId.value = sprite.id
  activeEditorTarget.value = 'sprite'
  markPrototypeAction()
}

function addLocalSprite(source: 'local' | 'library') {
  const nextIndex = sprites.value.length + 1
  const presets = {
    local: { name: `Local sprite ${nextIndex}`, image: niuXiaoQiUrl },
    library: { name: `Library sprite ${nextIndex}`, image: niuXiaoHuaUrl }
  }
  const preset = presets[source]
  appendSprite(createSpriteCard(source, preset.name, preset.image))
  closeAddSpriteMenu()
}

function openSpriteGenModal() {
  spriteGenModalOpen.value = true
  closeAddSpriteMenu()
}

function cancelSpriteGenModal() {
  spriteGenModalOpen.value = false
}

function addGeneratedSprite(result: SpriteGeneratorResult) {
  const nextIndex = sprites.value.length + 1
  const name = result.description !== '' ? result.description : result.candidate.name
  appendSprite(createSpriteCard('ai', `${name} ${nextIndex}`, result.candidate.image))
  spriteGenModalOpen.value = false
}

function groupCostumesAsAnimation() {
  const nextIndex = animations.value.length + 1
  const sourceFrames = costumes.value.map((costume) => costume.image)
  const fallbackFrame = selectedSprite.value?.image ?? project.value.thumbnail
  const frames = sourceFrames.length > 0 ? sourceFrames : [fallbackFrame]
  const animation: AssetItem = {
    id: `animation-${Date.now()}`,
    name: `animation${nextIndex}`,
    image: frames[0],
    frames: frames.length > 1 ? frames : [frames[0], frames[0]],
    duration: `${Math.max(0.2, frames.length * 0.2).toFixed(1)}s`,
    binding: '0',
    sound: 'None'
  }

  animations.value.push(animation)
  selectedAnimationId.value = animation.id
  editorRevision.value += 1
  activeEditorTarget.value = 'sprite'
  activeEditorTab.value = 'animations'
  closeAddAnimationMenu()
  markPrototypeAction()
}

function getUniqueAnimationName(baseName: string) {
  const existingNames = new Set(animations.value.map((animation) => animation.name))
  if (!existingNames.has(baseName)) return baseName
  let suffix = 2
  while (existingNames.has(`${baseName} ${suffix}`)) suffix += 1
  return `${baseName} ${suffix}`
}

function getUniqueCostumeName(baseName: string) {
  const existingNames = new Set(costumes.value.map((costume) => costume.name))
  if (!existingNames.has(baseName)) return baseName
  let suffix = 2
  while (existingNames.has(`${baseName} ${suffix}`)) suffix += 1
  return `${baseName} ${suffix}`
}

function addCostumeFromLocalFile() {
  const nextIndex = costumes.value.length + 1
  const sources = [niuXiaoQiUrl, niuXiaoHuaUrl, flowerUrl, tornadoUrl]
  const costume: AssetItem = {
    id: `local-costume-${Date.now()}`,
    name: getUniqueCostumeName(`Local costume ${nextIndex}`),
    image: sources[(nextIndex - 1) % sources.length]
  }
  costumes.value.push(costume)
  selectedCostumeId.value = costume.id
  closeAddCostumeMenu()
  markPrototypeAction()
}

function duplicateCostume(costume: AssetItem) {
  const copy: AssetItem = {
    ...costume,
    id: `${costume.id}-copy-${Date.now()}`,
    name: getUniqueCostumeName(`${costume.name} 2`),
    frames: costume.frames != null ? [...costume.frames] : undefined
  }
  const sourceIndex = costumes.value.findIndex((item) => item.id === costume.id)
  costumes.value.splice(sourceIndex >= 0 ? sourceIndex + 1 : costumes.value.length, 0, copy)
  selectedCostumeId.value = copy.id
  markPrototypeAction()
}

function renameCostume(costume: AssetItem) {
  const nextName = window.prompt('Rename costume', costume.name)?.trim()
  if (!nextName || nextName === costume.name) return
  costume.name = nextName
  markPrototypeAction()
}

function removeCostume(costume: AssetItem) {
  if (costumes.value.length <= 1) return
  const currentIndex = costumes.value.findIndex((item) => item.id === costume.id)
  if (currentIndex < 0) return
  costumes.value.splice(currentIndex, 1)
  const nextCostume = costumes.value[Math.min(currentIndex, costumes.value.length - 1)] ?? costumes.value[0]
  selectedCostumeId.value = nextCostume?.id ?? ''
  markPrototypeAction()
}

function handleCostumeMenuAction(action: (costume: AssetItem) => void) {
  const costume = costumeMenuCostume.value
  closeCostumeMenu()
  if (costume == null) return
  action(costume)
}

function duplicateAnimation(animation: AssetItem) {
  const copy: AssetItem = {
    ...animation,
    id: `${animation.id}-copy-${Date.now()}`,
    name: getUniqueAnimationName(`${animation.name} 2`),
    frames: [...(animation.frames ?? [animation.image])]
  }
  const sourceIndex = animations.value.findIndex((item) => item.id === animation.id)
  animations.value.splice(sourceIndex >= 0 ? sourceIndex + 1 : animations.value.length, 0, copy)
  selectedAnimationId.value = copy.id
  editorRevision.value += 1
  markPrototypeAction()
}

function renameAnimation(animation: AssetItem) {
  const nextName = window.prompt('Rename animation', animation.name)?.trim()
  if (!nextName || nextName === animation.name) return
  animation.name = nextName
  editorRevision.value += 1
  markPrototypeAction()
}

function requestRemoveAnimation(animation: AssetItem) {
  animationPendingRemoval.value = animation
  preserveRemovedAnimationFrames.value = false
}

function cancelRemoveAnimation() {
  animationPendingRemoval.value = null
  preserveRemovedAnimationFrames.value = false
}

function confirmRemoveAnimation() {
  const animation = animationPendingRemoval.value
  if (animation == null) return
  const currentIndex = animations.value.findIndex((item) => item.id === animation.id)
  if (currentIndex < 0) {
    cancelRemoveAnimation()
    return
  }
  if (preserveRemovedAnimationFrames.value) {
    const frames = animation.frames ?? [animation.image]
    frames.forEach((frame, index) => {
      costumes.value.push({
        id: `${animation.id}-frame-${index}-${Date.now()}`,
        name: getUniqueCostumeName(`${animation.name} ${index + 1}`),
        image: frame
      })
    })
  }
  animations.value.splice(currentIndex, 1)
  const nextAnimation = animations.value[Math.min(currentIndex, animations.value.length - 1)] ?? animations.value[0] ?? null
  selectedAnimationId.value = nextAnimation?.id ?? ''
  editorRevision.value += 1
  cancelRemoveAnimation()
  markPrototypeAction()
}

function handleAnimationMenuAction(action: (animation: AssetItem) => void) {
  const animation = animationMenuAnimation.value
  closeAnimationMenu()
  if (animation == null) return
  action(animation)
}

function closeSpriteMenu() {
  spriteMenuOpenFor.value = null
}

function zoomCodeEditor(direction: 'in' | 'out' | 'reset') {
  if (direction === 'reset') {
    codeZoom.value = 1
    return
  }
  const delta = direction === 'in' ? 0.1 : -0.1
  codeZoom.value = Math.min(1.4, Math.max(0.8, Number((codeZoom.value + delta).toFixed(2))))
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

function createSoundEditState(): SoundEditState {
  return {
    left: 0,
    right: 1,
    gain: 0.55,
    savedLeft: 0,
    savedRight: 1,
    savedGain: 0.55
  }
}

function getSoundEditState(soundId: string) {
  soundEditStates.value[soundId] ??= createSoundEditState()
  return soundEditStates.value[soundId]
}

function updateSelectedSoundRange(handle: 'left' | 'right', event: PointerEvent, waveform: Element | null) {
  const sound = selectedSound.value
  if (sound == null) return
  if (waveform == null) return
  const rect = waveform.getBoundingClientRect()
  const next = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const edit = getSoundEditState(sound.id)
  if (handle === 'left') {
    edit.left = Number(Math.min(next, edit.right - 0.05).toFixed(2))
  } else {
    edit.right = Number(Math.max(next, edit.left + 0.05).toFixed(2))
  }
}

function startSoundRangeDrag(handle: 'left' | 'right', event: PointerEvent) {
  const waveform = (event.currentTarget as HTMLElement).closest('.sound-waveform')
  updateSelectedSoundRange(handle, event, waveform)
  const move = (moveEvent: PointerEvent) => updateSelectedSoundRange(handle, moveEvent, waveform)
  const stop = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
    window.removeEventListener('pointercancel', stop)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', stop, { once: true })
  window.addEventListener('pointercancel', stop, { once: true })
}

function updateSelectedSoundGain(event: PointerEvent) {
  const sound = selectedSound.value
  if (sound == null) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  getSoundEditState(sound.id).gain = Number(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)).toFixed(2))
}

function resetSelectedSoundEdit() {
  const sound = selectedSound.value
  if (sound == null) return
  const edit = getSoundEditState(sound.id)
  edit.left = edit.savedLeft
  edit.right = edit.savedRight
  edit.gain = edit.savedGain
}

function saveSelectedSoundEdit() {
  const sound = selectedSound.value
  if (sound == null) return
  const edit = getSoundEditState(sound.id)
  edit.savedLeft = edit.left
  edit.savedRight = edit.right
  edit.savedGain = edit.gain
  markPrototypeAction()
}

function handleSpriteMenuAction(action: () => void) {
  action()
  closeSpriteMenu()
}

function handleOpenSpriteMenuAction(action: (sprite: SpriteCard) => void) {
  const sprite = spriteMenuSprite.value
  if (sprite == null) return
  handleSpriteMenuAction(() => action(sprite))
}

function toggleSpriteVisibility(sprite: SpriteCard) {
  sprite.hidden = !sprite.hidden
  markPrototypeAction()
}

function duplicateSprite(sprite: SpriteCard) {
  const copyIndex = sprites.value.filter((item) => item.name.startsWith(sprite.name)).length + 1
  const copy: SpriteCard = {
    ...sprite,
    id: `${sprite.id}-copy-${Date.now()}`,
    name: `${sprite.name} ${copyIndex}`,
    shortName: `${sprite.shortName} ${copyIndex}`,
    hidden: false
  }
  const sourceIndex = sprites.value.findIndex((item) => item.id === sprite.id)
  sprites.value.splice(sourceIndex >= 0 ? sourceIndex + 1 : sprites.value.length, 0, copy)
  selectedSpriteId.value = copy.id
  selectedMapSpriteId.value = copy.id
  markPrototypeAction()
}

async function renameSprite(sprite: SpriteCard) {
  spritePendingRename.value = sprite
  draftSpriteRenameName.value = sprite.name
  spriteRenameError.value = ''
  await nextTick()
  spriteRenameInputRef.value?.focus()
  spriteRenameInputRef.value?.select()
}

function cancelSpriteRename() {
  spritePendingRename.value = null
  draftSpriteRenameName.value = ''
  spriteRenameError.value = ''
}

function validateSpriteRename(nextName: string, sprite: SpriteCard) {
  if (nextName === '') return 'Name is required.'
  if (nextName !== sprite.name && sprites.value.some((item) => item.id !== sprite.id && item.name === nextName)) {
    return 'A sprite with this name already exists.'
  }
  return ''
}

function submitSpriteRename() {
  const sprite = spritePendingRename.value
  if (sprite == null) return
  const nextName = draftSpriteRenameName.value.trim()
  const error = validateSpriteRename(nextName, sprite)
  if (error !== '') {
    spriteRenameError.value = error
    return
  }
  if (nextName === sprite.name) {
    cancelSpriteRename()
    return
  }
  sprite.name = nextName
  sprite.shortName = nextName.length > 10 ? `${nextName.slice(0, 8)}...` : nextName
  cancelSpriteRename()
  markPrototypeAction()
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

function saveSpriteToLibrary(sprite: SpriteCard) {
  selectedSpriteId.value = sprite.id
  markPrototypeAction()
}

function removeSprite(sprite: SpriteCard) {
  if (sprites.value.length <= 1) return
  const currentIndex = sprites.value.findIndex((item) => item.id === sprite.id)
  if (currentIndex < 0) return
  sprites.value.splice(currentIndex, 1)
  const nextSprite = sprites.value[Math.min(currentIndex, sprites.value.length - 1)] ?? sprites.value[0]
  selectedSpriteId.value = nextSprite?.id ?? ''
  selectedMapSpriteId.value = nextSprite?.id ?? ''
  markPrototypeAction()
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Node)) return
  if (!projectMenuRef.value?.contains(target)) closeProjectMenu()
  if (!profileMenuRef.value?.contains(target)) closeProfileMenu()
  if (!addSpriteMenuRef.value?.contains(target) && !mapAddSpriteMenuRef.value?.contains(target)) closeAddSpriteMenu()
  if (!addCostumeMenuRef.value?.contains(target) && !(target instanceof Element && target.closest('.costume-add-menu'))) {
    closeAddCostumeMenu()
  }
  if (!costumeMenuRef.value?.contains(target) && !(target instanceof Element && target.closest('.costume-options-menu'))) {
    closeCostumeMenu()
  }
  if (!addAnimationMenuRef.value?.contains(target) && !(target instanceof Element && target.closest('.animation-add-menu'))) {
    closeAddAnimationMenu()
  }
  if (!animationMenuRef.value?.contains(target) && !(target instanceof Element && target.closest('.animation-options-menu'))) {
    closeAnimationMenu()
  }
  if (!spriteMenuRef.value?.contains(target) && !(target instanceof Element && target.closest('.sprite-options-menu'))) {
    closeSpriteMenu()
  }
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
  snippetDragState?.target.classList.remove('dragging')
  snippetDragState = null
  if (publishTimer != null) window.clearTimeout(publishTimer)
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
            <span class="project-file-icon" aria-hidden="true" v-html="projectFileIcon"></span>
            <span class="project-menu-arrow" aria-hidden="true" v-html="arrowMiniIcon"></span>
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
                <UITag v-if="item.badge">{{ item.badge }}</UITag>
              </button>
            </div>
          </div>
        </div>
        <RouterLink class="flex h-full items-center px-3 text-grey-1000 hover:bg-grey-400" to="/tutorials" aria-label="Tutorials" title="Tutorials">
          <span class="block h-5 w-5 [&_svg]:block [&_svg]:h-5 [&_svg]:w-5" v-html="tutorialIcon"></span>
        </RouterLink>
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
          <span class="project-name-edit-icon" v-html="editIcon"></span>
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
        <div class="mode-button-group" role="group" aria-label="Editor mode">
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
        </div>
        <div ref="profileMenuRef" class="profile-dropdown">
          <button
            class="profile-trigger"
            type="button"
            aria-label="User profile menu"
            :aria-expanded="profileMenuOpen"
            aria-haspopup="menu"
            @click.stop="toggleProfileMenu"
          >
            <img class="profile" src="@ui-images/avatar.png" alt="" />
          </button>
          <div v-if="profileMenuOpen" class="profile-menu" role="menu" @click.stop>
            <div class="profile-menu-group">
              <div class="profile-menu-user" role="presentation">Qingqing</div>
              <button class="profile-menu-item" type="button" role="menuitem" @click="handleProfileMenuItem(toggleProfileLanguage)">
                <span>Language</span>
                <UITag>{{ profileLanguage }}</UITag>
              </button>
            </div>
            <div class="profile-menu-group">
              <button class="profile-menu-item" type="button" role="menuitem" @click="handleProfileMenuItem(openSignedInUserPage)">
                Profile
              </button>
              <button class="profile-menu-item" type="button" role="menuitem" @click="handleProfileMenuItem(openSignedInUserProjects)">
                Projects
              </button>
            </div>
            <div class="profile-menu-group">
              <button class="profile-menu-item" type="button" role="menuitem" @click="handleProfileMenuItem(signOutPrototypeUser)">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <section v-if="activeEditMode === 'default'" class="editor-main">
      <section class="code-card">
        <header class="code-tabs flex h-[47px] items-end overflow-hidden border-b border-grey-400 px-2">
          <UITabs
            v-if="activeEditorTarget === 'sprite'"
            class="h-full flex-1 gap-6"
            :value="activeEditorTab"
            @update:value="(tab) => selectEditorTab(tab as EditorTab)"
          >
            <UITab value="code">Code</UITab>
            <UITab value="costumes">Costumes</UITab>
            <UITab value="animations">Animations</UITab>
          </UITabs>
          <UITabs
            v-else
            class="h-full flex-1 gap-6"
            :value="activeStageTab"
            @update:value="(tab) => selectStage(tab as StageTab)"
          >
            <UITab value="code">Code</UITab>
            <UITab value="backdrops">Backdrops</UITab>
            <UITab value="sounds">Sounds</UITab>
            <UITab value="widgets">Widgets</UITab>
          </UITabs>
          <UIButton
            v-if="activeEditorTarget === 'sprite' ? activeEditorTab === 'code' : activeStageTab === 'code'"
            class="format-button"
            type="white"
            size="medium"
          >
            Format
          </UIButton>
        </header>

        <div v-if="activeEditorTarget === 'sprite' && activeEditorTab === 'code'" class="code-body">
          <aside class="category-rail flex flex-none flex-col gap-3 border-r border-grey-400 px-1 py-3" aria-label="Code categories">
            <button
              v-for="category in codeCategories"
              :key="category.id"
              class="category flex h-13 w-13 cursor-pointer flex-col items-center justify-center rounded-md border-0 text-2xs transition-colors duration-100"
              :class="activeCodeCategory === category.id ? 'bg-grey-400 text-grey-1000' : 'bg-transparent text-grey-800 hover:bg-grey-300'"
              type="button"
              @click="selectCodeCategory(category.id)"
            >
              <span class="block h-6 w-6" aria-hidden="true" v-html="category.icon"></span>
              <span class="mt-0.5 text-center text-[10px]/4">{{ category.label }}</span>
            </button>
          </aside>

          <aside
            class="events-list"
            aria-label="Event snippets"
            @pointerdown="startSnippetHorizontalDrag"
            @pointermove="moveSnippetHorizontalDrag"
            @pointerup="endSnippetHorizontalDrag"
            @pointercancel="endSnippetHorizontalDrag"
          >
            <section v-for="group in visibleSnippetGroups" :key="group.title" class="event-group">
              <h3>{{ group.title }}</h3>
              <button v-for="item in group.items" :key="item.id" class="event-snippet" type="button">
                <span v-for="(part, index) in item.parts" :key="`${item.id}-${index}`" :class="getCodeTokenClass(part.type)">
                  {{ part.text }}
                </span>
              </button>
            </section>
          </aside>

          <section class="code-editor" :style="codeEditorStyle" aria-label="Sprite code editor">
            <div v-for="(line, index) in codeLines" :key="index" class="code-line">
              <span class="line-number">{{ index + 1 }}</span>
              <span class="text-[#b08a01]">{{ line[0] }}</span>
              <span class="source-content">
                <span v-for="(part, partIndex) in getSourceParts(line[1])" :key="`${index}-${partIndex}`" :class="getCodeTokenClass(part.type)">
                  {{ part.text }}
                </span>
              </span>
            </div>
            <aside class="code-side-tools" aria-label="Code document navigation">
              <div class="code-document-tabs">
                <button
                  class="code-document-tab active"
                  type="button"
                  :aria-label="mainCodeDocumentTab.label"
                  :title="mainCodeDocumentTab.label"
                  @click="openCodeDocumentTab(mainCodeDocumentTab)"
                >
                  <img :src="mainCodeDocumentTab.image" :alt="mainCodeDocumentTab.label" />
                </button>
                <template v-if="tempCodeDocumentTabs.length > 0">
                  <div class="code-document-divider" aria-hidden="true"></div>
                  <div class="code-document-temp-tabs">
                    <button
                      v-for="tab in tempCodeDocumentTabs"
                      :key="tab.id"
                      class="code-document-tab"
                      type="button"
                      :aria-label="tab.label"
                      :title="tab.label"
                      @click="openCodeDocumentTab(tab)"
                    >
                      <img :src="tab.image" :alt="tab.label" />
                    </button>
                  </div>
                  <button
                    class="code-document-close"
                    type="button"
                    aria-label="Close temporary code previews"
                    title="Close temporary code previews"
                    @click="closeTempCodeDocuments"
                    v-html="closeCircleIcon"
                  ></button>
                </template>
              </div>
              <div class="zoom-tools">
                <button type="button" aria-label="Zoom in" title="Zoom in" @click="zoomCodeEditor('in')" v-html="zoomInIcon"></button>
                <button type="button" aria-label="Zoom out" title="Zoom out" @click="zoomCodeEditor('out')" v-html="zoomOutIcon"></button>
                <button type="button" aria-label="Reset zoom" title="Reset zoom" @click="zoomCodeEditor('reset')" v-html="zoomResetIcon"></button>
              </div>
            </aside>
          </section>
        </div>

        <div v-else-if="activeEditorTarget === 'sprite' && activeEditorTab === 'costumes'" class="asset-editor-body">
          <aside class="asset-editor-list" aria-label="Costumes list">
            <div
              v-for="costume in costumes"
              :key="costume.id"
              class="editor-asset-item"
              :class="{ active: selectedCostumeId === costume.id, 'costume-asset-item': true }"
            >
              <button class="asset-select-button" type="button" @click="selectedCostumeId = costume.id">
                <img :src="costume.image" :alt="costume.name" />
                <span class="asset-item-title">{{ costume.name }}</span>
              </button>
              <button
                v-if="selectedCostumeId === costume.id"
                class="asset-item-menu"
                type="button"
                aria-label="Costume options"
                :aria-expanded="costumeMenuOpenFor === costume.id"
                aria-haspopup="menu"
                @click.stop="toggleCostumeMenu(costume.id, $event)"
                v-html="moreIcon"
              ></button>
            </div>
            <Teleport to="body">
              <div
                v-if="costumeMenuCostume != null"
                ref="costumeMenuRef"
                class="costume-options-menu asset-options-menu"
                :style="getCostumeMenuStyle()"
                role="menu"
                @click.stop
              >
                <button class="asset-options-item" type="button" role="menuitem" @click="handleCostumeMenuAction(duplicateCostume)">
                  Duplicate
                </button>
                <button class="asset-options-item" type="button" role="menuitem" @click="handleCostumeMenuAction(renameCostume)">
                  Rename
                </button>
                <button
                  class="asset-options-item danger"
                  type="button"
                  role="menuitem"
                  :disabled="costumes.length <= 1"
                  @click="handleCostumeMenuAction(removeCostume)"
                >
                  Remove
                </button>
              </div>
            </Teleport>
            <button
              ref="addCostumeMenuRef"
              class="asset-add-button"
              type="button"
              aria-label="Add costume"
              :aria-expanded="addCostumeMenuOpen"
              aria-haspopup="menu"
              @click.stop="toggleAddCostumeMenu"
            >
              +
            </button>
            <Teleport to="body">
              <div v-if="addCostumeMenuOpen" class="costume-add-menu asset-add-menu" :style="getAddCostumeMenuStyle()" role="menu" @click.stop>
                <button class="asset-add-menu-item" type="button" role="menuitem" @click="addCostumeFromLocalFile">
                  Select local file
                </button>
              </div>
            </Teleport>
          </aside>
          <section class="asset-detail" aria-label="Costume detail">
            <header class="asset-detail-header">
              <h2>{{ selectedCostume.name }}</h2>
              <button type="button" aria-label="Rename costume" @click="renameCostume(selectedCostume)" v-html="editIcon"></button>
            </header>
            <div class="costume-preview">
              <img :src="selectedCostume.image" :alt="selectedCostume.name" />
            </div>
          </section>
        </div>

        <div v-else-if="activeEditorTarget === 'sprite'" class="asset-editor-body">
          <aside class="asset-editor-list" aria-label="Animations list">
            <div
              v-for="animation in animations"
              :key="animation.id"
              class="editor-asset-item"
              :class="{ active: selectedAnimationId === animation.id, 'animation-asset-item': true }"
            >
              <button class="asset-select-button" type="button" @click="selectedAnimationId = animation.id">
                <img :src="animation.image" :alt="animation.name" />
                <span class="asset-item-title">{{ animation.name }}</span>
              </button>
              <button
                v-if="selectedAnimationId === animation.id"
                class="asset-item-menu"
                type="button"
                aria-label="Animation options"
                :aria-expanded="animationMenuOpenFor === animation.id"
                aria-haspopup="menu"
                @click.stop="toggleAnimationMenu(animation.id, $event)"
                v-html="moreIcon"
              ></button>
            </div>
            <Teleport to="body">
              <div
                v-if="animationMenuAnimation != null"
                ref="animationMenuRef"
                class="animation-options-menu"
                :style="getAnimationMenuStyle()"
                role="menu"
                @click.stop
              >
                <button class="animation-options-item" type="button" role="menuitem" @click="handleAnimationMenuAction(duplicateAnimation)">
                  Duplicate
                </button>
                <button class="animation-options-item" type="button" role="menuitem" @click="handleAnimationMenuAction(renameAnimation)">
                  Rename
                </button>
                <button class="animation-options-item danger" type="button" role="menuitem" @click="handleAnimationMenuAction(requestRemoveAnimation)">
                  Remove
                </button>
              </div>
            </Teleport>
            <button
              ref="addAnimationMenuRef"
              class="asset-add-button"
              type="button"
              aria-label="Add animation"
              :aria-expanded="addAnimationMenuOpen"
              aria-haspopup="menu"
              @click.stop="toggleAddAnimationMenu"
            >
              +
            </button>
            <Teleport to="body">
              <div v-if="addAnimationMenuOpen" class="animation-add-menu" :style="getAddAnimationMenuStyle()" role="menu" @click.stop>
                <button class="animation-add-menu-item" type="button" role="menuitem" @click="handleGroupCostumesAsAnimation">
                  Group costumes as animation
                </button>
              </div>
            </Teleport>
          </aside>
          <section v-if="selectedAnimation != null" class="asset-detail" aria-label="Animation detail">
            <header class="asset-detail-header">
              <h2>{{ selectedAnimation.name }}</h2>
              <button type="button" aria-label="Rename animation" @click="renameAnimation(selectedAnimation)" v-html="editIcon"></button>
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
                  <span class="setting-icon" v-html="settingTimerIcon"></span>
                  <span>Duration</span>
                  <strong>{{ selectedAnimation.duration }}</strong>
                </button>
                <button class="animation-setting" type="button">
                  <span class="setting-icon" v-html="settingStatusIcon"></span>
                  <span>Binding</span>
                  <strong>{{ selectedAnimation.binding }}</strong>
                </button>
                <button class="animation-setting" type="button">
                  <span class="setting-icon" v-html="settingSoundIcon"></span>
                  <span>Sound</span>
                  <strong>{{ selectedAnimation.sound }}</strong>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div v-else-if="activeStageTab === 'code'" class="code-body">
          <aside class="category-rail flex flex-none flex-col gap-3 border-r border-grey-400 px-1 py-3" aria-label="Code categories">
            <button
              v-for="category in codeCategories"
              :key="`stage-${category.id}`"
              class="category flex h-13 w-13 cursor-pointer flex-col items-center justify-center rounded-md border-0 text-2xs transition-colors duration-100"
              :class="category.id === 'event' ? 'bg-grey-400 text-grey-1000' : 'bg-transparent text-grey-800 hover:bg-grey-300'"
              type="button"
            >
              <span class="block h-6 w-6" aria-hidden="true" v-html="category.icon"></span>
              <span class="mt-0.5 text-center text-[10px]/4">{{ category.label }}</span>
            </button>
          </aside>

          <aside
            class="events-list"
            aria-label="Stage snippets"
            @pointerdown="startSnippetHorizontalDrag"
            @pointermove="moveSnippetHorizontalDrag"
            @pointerup="endSnippetHorizontalDrag"
            @pointercancel="endSnippetHorizontalDrag"
          >
            <section class="event-group">
              <h3>Stage Events</h3>
              <button class="event-snippet" type="button">
                <span :class="getCodeTokenClass('function')">onBackdrop</span><span :class="getCodeTokenClass('hint')"> name:</span><span :class="getCodeTokenClass('string')">"backdrop"</span>
              </button>
              <button class="event-snippet" type="button"><span :class="getCodeTokenClass('function')">show</span></button>
              <button class="event-snippet" type="button"><span :class="getCodeTokenClass('function')">hide</span></button>
            </section>
          </aside>

          <section class="code-editor" :style="codeEditorStyle" aria-label="Stage code editor">
            <div v-if="stageCodeLines.length === 0" class="code-line">
              <span class="line-number">1</span>
              <span></span>
              <span></span>
            </div>
            <div v-for="(line, index) in stageCodeLines" v-else :key="index" class="code-line">
              <span class="line-number">{{ index + 1 }}</span>
              <span class="text-[#b08a01]">{{ line[0] }}</span>
              <span class="source-content">
                <span v-for="(part, partIndex) in getSourceParts(line[1])" :key="`stage-${index}-${partIndex}`" :class="getCodeTokenClass(part.type)">
                  {{ part.text }}
                </span>
              </span>
            </div>
            <aside class="code-side-tools" aria-label="Code document navigation">
              <div class="code-document-tabs">
                <button
                  class="code-document-tab active"
                  type="button"
                  :aria-label="mainCodeDocumentTab.label"
                  :title="mainCodeDocumentTab.label"
                  @click="openCodeDocumentTab(mainCodeDocumentTab)"
                >
                  <img :src="mainCodeDocumentTab.image" :alt="mainCodeDocumentTab.label" />
                </button>
                <template v-if="tempCodeDocumentTabs.length > 0">
                  <div class="code-document-divider" aria-hidden="true"></div>
                  <div class="code-document-temp-tabs">
                    <button
                      v-for="tab in tempCodeDocumentTabs"
                      :key="tab.id"
                      class="code-document-tab"
                      type="button"
                      :aria-label="tab.label"
                      :title="tab.label"
                      @click="openCodeDocumentTab(tab)"
                    >
                      <img :src="tab.image" :alt="tab.label" />
                    </button>
                  </div>
                  <button
                    class="code-document-close"
                    type="button"
                    aria-label="Close temporary code previews"
                    title="Close temporary code previews"
                    @click="closeTempCodeDocuments"
                    v-html="closeCircleIcon"
                  ></button>
                </template>
              </div>
              <div class="zoom-tools">
                <button type="button" aria-label="Zoom in" title="Zoom in" @click="zoomCodeEditor('in')" v-html="zoomInIcon"></button>
                <button type="button" aria-label="Zoom out" title="Zoom out" @click="zoomCodeEditor('out')" v-html="zoomOutIcon"></button>
                <button type="button" aria-label="Reset zoom" title="Reset zoom" @click="zoomCodeEditor('reset')" v-html="zoomResetIcon"></button>
              </div>
            </aside>
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
              <span class="asset-item-title">{{ backdrop.name }}</span>
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
              <span class="asset-item-title">{{ sound.name }}</span>
            </button>
            <button class="asset-add-button" type="button" aria-label="Add sound">+</button>
          </aside>
          <section v-if="selectedSound != null" class="asset-detail" aria-label="Sound detail">
            <header class="sound-detail-title">
              <div class="asset-detail-header">
                <h2>{{ selectedSound.name }}</h2>
                <button type="button" aria-label="Rename sound" v-html="editIcon"></button>
              </div>
              <div class="sound-duration">{{ selectedSoundDuration }}</div>
            </header>
            <div class="sound-detail">
              <div class="sound-waveform" :style="soundWaveformRangeStyle" aria-label="Sound waveform trim editor">
                <svg class="sound-waveform-canvas" viewBox="0 0 640 222" preserveAspectRatio="none">
                  <path class="waveform-shape" d="M0 111 C24 88 48 86 72 111 C96 136 120 132 144 111 C168 90 192 82 216 111 C240 140 264 136 288 111 C312 86 336 78 360 111 C384 144 408 139 432 111 C456 83 480 88 504 111 C528 134 552 126 576 111 C600 96 620 101 640 111 L640 111 C620 121 600 126 576 111 C552 96 528 88 504 111 C480 134 456 139 432 111 C408 83 384 78 360 111 C336 144 312 136 288 111 C264 86 240 82 216 111 C192 140 168 132 144 111 C120 90 96 86 72 111 C48 136 24 134 0 111 Z" />
                </svg>
                <div class="waveform-range-control">
                  <div class="waveform-shaded-area waveform-left-fixed"></div>
                  <div class="waveform-selection-area">
                    <button class="waveform-control-bar waveform-left-bar" type="button" aria-label="Trim sound start" @pointerdown.prevent="startSoundRangeDrag('left', $event)"></button>
                    <button class="waveform-control-bar waveform-right-bar" type="button" aria-label="Trim sound end" @pointerdown.prevent="startSoundRangeDrag('right', $event)"></button>
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
                  <div class="sound-slider-track" :style="soundVolumeStyle" role="slider" aria-label="Sound volume" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round((selectedSoundEdit?.gain ?? 0) * 100)" @pointerdown="updateSelectedSoundGain">
                    <span></span>
                  </div>
                  <svg class="sound-volume-icon" viewBox="0 0 24 24" fill="none">
                    <path d="M3.5 6.99989H5.26697C5.74097 6.99989 6.19906 6.83177 6.56006 6.52577L10.251 3.39882C11.336 2.47982 13.001 3.25099 13.001 4.67299V19.3268C13.001 20.7488 11.336 21.521 10.251 20.601L6.56006 17.474C6.19906 17.168 5.74097 16.9999 5.26697 16.9999H3.5C2.672 16.9999 2 16.3279 2 15.4999V8.50087C2 7.67187 2.672 6.99989 3.5 6.99989ZM16.767 16.7709C18.046 15.4979 18.75 13.8029 18.75 11.9999C18.75 10.1969 18.046 8.5019 16.767 7.2289C16.473 6.9369 15.9981 6.93685 15.7061 7.23085C15.4131 7.52385 15.415 7.99988 15.708 8.29188C16.702 9.28188 17.25 10.5999 17.25 12.0009C17.25 13.4019 16.702 14.7199 15.708 15.7099C15.415 16.0019 15.4131 16.4769 15.7061 16.7709C15.8521 16.9179 16.0451 16.9918 16.2371 16.9918C16.4291 16.9898 16.62 16.9169 16.767 16.7709ZM19.067 19.82C18.875 19.82 18.682 19.747 18.536 19.6C18.244 19.307 18.244 18.832 18.538 18.539C20.287 16.795 21.25 14.4729 21.25 11.9999C21.25 9.52689 20.287 7.20583 18.538 5.46083C18.244 5.16783 18.244 4.69279 18.536 4.39979C18.828 4.10679 19.303 4.10582 19.597 4.39882C21.63 6.42682 22.75 9.12689 22.75 11.9999C22.75 14.8729 21.63 17.573 19.597 19.601C19.45 19.747 19.259 19.82 19.067 19.82Z" fill="currentColor" />
                  </svg>
                </div>
                <div class="sound-controls-spacer"></div>
                <div v-if="selectedSoundEditing" class="sound-edit-actions">
                  <UIButton type="neutral" size="medium" @click="resetSelectedSoundEdit">Cancel</UIButton>
                  <UIButton type="primary" size="medium" @click="saveSelectedSoundEdit">Save</UIButton>
                </div>
              </div>
            </div>
          </section>
          <section v-else class="asset-detail empty-asset-detail" aria-label="Sound detail">No sounds</section>
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
              <span class="widget-icon" v-html="monitorWidgetIcon"></span>
              <span class="asset-item-title">{{ widget.name }}</span>
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
          <UICardHeader class="panel-header justify-between gap-3">
            <h2 class="m-0 flex-1 text-xl font-normal text-title">Preview</h2>
            <div class="panel-actions">
              <button class="run-button" type="button" @click="runProject">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z" /></svg>
                Run
              </button>
              <button class="publish-button" type="button" @click="openPublishModal">
                <span class="button-icon" aria-hidden="true" v-html="publishActionIcon"></span>
                Publish
              </button>
            </div>
          </UICardHeader>

          <div class="stage-frame">
            <template v-if="!runnerActive">
              <img class="stage-backdrop" :src="stageBackdrop" alt="" />
              <div
                v-for="sprite in stageCompanionSprites"
                :key="sprite.id"
                class="stage-sprite"
                :style="getStageSpriteFrameStyle(sprite)"
                role="button"
                tabindex="0"
                :aria-label="`Select ${sprite.name}`"
                @click="selectSprite(sprite.id)"
                @keydown.enter.prevent="selectSprite(sprite.id)"
                @keydown.space.prevent="selectSprite(sprite.id)"
                @pointerdown.stop.prevent="startStageSpriteDrag(sprite, $event)"
                @pointermove.stop.prevent="moveStageSpriteDrag"
                @pointerup.stop.prevent="endStageSpriteDrag"
                @pointercancel.stop.prevent="endStageSpriteDrag"
              >
                <img :src="sprite.image" alt="" />
              </div>
              <div
                v-if="selectedSprite != null"
                class="selected-sprite"
                :style="selectedSpriteFrameStyle"
                @pointerdown.stop.prevent="startStageSpriteDrag(selectedSprite, $event)"
                @pointermove.stop.prevent="moveStageSpriteDrag"
                @pointerup.stop.prevent="endStageSpriteDrag"
                @pointercancel.stop.prevent="endStageSpriteDrag"
              >
                <img :src="selectedSprite.image" alt="" />
                <span class="coordinate">{{ selectedSpriteCoordinate }}</span>
                <span class="handle left"></span>
                <span class="handle right"></span>
                <span class="corner bottom-left"></span>
                <span class="corner top-right"></span>
              </div>
              <div class="stage-tools" :class="{ expanded: activeQuickConfig !== 'default' }">
                <template v-if="activeQuickConfig === 'default'">
                  <button
                    v-for="tool in quickConfigTools"
                    :key="tool.id"
                    type="button"
                    :aria-label="tool.label"
                    @click="openQuickConfig(tool.id)"
                  >
                    <span v-html="tool.icon"></span>
                  </button>
                </template>
                <template v-else-if="activeQuickConfig === 'size' && selectedSprite != null">
                  <label class="quick-config-input">
                    <span>Size</span>
                    <input
                      :value="selectedSprite.size"
                      type="number"
                      inputmode="numeric"
                      min="1"
                      max="400"
                      aria-label="Size input"
                      @input="updateSelectedSpriteSize"
                    />
                    <span>%</span>
                  </label>
                  <span class="quick-config-divider" aria-hidden="true"></span>
                  <button class="quick-config-back" type="button" aria-label="Back" @click="backToDefaultQuickConfig">
                    <span v-html="backQuickIcon"></span>
                  </button>
                </template>
                <template v-else-if="activeQuickConfig === 'position' && selectedSprite != null">
                  <label class="quick-config-input position-input">
                    <span>X</span>
                    <input
                      :value="selectedSprite.x"
                      type="number"
                      inputmode="numeric"
                      min="-999"
                      max="999"
                      aria-label="X position input"
                      @input="updateSelectedSpriteX"
                    />
                  </label>
                  <label class="quick-config-input position-input">
                    <span>Y</span>
                    <input
                      :value="selectedSprite.y"
                      type="number"
                      inputmode="numeric"
                      min="-999"
                      max="999"
                      aria-label="Y position input"
                      @input="updateSelectedSpriteY"
                    />
                  </label>
                  <span class="quick-config-divider" aria-hidden="true"></span>
                  <button class="quick-config-back" type="button" aria-label="Back" @click="backToDefaultQuickConfig">
                    <span v-html="backQuickIcon"></span>
                  </button>
                </template>
                <template v-else-if="activeQuickConfig === 'rotation' && selectedSprite != null">
                  <div class="rotation-style-group" role="group" aria-label="Rotation style control">
                    <button
                      class="rotation-style-button"
                      :class="{ active: selectedSprite.rotationStyle === 'normal' }"
                      type="button"
                      aria-label="Normal rotation"
                      @click="updateSelectedSpriteRotationStyle('normal')"
                    >
                      <span v-html="rotateAroundIcon"></span>
                    </button>
                    <button
                      class="rotation-style-button"
                      :class="{ active: selectedSprite.rotationStyle === 'left-right' }"
                      type="button"
                      aria-label="Left-right rotation"
                      @click="updateSelectedSpriteRotationStyle('left-right')"
                    >
                      <span v-html="leftRightIcon"></span>
                    </button>
                    <button
                      class="rotation-style-button"
                      :class="{ active: selectedSprite.rotationStyle === 'none' }"
                      type="button"
                      aria-label="No rotation"
                      @click="updateSelectedSpriteRotationStyle('none')"
                    >
                      <span v-html="notRotateIcon"></span>
                    </button>
                  </div>
                  <label v-if="selectedSprite.rotationStyle === 'normal'" class="quick-config-input heading-input">
                    <span>Heading</span>
                    <input
                      :value="selectedSprite.heading"
                      type="number"
                      inputmode="numeric"
                      min="-180"
                      max="180"
                      aria-label="Heading input"
                      @input="updateSelectedSpriteHeading"
                    />
                  </label>
                  <div v-else-if="selectedSprite.rotationStyle === 'left-right'" class="direction-group" role="group" aria-label="Direction control">
                    <button
                      type="button"
                      :class="{ active: selectedSprite.heading < 0 }"
                      @click="updateSelectedSpriteLeftRight('left')"
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      :class="{ active: selectedSprite.heading >= 0 }"
                      @click="updateSelectedSpriteLeftRight('right')"
                    >
                      Right
                    </button>
                  </div>
                  <span class="quick-config-divider" aria-hidden="true"></span>
                  <button class="quick-config-back" type="button" aria-label="Back" @click="backToDefaultQuickConfig">
                    <span v-html="backQuickIcon"></span>
                  </button>
                </template>
                <template v-else-if="activeQuickConfig === 'layer' && selectedSprite != null">
                  <div class="quick-layer-menu" role="menu" aria-label="Layer order options">
                    <button type="button" role="menuitem" @click="moveSelectedSpriteLayer('up')">Bring forward</button>
                    <button type="button" role="menuitem" @click="moveSelectedSpriteLayer('top')">Bring to front</button>
                    <button type="button" role="menuitem" @click="moveSelectedSpriteLayer('down')">Send backward</button>
                    <button type="button" role="menuitem" @click="moveSelectedSpriteLayer('bottom')">Send to back</button>
                  </div>
                  <span class="quick-config-divider" aria-hidden="true"></span>
                  <button class="quick-config-back" type="button" aria-label="Back" @click="backToDefaultQuickConfig">
                    <span v-html="backQuickIcon"></span>
                  </button>
                </template>
                <template v-else>
                  <button class="quick-config-back" type="button" aria-label="Back" @click="backToDefaultQuickConfig">
                    <span v-html="backQuickIcon"></span>
                  </button>
                </template>
              </div>
            </template>
            <ProjectRunner v-show="runnerActive" ref="runnerRef" :project="project" :show-controls="false" />
          </div>
          <div v-if="publishStatusMessage !== ''" class="publish-toast" role="status">
            {{ publishStatusMessage }}
          </div>
        </section>

        <section class="asset-card">
          <div class="sprites-panel">
            <UICardHeader class="asset-header justify-between">
              <h2 class="m-0 text-xl font-normal text-title">Sprites</h2>
              <span ref="addSpriteMenuRef" class="add-sprite-menu-wrap">
                <button
                  type="button"
                  aria-label="Add sprite"
                  :aria-expanded="addSpriteMenuOpen"
                  aria-haspopup="menu"
                  @click.stop="toggleAddSpriteMenu"
                >
                  <span aria-hidden="true" v-html="plusIcon"></span>
                </button>
                <span v-if="addSpriteMenuOpen" class="add-sprite-menu" role="menu" @click.stop>
                  <button class="add-sprite-menu-item" type="button" role="menuitem" @click="addLocalSprite('local')">
                    Select local file
                  </button>
                  <button class="add-sprite-menu-item" type="button" role="menuitem" @click="addLocalSprite('library')">
                    Choose from asset library
                  </button>
                  <button class="add-sprite-menu-item" type="button" role="menuitem" @click="openSpriteGenModal">
                    Generate with AI
                  </button>
                </span>
              </span>
            </UICardHeader>
            <div ref="spriteMenuRef" class="sprite-list">
              <SpriteItem
                v-for="sprite in sprites"
                :key="sprite.id"
                :sprite="sprite"
                :active="activeEditorTarget === 'sprite' && selectedSpriteId === sprite.id"
                @select="selectSprite(sprite.id)"
              >
                <template v-if="activeEditorTarget === 'sprite' && selectedSpriteId === sprite.id" #corner>
                  <button
                    class="sprite-menu"
                    type="button"
                    aria-label="Options button"
                    :aria-expanded="spriteMenuOpenFor === sprite.id"
                    aria-haspopup="menu"
                    @click="toggleSpriteMenu(sprite.id, $event)"
                    v-html="moreIcon"
                  ></button>
                </template>
              </SpriteItem>
            </div>
          </div>

          <div class="stage-panel">
            <UICardHeader class="stage-panel-header justify-center">Stage</UICardHeader>
            <button
              class="stage-thumb"
              :class="{ active: activeEditorTarget === 'stage' && activeStageTab === 'code' }"
              type="button"
              aria-label="Stage overview"
              @click="selectStage('code')"
            >
              <img :src="stageBackdrop" alt="" />
            </button>
            <div class="stage-divider" aria-hidden="true"></div>
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
        <Teleport to="body">
          <div
            v-if="spriteMenuSprite != null"
            class="sprite-options-menu"
            :style="getSpriteMenuStyle()"
            role="menu"
            @click.stop
          >
            <button class="sprite-options-item" type="button" role="menuitem" @click="handleOpenSpriteMenuAction(toggleSpriteVisibility)">
              {{ spriteMenuSprite.hidden ? 'Show' : 'Hide' }}
            </button>
            <button class="sprite-options-item" type="button" role="menuitem" @click="handleOpenSpriteMenuAction(duplicateSprite)">
              Duplicate
            </button>
            <button class="sprite-options-item" type="button" role="menuitem" @click="handleOpenSpriteMenuAction(renameSprite)">
              Rename
            </button>
            <button class="sprite-options-item" type="button" role="menuitem" @click="handleOpenSpriteMenuAction(saveSpriteToLibrary)">
              Save to asset library
            </button>
            <button class="sprite-options-item danger" type="button" role="menuitem" @click="handleOpenSpriteMenuAction(removeSprite)">
              Remove
            </button>
          </div>
        </Teleport>
      </aside>
    </section>

    <section v-else class="map-editor-main">
      <section class="map-workspace" :style="mapWorkspaceStyle">
        <div class="map-stage" :style="mapStageStyle">
          <img class="map-backdrop" :src="stageBackdrop" alt="" />
          <button
            v-for="sprite in sprites"
            :key="`map-${sprite.id}`"
            class="map-sprite"
            :class="[`map-sprite-${sprite.id}`, { active: selectedMapSpriteId === sprite.id }]"
            :style="getMapSpriteFrameStyle(sprite)"
            type="button"
            @click="selectMapSprite(sprite.id)"
            @pointerdown.stop.prevent="startMapSpriteDrag(sprite, $event)"
            @pointermove.stop.prevent="moveMapSpriteDrag"
            @pointerup.stop.prevent="endMapSpriteDrag"
            @pointercancel.stop.prevent="endMapSpriteDrag"
          >
            <img :src="sprite.image" :alt="sprite.name" />
            <span v-if="selectedMapSpriteId === sprite.id" class="map-sprite-coordinate">{{ selectedMapSpriteCoordinate }}</span>
          </button>
          <div class="map-zoom-controls">
            <button type="button" aria-label="Zoom in">+</button>
            <button type="button" aria-label="Zoom out">-</button>
            <button type="button" aria-label="Reset zoom">100%</button>
          </div>
        </div>
      </section>

      <aside class="map-side">
        <UICard class="map-card">
          <UICardHeader class="map-card-header justify-between">
            <h2 class="m-0 text-xl font-normal text-title">Global Config</h2>
            <button class="map-config-icon collapse" type="button" aria-label="Collapse global config" v-html="arrowDownIcon"></button>
          </UICardHeader>
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
              <button
                class="map-switch"
                :class="{ active: mapPhysicsEnabled }"
                role="switch"
                :aria-checked="mapPhysicsEnabled"
                type="button"
                aria-label="Physics"
                @click="mapPhysicsEnabled = !mapPhysicsEnabled"
              >
                <span class="map-switch-rail" aria-hidden="true">
                  <span class="map-switch-thumb"></span>
                </span>
              </button>
            </label>
            <label v-if="mapPhysicsEnabled">
              <span>Layer Sorting</span>
              <span class="map-radio-group" role="radiogroup" aria-label="Layer Sorting">
                <button
                  class="map-radio"
                  :class="{ active: mapLayerSorting === 'default' }"
                  type="button"
                  role="radio"
                  :aria-checked="mapLayerSorting === 'default'"
                  @click="mapLayerSorting = 'default'"
                >
                  Default
                </button>
                <button
                  class="map-radio"
                  :class="{ active: mapLayerSorting === 'vertical' }"
                  type="button"
                  role="radio"
                  :aria-checked="mapLayerSorting === 'vertical'"
                  @click="mapLayerSorting = 'vertical'"
                >
                  Vertical
                </button>
              </span>
            </label>
          </div>
        </UICard>

        <UICard class="map-card map-sprites-card">
          <UICardHeader class="map-card-header active justify-between">
            <h2 class="m-0 text-xl font-normal text-title">Sprites</h2>
            <span ref="mapAddSpriteMenuRef" class="add-sprite-menu-wrap">
              <button
                type="button"
                aria-label="Add sprite"
                :aria-expanded="addSpriteMenuOpen"
                aria-haspopup="menu"
                @click.stop="toggleAddSpriteMenu"
              >
                <span aria-hidden="true" v-html="plusIcon"></span>
              </button>
              <span v-if="addSpriteMenuOpen" class="add-sprite-menu" role="menu" @click.stop>
                <button class="add-sprite-menu-item" type="button" role="menuitem" @click="addLocalSprite('local')">
                  Select local file
                </button>
                <button class="add-sprite-menu-item" type="button" role="menuitem" @click="addLocalSprite('library')">
                  Choose from asset library
                </button>
                <button class="add-sprite-menu-item" type="button" role="menuitem" @click="openSpriteGenModal">
                  Generate with AI
                </button>
              </span>
            </span>
          </UICardHeader>
          <div class="map-sprite-list">
            <SpriteItem
              v-for="sprite in sprites"
              :key="`map-list-${sprite.id}`"
              :sprite="sprite"
              :active="selectedMapSpriteId === sprite.id"
              @select="selectMapSprite(sprite.id)"
            >
              <template v-if="selectedMapSpriteId === sprite.id" #corner>
                <button
                  class="sprite-menu"
                  type="button"
                  aria-label="Options button"
                  :aria-expanded="spriteMenuOpenFor === sprite.id"
                  aria-haspopup="menu"
                  @click="toggleSpriteMenu(sprite.id, $event)"
                  v-html="moreIcon"
                ></button>
              </template>
            </SpriteItem>
          </div>
          <footer v-if="mapSpriteConfigExpanded" class="map-sprite-config">
            <div class="map-config-title">
              <strong v-if="!mapSpriteNameEditing" class="map-config-name">{{ selectedMapSprite.name }}</strong>
              <form v-else class="map-sprite-name-form" @submit.prevent="submitMapSpriteRename">
                <input
                  ref="mapSpriteNameInputRef"
                  v-model="draftMapSpriteName"
                  aria-label="Sprite name"
                  @blur="submitMapSpriteRename"
                  @keydown.esc.prevent="cancelMapSpriteRename"
                />
              </form>
              <button class="map-config-icon" type="button" aria-label="Rename sprite" @click="startMapSpriteRename" v-html="editIcon"></button>
              <span class="map-config-title-spacer"></span>
              <button class="map-config-icon collapse" type="button" aria-label="Collapse sprite config" @click="mapSpriteConfigExpanded = false" v-html="arrowDownIcon"></button>
            </div>
            <div class="map-config-grid">
              <label><span>X</span><input :value="selectedMapSprite.x" type="number" inputmode="numeric" @input="updateSelectedMapSpriteX" /></label>
              <label><span>Y</span><input :value="selectedMapSprite.y" type="number" inputmode="numeric" @input="updateSelectedMapSpriteY" /></label>
              <label><span>W</span><input value="54" readonly /></label>
              <label><span>H</span><input value="60" readonly /></label>
            </div>
            <div class="map-config-row">
              <span>Rotation</span>
              <div class="map-button-group" role="group" aria-label="Map sprite rotation style">
                <button
                  class="map-button-group-item"
                  :class="{ active: selectedMapSprite.rotationStyle === 'normal' }"
                  type="button"
                  aria-label="Normal rotation"
                  @click="updateMapSpriteRotationStyle('normal')"
                >
                  <span v-html="rotateAroundIcon"></span>
                </button>
                <button
                  class="map-button-group-item"
                  :class="{ active: selectedMapSprite.rotationStyle === 'left-right' }"
                  type="button"
                  aria-label="Left-right rotation"
                  @click="updateMapSpriteRotationStyle('left-right')"
                >
                  <span v-html="leftRightIcon"></span>
                </button>
                <button
                  class="map-button-group-item"
                  :class="{ active: selectedMapSprite.rotationStyle === 'none' }"
                  type="button"
                  aria-label="No rotation"
                  @click="updateMapSpriteRotationStyle('none')"
                >
                  <span v-html="notRotateIcon"></span>
                </button>
              </div>
            </div>
            <div class="map-config-row">
              <span>Show</span>
              <div class="map-button-group" role="group" aria-label="Map sprite visibility">
                <button
                  class="map-button-group-item map-text-option"
                  :class="{ active: !selectedMapSprite.hidden }"
                  type="button"
                  @click="updateMapSpriteVisibility(true)"
                >
                  Visible
                </button>
                <button
                  class="map-button-group-item map-text-option"
                  :class="{ active: selectedMapSprite.hidden }"
                  type="button"
                  @click="updateMapSpriteVisibility(false)"
                >
                  Hidden
                </button>
              </div>
            </div>
            <div v-if="mapPhysicsEnabled" class="map-config-row">
              <span>Physics</span>
              <div class="map-checkbox-group" role="group" aria-label="Map sprite physics">
                <label class="map-checkbox">
                  <input
                    type="checkbox"
                    :checked="mapSpritePhysicsFlags.includes('Collision')"
                    @change="toggleMapSpritePhysicsFlag('Collision')"
                  />
                  <span>Collision</span>
                </label>
                <label class="map-checkbox">
                  <input
                    type="checkbox"
                    :checked="mapSpritePhysicsFlags.includes('Gravity')"
                    :disabled="mapSpritePhysicsFlags.includes('Immovable')"
                    @change="toggleMapSpritePhysicsFlag('Gravity')"
                  />
                  <span>Gravity</span>
                </label>
                <label class="map-checkbox">
                  <input
                    type="checkbox"
                    :checked="mapSpritePhysicsFlags.includes('Immovable')"
                    :disabled="mapSpritePhysicsFlags.includes('Gravity')"
                    @change="toggleMapSpritePhysicsFlag('Immovable')"
                  />
                  <span>Immovable</span>
                </label>
              </div>
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
        </UICard>
      </aside>
    </section>
    <Teleport to="body">
      <div v-if="animationPendingRemoval != null" class="prototype-modal-backdrop" role="presentation" @click.self="cancelRemoveAnimation">
        <section class="prototype-modal" role="dialog" aria-modal="true" aria-labelledby="remove-animation-title">
          <h2 id="remove-animation-title">Remove animation</h2>
          <p>Animation {{ animationPendingRemoval.name }} will be removed. Do you want to preserve the costumes?</p>
          <label class="prototype-checkbox">
            <input v-model="preserveRemovedAnimationFrames" type="checkbox" />
            <span>Preserve (the costumes will be moved to the sprite's costume list)</span>
          </label>
          <div class="prototype-modal-actions">
            <UIButton type="white" size="medium" @click="cancelRemoveAnimation">Cancel</UIButton>
            <UIButton type="primary" size="medium" @click="confirmRemoveAnimation">Confirm</UIButton>
          </div>
        </section>
      </div>
    </Teleport>
    <Teleport to="body">
      <div v-if="spritePendingRename != null" class="prototype-modal-backdrop" role="presentation" @click.self="cancelSpriteRename">
        <section class="prototype-modal" role="dialog" aria-modal="true" aria-labelledby="rename-sprite-title">
          <h2 id="rename-sprite-title">Rename</h2>
          <form class="prototype-form" @submit.prevent="submitSpriteRename">
            <label class="prototype-field">
              <span>Name</span>
              <input
                ref="spriteRenameInputRef"
                v-model="draftSpriteRenameName"
                type="text"
                aria-label="Sprite name"
                :aria-invalid="spriteRenameError !== ''"
                @input="spriteRenameError = ''"
                @keydown.esc.prevent="cancelSpriteRename"
              />
            </label>
            <p class="prototype-field-tip">Use letters, numbers, spaces, hyphens, or underscores.</p>
            <p v-if="spriteRenameError !== ''" class="prototype-field-error">{{ spriteRenameError }}</p>
            <div class="prototype-modal-actions">
              <UIButton type="white" size="medium" @click="cancelSpriteRename">Cancel</UIButton>
              <UIButton type="primary" size="medium" @click="submitSpriteRename">Confirm</UIButton>
            </div>
          </form>
        </section>
      </div>
    </Teleport>
    <SpriteGeneratorModal
      v-if="spriteGenModalOpen"
      @close="cancelSpriteGenModal"
      @add-sprite="addGeneratedSprite"
    />
    <PublishProjectModal
      v-if="publishModalOpen"
      :project-display-name="projectDisplayName"
      :thumbnail="project.thumbnail"
      :initial-project-description="project.description"
      :initial-project-instructions="project.instructions ?? ''"
      :submitting="publishSubmitting"
      @close="cancelPublishProject"
      @publish="submitPublishProject"
    />
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
  background: inherit;
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
  color: var(--ui-color-grey-1000);
}

.project-menu-trigger svg {
  color: inherit;
}

.project-file-icon {
  display: inline-flex;
  width: 20px;
  height: 20px;
}

.project-menu-arrow {
  display: inline-flex;
  width: 8px;
  height: 8px;
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
}

.project-name-edit-icon :deep(svg) {
  width: 14px;
  height: 14px;
  display: block;
}

.project-name-trigger:hover .project-name-edit-icon,
.project-name-trigger:focus-visible .project-name-edit-icon {
  display: inline-flex;
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

.mode-button-group {
  height: 32px;
  padding: 2px;
  border-radius: 8px;
  background: var(--ui-color-grey-400);
  display: inline-flex;
  align-items: center;
}

.mode-button {
  width: 36px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.mode-button span {
  width: 18px;
  height: 18px;
  display: flex;
}

.mode-button :deep(svg) {
  width: 18px;
  height: 18px;
  fill: currentColor;
  stroke: none;
  animation: none;
}

.mode-button :deep(path) {
  stroke: none;
}

.mode-button.active {
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-control);
}

.profile-dropdown {
  position: relative;
  height: 56px;
  display: flex;
  align-items: center;
}

.profile-trigger {
  height: 100%;
  min-width: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  padding: 0 12px;
}

.profile-trigger:hover,
.profile-trigger[aria-expanded='true'] {
  background: var(--ui-color-grey-400);
}

.profile {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  object-fit: cover;
}

.profile-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 40;
  min-width: 156px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 8px;
  box-shadow: var(--ui-box-shadow-md);
}

.profile-menu-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.profile-menu-group + .profile-menu-group {
  position: relative;
  margin-top: 13px;
}

.profile-menu-group + .profile-menu-group::before {
  content: '';
  position: absolute;
  top: -7px;
  left: 0;
  width: 100%;
  border-top: 1px solid var(--ui-color-dividing-line-2);
}

.profile-menu-user,
.profile-menu-item {
  width: 100%;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 0;
  border-radius: var(--ui-border-radius-sm);
  background: transparent;
  padding: 8px;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  line-height: 20px;
  text-align: left;
  white-space: nowrap;
}

.profile-menu-user {
  color: var(--ui-color-grey-800);
  cursor: default;
}

.profile-menu-item:hover {
  background: var(--ui-color-grey-300);
}

.prototype-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  background: rgb(31 41 55 / 36%);
  padding: 24px;
}

.prototype-modal {
  width: min(560px, 100%);
  border-radius: var(--ui-border-radius-lg);
  background: var(--ui-color-grey-100);
  padding: 24px;
  box-shadow: var(--ui-box-shadow-lg);
}

.prototype-modal h2 {
  margin: 0 0 16px;
  color: var(--ui-color-grey-1000);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.prototype-modal p {
  margin: 0;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  line-height: 22px;
}

.prototype-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  line-height: 22px;
}

.prototype-checkbox input {
  width: 16px;
  height: 16px;
  accent-color: var(--ui-color-primary-main);
}

.prototype-form {
  display: flex;
  flex-direction: column;
}

.prototype-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  line-height: 20px;
}

.prototype-field > span {
  color: var(--ui-color-grey-800);
}

.prototype-field input {
  height: 32px;
  border: 0;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-300);
  box-shadow: inset 0 0 0 1px var(--ui-color-grey-300);
  padding: 0 12px;
  color: var(--ui-color-grey-1000);
  font: inherit;
  outline: none;
}

.prototype-field textarea,
.prototype-field select {
  border: 0;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-300);
  box-shadow: inset 0 0 0 1px var(--ui-color-grey-300);
  padding: 8px 12px;
  color: var(--ui-color-grey-1000);
  font: inherit;
  outline: none;
}

.prototype-field textarea {
  min-height: 108px;
  resize: vertical;
}

.prototype-field select {
  height: 36px;
}

.prototype-field input:focus,
.prototype-field textarea:focus,
.prototype-field select:focus {
  background: var(--ui-color-grey-100);
  box-shadow: inset 0 0 0 1px var(--ui-color-primary-main);
}

.prototype-field input[aria-invalid='true'] {
  border-color: var(--ui-color-danger-main);
}

.prototype-field-tip,
.prototype-field-error {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 18px;
}

.prototype-field-tip {
  color: var(--ui-color-grey-700);
}

.prototype-field-error {
  color: var(--ui-color-danger-main);
}

.prototype-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 40px;
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
  overflow: hidden;
  border-radius: var(--ui-border-radius-lg);
  background-color: var(--ui-color-grey-200);
  background-position: center;
  background-repeat: repeat;
  background-size: contain;
}

.map-stage {
  position: relative;
  width: min(100%, 820px);
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: var(--ui-border-radius-lg);
  background-color: var(--ui-color-grey-300);
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
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
  cursor: grab;
  transform: translate(-50%, -50%);
}

.map-sprite.dragging {
  cursor: grabbing;
}

.map-sprite img {
  display: block;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}

.map-sprite-niu-xiao-qi {
}

.map-sprite-niu-xiao-qi img {
  width: 58px;
}

.map-sprite-niu-xiao-hua {
}

.map-sprite-niu-xiao-hua img {
  width: 72px;
}

.map-sprite-flower {
}

.map-sprite-flower img {
  width: 46px;
}

.map-sprite-tornado {
}

.map-sprite-tornado img {
  width: 54px;
}

.map-sprite-jaime {
}

.map-sprite-jaime img {
  width: 40px;
}

.map-sprite-kai {
}

.map-sprite-kai img {
  width: 50px;
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
}

.map-card-header button,
.map-config-title button {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ui-color-grey-800);
  padding: 0;
}

.map-card-header button:hover,
.map-config-title button:hover {
  background: var(--ui-color-grey-400);
}

.map-card-header button > span,
.map-card-header button > span :deep(svg) {
  width: 16px;
  height: 16px;
}

.map-config {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px;
}

.map-config label,
.map-config-row {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  font-size: 14px;
  line-height: 22px;
}

.map-config label > span:first-child,
.map-config-row > span:first-child {
  color: var(--ui-color-grey-1000);
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

.map-switch {
  --ui-switch-rail-width: 40px;
  --ui-switch-rail-height: 22px;
  --ui-switch-button-size: 18px;
  --ui-switch-offset: 2px;
  min-width: var(--ui-switch-rail-width);
  height: var(--ui-switch-rail-height);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  outline: none;
}

.map-switch-rail {
  position: relative;
  width: var(--ui-switch-rail-width);
  height: var(--ui-switch-rail-height);
  display: block;
  overflow: hidden;
  border-radius: calc(var(--ui-switch-rail-height) / 2);
  background: rgb(0 0 0 / 0.14);
  transition:
    background-color 0.3s,
    box-shadow 0.3s;
}

.map-switch.active .map-switch-rail {
  background: var(--ui-color-primary-main);
}

.map-switch:focus .map-switch-rail {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ui-color-primary-main) 20%, transparent);
}

.map-switch-thumb {
  position: absolute;
  top: var(--ui-switch-offset);
  left: var(--ui-switch-offset);
  width: var(--ui-switch-button-size);
  height: var(--ui-switch-button-size);
  border-radius: 50%;
  background: var(--ui-color-grey-100);
  box-shadow:
    0 1px 4px 0 rgb(0 0 0 / 0.3),
    inset 0 0 1px 0 rgb(0 0 0 / 0.05);
  transition: left 0.3s;
}

.map-switch.active .map-switch-thumb {
  left: calc(100% - var(--ui-switch-button-size) - var(--ui-switch-offset));
}

.map-radio-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.map-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--ui-color-grey-900);
  font: inherit;
  cursor: pointer;
}

.map-radio::before {
  content: '';
  width: 14px;
  height: 14px;
  flex: none;
  border: 1px solid var(--ui-color-grey-600);
  border-radius: 50%;
  background: var(--ui-color-grey-100);
  box-shadow: inset 0 0 0 3px var(--ui-color-grey-100);
}

.map-radio.active::before {
  border-color: var(--ui-color-primary-main);
  background: var(--ui-color-primary-main);
}

.map-config strong {
  min-width: 0;
  color: var(--ui-color-grey-1000);
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.map-button-group {
  height: 32px;
  display: inline-flex;
  overflow: hidden;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-300);
}

.map-button-group-item {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: var(--ui-color-grey-300);
  color: var(--ui-color-grey-1000);
  transition:
    background-color 0.2s,
    color 0.2s;
}

.map-button-group-item.active {
  background: var(--ui-color-primary-200);
  color: var(--ui-color-primary-400);
}

.map-button-group-item :deep(svg) {
  width: 16px;
  height: 16px;
  display: block;
}

.map-text-option {
  width: auto;
  min-width: 64px;
  padding: 0 12px;
  font-weight: 500;
}

.map-checkbox-group {
  min-height: 32px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 8px 12px;
}

.map-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ui-color-grey-1000);
  white-space: nowrap;
}

.map-checkbox input {
  width: 14px;
  height: 14px;
  accent-color: var(--ui-color-primary-main);
}

.map-checkbox input:disabled + span {
  color: var(--ui-color-grey-600);
}

.map-sprites-card {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.map-sprite-list {
  flex: 1 1 auto;
  min-height: 120px;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px;
  padding: 12px;
  overflow: auto;
}

.map-sprite-config {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 4;
  border-top: 1px solid var(--ui-color-grey-400);
  background: var(--ui-color-grey-100);
  padding: 16px;
  box-shadow: 0 -12px 24px rgb(16 24 40 / 0.08);
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
  margin-bottom: 24px;
}

.map-sprite-config .map-config-row + .map-config-row {
  margin-top: 16px;
}

.map-config-name {
  min-width: 0;
  max-width: 16em;
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-config-title-spacer {
  flex: 1 1 auto;
}

.map-config-icon {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--ui-color-grey-900);
  transition: color 0.15s ease;
}

.map-config-icon:hover {
  color: var(--ui-color-grey-1000);
}

.map-config-icon :deep(svg) {
  width: 16px;
  height: 16px;
  display: block;
}

.map-config-icon.collapse :deep(svg),
.map-config-icon.collapse svg {
  width: 16px;
  height: 16px;
}

.map-sprite-name-form {
  min-width: 0;
  max-width: 16em;
  flex: 1 1 16em;
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
  gap: 12px;
  margin-bottom: 24px;
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
  height: 32px;
  border: 0;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-300);
  box-shadow: inset 0 0 0 1px var(--ui-color-grey-300);
  padding: 0 12px;
  color: var(--ui-color-grey-1000);
  font: inherit;
  outline: none;
}

.map-config-grid input:focus {
  background: var(--ui-color-grey-100);
  box-shadow: inset 0 0 0 1px var(--ui-color-primary-main);
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

.format-button {
  margin-left: auto;
  margin-bottom: 7px;
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

.asset-select-button {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 0;
  border-radius: inherit;
  background: transparent;
  padding: 2px;
  color: inherit;
  font: inherit;
}

.editor-asset-item img {
  width: 60px;
  height: 60px;
  margin-bottom: 5px;
  object-fit: contain;
}

.sound-asset-item {
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
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px 0 12px;
  color: var(--ui-color-grey-800);
}

.widget-icon :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.editor-asset-item .asset-item-title {
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

.animation-asset-item,
.costume-asset-item {
  overflow: visible;
}

.asset-item-menu {
  position: absolute;
  top: -10px;
  right: -10px;
  z-index: 2;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--ui-color-primary-main);
  color: var(--ui-color-grey-100);
  padding: 0;
  box-shadow: var(--ui-box-shadow-sm);
}

.asset-item-menu :deep(svg) {
  width: 16px;
  height: 16px;
  display: block;
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

.animation-add-menu {
  position: fixed;
  z-index: 70;
  box-sizing: border-box;
  width: 240px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 4px;
  box-shadow: var(--ui-box-shadow-md);
}

.animation-add-menu-item {
  min-height: 36px;
  display: flex;
  align-items: center;
  border: 0;
  border-radius: var(--ui-border-radius-sm);
  background: transparent;
  padding: 8px;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  text-align: left;
}

.animation-add-menu-item:hover {
  background: var(--ui-color-grey-300);
}

.asset-add-menu {
  position: fixed;
  z-index: 70;
  box-sizing: border-box;
  width: 184px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 4px;
  box-shadow: var(--ui-box-shadow-md);
}

.asset-add-menu-item {
  min-height: 36px;
  display: flex;
  align-items: center;
  border: 0;
  border-radius: var(--ui-border-radius-sm);
  background: transparent;
  padding: 8px;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  text-align: left;
}

.asset-add-menu-item:hover {
  background: var(--ui-color-grey-300);
}

.animation-options-menu {
  position: fixed;
  z-index: 80;
  min-width: 184px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 8px;
  box-shadow: var(--ui-box-shadow-md);
}

.animation-options-item {
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

.animation-options-item:hover {
  background: var(--ui-color-grey-300);
}

.animation-options-item + .animation-options-item {
  margin-top: 1px;
}

.animation-options-item.danger {
  color: var(--ui-color-danger-main);
}

.asset-options-menu {
  position: fixed;
  z-index: 80;
  min-width: 184px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 8px;
  box-shadow: var(--ui-box-shadow-md);
}

.asset-options-item {
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

.asset-options-item:hover:not(:disabled) {
  background: var(--ui-color-grey-300);
}

.asset-options-item + .asset-options-item {
  margin-top: 1px;
}

.asset-options-item.danger {
  color: var(--ui-color-danger-main);
}

.asset-options-item:disabled {
  color: var(--ui-color-grey-600);
  cursor: not-allowed;
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
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  color: currentColor;
}

.setting-icon :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
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
  width: calc(var(--sound-range-left, 0%) + 16px);
}

.waveform-right-fixed {
  right: -16px;
  width: calc(var(--sound-range-right, 0%) + 16px);
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
  border: 0;
  background: var(--ui-color-primary-400);
  padding: 0;
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
  left: calc(var(--sound-range-left, 0%) - 16px);
}

.waveform-right-bar {
  right: calc(var(--sound-range-right, 0%) - 16px);
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
  cursor: pointer;
}

.sound-slider-track span {
  position: absolute;
  inset: 0 calc(100% - var(--sound-gain, 55%)) 0 0;
  border-radius: inherit;
  background: var(--ui-color-primary-main);
}

.sound-controls-spacer {
  flex: 1 1 0;
}

.sound-edit-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
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

.events-list {
  border-right: 1px solid var(--ui-color-grey-400);
  padding: 15px 16px;
  overflow-x: auto;
  overflow-y: hidden;
  cursor: grab;
  scrollbar-width: none;
  touch-action: pan-y;
}

.events-list.dragging {
  cursor: grabbing;
  user-select: none;
}

.events-list::-webkit-scrollbar {
  display: none;
}

.event-group {
  min-width: max-content;
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
  width: max-content;
  min-width: 100%;
  border: 0;
  background: transparent;
  padding: 5px 6px;
  text-align: left;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  color: #000;
  white-space: nowrap;
}

.code-editor {
  position: relative;
  overflow: hidden;
  padding: 14px 66px 14px 18px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(13px * var(--prototype-code-zoom, 1));
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

.source-content {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.code-side-tools {
  position: absolute;
  inset: 12px 8px 8px auto;
  width: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
}

.code-document-tabs {
  min-height: 0;
  display: flex;
  flex: 0 1 auto;
  flex-direction: column;
  align-items: center;
}

.code-document-temp-tabs {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  scrollbar-width: none;
}

.code-document-temp-tabs::-webkit-scrollbar {
  display: none;
}

.code-document-tab {
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 6px;
  background: var(--ui-color-grey-300);
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.code-document-tab.active {
  border-color: var(--ui-color-primary-500);
  background: var(--ui-color-primary-200);
  cursor: default;
}

.code-document-tab img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-radius: 4px;
}

.code-document-divider {
  width: 32px;
  height: 1px;
  flex: 0 0 auto;
  margin: 12px 0;
  background: var(--ui-color-dividing-line-2);
}

.code-document-close {
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  border: 0;
  background: transparent;
  color: var(--ui-color-grey-800);
}

.code-document-close:hover {
  color: var(--ui-color-grey-1000);
}

.code-document-close :deep(svg) {
  width: 20px;
  height: 20px;
  display: block;
}

.zoom-tools {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  gap: 4px;
}

.zoom-tools button {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: 6px;
  background: var(--ui-color-grey-100);
  color: var(--ui-color-grey-800);
}

.zoom-tools button:hover {
  background: var(--ui-color-grey-300);
  color: var(--ui-color-grey-1000);
}

.zoom-tools button :deep(svg) {
  width: 20px;
  height: 20px;
  display: block;
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

.button-icon,
.button-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.publish-button {
  background: var(--ui-color-primary-100);
  color: var(--ui-color-primary-main);
}

.publish-toast {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 3;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 8px 12px;
  color: var(--ui-color-grey-1000);
  font-size: 13px;
  line-height: 18px;
  box-shadow: var(--ui-box-shadow-sm);
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

.stage-sprite {
  width: 105px;
  height: 105px;
  cursor: grab;
  transform-origin: center;
}

.stage-sprite.dragging,
.selected-sprite.dragging {
  cursor: grabbing;
}

.stage-sprite img {
  position: absolute;
  left: 24px;
  top: 10px;
  width: 54px;
  user-select: none;
  -webkit-user-drag: none;
}

.selected-sprite {
  left: 178px;
  top: 108px;
  width: 105px;
  height: 105px;
  border: 1px solid var(--ui-color-primary-main);
  cursor: grab;
  transform-origin: center;
}

.selected-sprite img {
  position: absolute;
  left: 24px;
  top: 10px;
  width: 54px;
  user-select: none;
  -webkit-user-drag: none;
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
  border: 2px solid var(--ui-color-grey-100);
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-lg);
}

.stage-tools.expanded {
  gap: 4px;
  padding: 4px;
}

.stage-tools button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--ui-border-radius-md);
  background: transparent;
  color: var(--ui-color-grey-1000);
}

.stage-tools button:hover {
  background: var(--ui-color-turquoise-200);
  color: var(--ui-color-turquoise-500);
}

.quick-config-input {
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-300);
  padding: 0 8px;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  line-height: 20px;
}

.quick-config-input input {
  width: 44px;
  height: 24px;
  border: 0;
  border-radius: var(--ui-border-radius-sm);
  background: var(--ui-color-grey-100);
  color: var(--ui-color-grey-1000);
  text-align: center;
  font: inherit;
  outline: none;
}

.quick-config-input input:focus {
  box-shadow: var(--ui-box-shadow-control);
}

.quick-config-input input::-webkit-outer-spin-button,
.quick-config-input input::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}

.quick-config-divider {
  width: 1px;
  height: 16px;
  background: var(--ui-color-grey-400);
}

.rotation-style-group,
.direction-group {
  height: 32px;
  display: inline-flex;
  overflow: hidden;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-300);
}

.rotation-style-button,
.direction-group button {
  background: transparent;
}

.rotation-style-button.active,
.direction-group button.active {
  background: var(--ui-color-primary-200);
  color: var(--ui-color-primary-400);
}

.direction-group button {
  width: auto;
  min-width: 48px;
  padding: 0 10px;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  font-weight: 500;
}

.heading-input input {
  width: 52px;
}

.position-input input {
  width: 52px;
}

.quick-layer-menu {
  position: absolute;
  left: 0;
  bottom: 44px;
  min-width: 152px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 6px;
  box-shadow: var(--ui-box-shadow-md);
}

.quick-layer-menu button {
  width: 100%;
  height: 32px;
  justify-content: flex-start;
  padding: 0 8px;
  color: var(--ui-color-grey-1000);
  font-size: 13px;
  white-space: nowrap;
}

.quick-config-back {
  color: var(--ui-color-grey-1000);
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
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--ui-color-grey-400);
}

.asset-header button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  padding: 0;
  color: var(--ui-color-grey-800);
  cursor: pointer;
  transition: background-color 0.2s ease;
  outline: none;
}

.asset-header button:hover {
  background: var(--ui-color-grey-400);
}

.asset-header button:active {
  background: var(--ui-color-grey-500);
}

.asset-header button:focus-visible {
  box-shadow: 0 0 0 2px var(--ui-color-primary-300);
}

.asset-header button > span,
.asset-header button > span :deep(svg) {
  width: 16px;
  height: 16px;
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
  box-sizing: border-box;
  width: max-content;
  min-width: 240px;
  max-width: min(320px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 8px;
  box-shadow: var(--ui-box-shadow-md);
}

.asset-header .add-sprite-menu-item,
.map-card-header .add-sprite-menu-item {
  box-sizing: border-box;
  width: 100%;
  height: auto;
  min-height: 40px;
  display: flex;
  align-items: center;
  overflow: hidden;
  border: 0;
  border-radius: var(--ui-border-radius-sm);
  background: transparent;
  padding: 8px 40px 8px 8px;
  color: var(--ui-color-grey-1000);
  font-size: 14px;
  line-height: 22px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-header .add-sprite-menu-item:hover,
.map-card-header .add-sprite-menu-item:hover {
  background: var(--ui-color-grey-300);
}

.sprite-list {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 88px);
  grid-auto-rows: 88px;
  align-content: flex-start;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 8px;
  padding: 12px;
  overflow: auto;
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
  position: fixed;
  z-index: 80;
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

.project-menu,
.profile-menu,
.animation-add-menu,
.asset-add-menu,
.animation-options-menu,
.asset-options-menu,
.quick-layer-menu,
.add-sprite-menu,
.sprite-options-menu {
  border: 0;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 8px;
  box-shadow: var(--ui-box-shadow-sm);
  overflow: hidden;
}

.project-menu-group,
.profile-menu-group {
  gap: 4px;
}

.project-menu-item,
.profile-menu-user,
.profile-menu-item,
.animation-add-menu-item,
.asset-add-menu-item,
.animation-options-item,
.asset-options-item,
.quick-layer-menu button,
.asset-header .add-sprite-menu-item,
.map-card-header .add-sprite-menu-item,
.sprite-options-item {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
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

.project-menu-item:hover,
.profile-menu-item:hover,
.animation-add-menu-item:hover,
.asset-add-menu-item:hover,
.animation-options-item:hover,
.asset-options-item:hover:not(:disabled),
.quick-layer-menu button:hover,
.asset-header .add-sprite-menu-item:hover,
.map-card-header .add-sprite-menu-item:hover,
.sprite-options-item:hover {
  background: var(--ui-color-grey-300);
}

.animation-add-menu-item + .animation-add-menu-item,
.asset-add-menu-item + .asset-add-menu-item,
.animation-options-item + .animation-options-item,
.asset-options-item + .asset-options-item,
.quick-layer-menu button + button,
.asset-header .add-sprite-menu-item + .add-sprite-menu-item,
.map-card-header .add-sprite-menu-item + .add-sprite-menu-item,
.sprite-options-item + .sprite-options-item {
  position: relative;
  margin-top: 13px;
}

.animation-add-menu-item + .animation-add-menu-item::before,
.asset-add-menu-item + .asset-add-menu-item::before,
.animation-options-item + .animation-options-item::before,
.asset-options-item + .asset-options-item::before,
.quick-layer-menu button + button::before,
.asset-header .add-sprite-menu-item + .add-sprite-menu-item::before,
.map-card-header .add-sprite-menu-item + .add-sprite-menu-item::before,
.sprite-options-item + .sprite-options-item::before {
  content: '';
  position: absolute;
  top: -7px;
  left: 0;
  width: 100%;
  border-top: 1px solid var(--ui-color-dividing-line-2);
}

.animation-options-item.danger,
.asset-options-item.danger,
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
  min-height: 0;
  overflow: hidden;
}

.stage-panel-header {
  width: 100%;
}

.stage-thumb {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 12px 0;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  padding: 2px;
  cursor: pointer;
  transition: border-color 0.1s, background 0.1s;
}

.stage-thumb.active {
  border: 2px solid var(--ui-color-primary-main);
  background: var(--ui-color-primary-200);
  padding: 0;
}

.stage-thumb:hover:not(.active) {
  background: var(--ui-color-grey-300);
}

.stage-thumb img {
  width: 44px;
  height: 44px;
  border-radius: 4px;
  object-fit: cover;
}

.stage-divider {
  width: 40px;
  height: 1px;
  flex: none;
  background: var(--ui-color-dividing-line-2);
}

.stage-entry {
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  border-radius: var(--ui-border-radius-md);
  color: var(--ui-color-grey-800);
  background: var(--ui-color-grey-100);
  padding: 4px;
  transition:
    background-color 0.1s,
    color 0.1s;
}

.stage-divider + .stage-entry {
  margin-top: 12px;
}

.stage-entry + .stage-entry {
  margin-top: 8px;
}

.stage-entry.active {
  color: var(--ui-color-primary-main);
}

.stage-entry:hover:not(.active) {
  background: var(--ui-color-grey-300);
  color: var(--ui-color-grey-900);
}

.stage-entry-icon {
  width: 24px;
  height: 24px;
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
  line-height: 14px;
}
</style>
