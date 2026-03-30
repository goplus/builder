/**
 * @desc SpxAPIReferenceProvider — spx-specific API reference provider.
 * Contains the full list of spx API reference item IDs and differentiates
 * between stage (Game) and sprite (Sprite) code.
 */

import { once } from 'lodash'
import { packageSpx } from '@/utils/spx'
import type {
  APICategoryViewInfo,
  DefinitionDocumentationItem,
  DocumentBase,
  IAPIReferenceProvider,
  APIReferenceContext
} from '../../xgo-code-editor'
import { mainCategories, subCategories } from '../../xgo-code-editor/common'
import { isTextDocumentStageCode, parseDefinitionName } from '../common'
import iconEvent from './icons/event.svg?raw'
import iconLook from './icons/look.svg?raw'
import iconMotion from './icons/motion.svg?raw'
import iconSound from './icons/sound.svg?raw'
import iconControl from './icons/control.svg?raw'
import iconGame from './icons/game.svg?raw'
import iconSensing from './icons/sensing.svg?raw'

/** Definition ID strings for APIReference items */
const apiReferenceItems = [
  'xgo:fmt?println',
  `xgo:${packageSpx}?rand#0`,
  `xgo:${packageSpx}?rand#1`,
  `xgo:${packageSpx}?exit#1`,
  `xgo:${packageSpx}?forever`,
  `xgo:${packageSpx}?repeat`,
  `xgo:${packageSpx}?repeatUntil`,
  'xgo:?for_iterate',
  'xgo:?if_statement',
  'xgo:?if_else_statement',

  `xgo:${packageSpx}?Game.wait`,
  `xgo:${packageSpx}?waitUntil`,
  `xgo:${packageSpx}?Game.timer`,
  `xgo:${packageSpx}?Game.resetTimer`,

  `xgo:${packageSpx}?Game.onStart`,
  `xgo:${packageSpx}?Game.onClick`,
  `xgo:${packageSpx}?Game.onKey#0`,
  `xgo:${packageSpx}?Game.onMsg#1`,
  `xgo:${packageSpx}?Game.onSwipe#0`,

  `xgo:${packageSpx}?Game.mouseX`,
  `xgo:${packageSpx}?Game.mouseY`,
  `xgo:${packageSpx}?Game.keyPressed`,
  `xgo:${packageSpx}?Game.getWidget`,
  `xgo:${packageSpx}?Mouse`,

  `xgo:${packageSpx}?Game.ask`,
  `xgo:${packageSpx}?Sprite.ask`,
  `xgo:${packageSpx}?Game.answer`,

  `xgo:${packageSpx}?Game.onBackdrop#1`,
  `xgo:${packageSpx}?Game.backdropName`,
  `xgo:${packageSpx}?Game.backdropIndex`,
  `xgo:${packageSpx}?Game.setBackdrop#0`,
  `xgo:${packageSpx}?Game.setBackdrop#3`,
  `xgo:${packageSpx}?Game.setBackdropAndWait#0`,

  `xgo:${packageSpx}?Game.broadcast#0`,
  `xgo:${packageSpx}?Game.broadcastAndWait#0`,

  `xgo:${packageSpx}?Game.play#1`,
  `xgo:${packageSpx}?Game.play#0`,
  `xgo:${packageSpx}?Game.playAndWait`,
  `xgo:${packageSpx}?Game.pausePlaying`,
  `xgo:${packageSpx}?Game.resumePlaying`,
  `xgo:${packageSpx}?Game.stopPlaying`,
  `xgo:${packageSpx}?Game.stopAllSounds`,

  `xgo:${packageSpx}?Game.volume`,
  `xgo:${packageSpx}?Game.changeVolume`,
  `xgo:${packageSpx}?Game.setVolume`,

  `xgo:${packageSpx}?Game.changeGraphicEffect`,
  `xgo:${packageSpx}?Game.setGraphicEffect`,
  `xgo:${packageSpx}?Game.clearGraphicEffects`,

  `xgo:${packageSpx}?Sprite.onStart`,
  `xgo:${packageSpx}?Sprite.onClick`,
  `xgo:${packageSpx}?Sprite.onKey#0`,
  `xgo:${packageSpx}?Sprite.onMsg#1`,
  `xgo:${packageSpx}?Sprite.onSwipe#0`,

  `xgo:${packageSpx}?Sprite.animate#0`,
  `xgo:${packageSpx}?Sprite.animate#1`,
  `xgo:${packageSpx}?Sprite.animateAndWait`,
  `xgo:${packageSpx}?Sprite.stopAnimation`,

  `xgo:${packageSpx}?Sprite.bounceOffEdge`,

  `xgo:${packageSpx}?Sprite.heading`,
  `xgo:${packageSpx}?Sprite.turn#0`,
  `xgo:${packageSpx}?Sprite.turn#1`,
  `xgo:${packageSpx}?Sprite.turnTo#0`,
  `xgo:${packageSpx}?Sprite.turnTo#4`,
  `xgo:${packageSpx}?Sprite.changeHeading`,
  `xgo:${packageSpx}?Sprite.setHeading`,
  `xgo:${packageSpx}?Up`,
  `xgo:${packageSpx}?Down`,
  `xgo:${packageSpx}?Left`,
  `xgo:${packageSpx}?Right`,

  `xgo:${packageSpx}?Sprite.size`,
  `xgo:${packageSpx}?Sprite.changeSize`,
  `xgo:${packageSpx}?Sprite.setSize`,

  `xgo:${packageSpx}?Sprite.xpos`,
  `xgo:${packageSpx}?Sprite.ypos`,
  `xgo:${packageSpx}?Sprite.step#0`,
  `xgo:${packageSpx}?Sprite.step#1`,
  `xgo:${packageSpx}?Sprite.stepTo#0`,
  `xgo:${packageSpx}?Sprite.stepTo#2`,
  `xgo:${packageSpx}?Sprite.stepTo#4`,
  `xgo:${packageSpx}?Sprite.stepTo#6`,
  `xgo:${packageSpx}?Sprite.glide#0`,
  `xgo:${packageSpx}?Sprite.glide#1`,
  `xgo:${packageSpx}?Sprite.glide#3`,
  `xgo:${packageSpx}?Sprite.changeXpos`,
  `xgo:${packageSpx}?Sprite.setXpos`,
  `xgo:${packageSpx}?Sprite.changeYpos`,
  `xgo:${packageSpx}?Sprite.setYpos`,

  `xgo:${packageSpx}?Sprite.clone#0`,

  `xgo:${packageSpx}?Sprite.costumeName`,
  `xgo:${packageSpx}?Sprite.setCostume#0`,

  `xgo:${packageSpx}?Sprite.setRotationStyle`,
  `xgo:${packageSpx}?None`,
  `xgo:${packageSpx}?Normal`,
  `xgo:${packageSpx}?LeftRight`,

  `xgo:${packageSpx}?Sprite.die`,

  `xgo:${packageSpx}?Sprite.touching#1`,
  `xgo:${packageSpx}?Sprite.touching#2`,
  `xgo:${packageSpx}?Sprite.distanceTo#0`,
  `xgo:${packageSpx}?Sprite.distanceTo#2`,

  `xgo:${packageSpx}?Edge`,
  `xgo:${packageSpx}?EdgeBottom`,
  `xgo:${packageSpx}?EdgeLeft`,
  `xgo:${packageSpx}?EdgeRight`,
  `xgo:${packageSpx}?EdgeTop`,

  `xgo:${packageSpx}?Sprite.visible`,
  `xgo:${packageSpx}?Sprite.show`,
  `xgo:${packageSpx}?Sprite.hide`,
  `xgo:${packageSpx}?Sprite.setLayer#0`,
  `xgo:${packageSpx}?Sprite.setLayer#1`,
  `xgo:${packageSpx}?Front`,
  `xgo:${packageSpx}?Back`,
  `xgo:${packageSpx}?Forward`,
  `xgo:${packageSpx}?Backward`,

  `xgo:${packageSpx}?Sprite.onCloned#0`,
  `xgo:${packageSpx}?Sprite.onTouchStart#0`,
  `xgo:${packageSpx}?Sprite.onTouchStart#2`,

  `xgo:${packageSpx}?Sprite.say#0`,
  `xgo:${packageSpx}?Sprite.say#1`,
  `xgo:${packageSpx}?Sprite.think#0`,
  `xgo:${packageSpx}?Sprite.think#1`,

  `xgo:${packageSpx}?Sprite.play#1`,
  `xgo:${packageSpx}?Sprite.play#0`,
  `xgo:${packageSpx}?Sprite.playAndWait`,
  `xgo:${packageSpx}?Sprite.pausePlaying`,
  `xgo:${packageSpx}?Sprite.resumePlaying`,
  `xgo:${packageSpx}?Sprite.stopPlaying`,
  `xgo:${packageSpx}?Sprite.stopAllSounds`,

  `xgo:${packageSpx}?Sprite.volume`,
  `xgo:${packageSpx}?Sprite.changeVolume`,
  `xgo:${packageSpx}?Sprite.setVolume`,

  `xgo:${packageSpx}?Sprite.changeGraphicEffect`,
  `xgo:${packageSpx}?Sprite.setGraphicEffect`,
  `xgo:${packageSpx}?Sprite.clearGraphicEffects`,

  `xgo:${packageSpx}?Sprite.physicsMode`,
  `xgo:${packageSpx}?Sprite.velocity`,
  `xgo:${packageSpx}?Sprite.gravity`,
  `xgo:${packageSpx}?Sprite.isOnFloor`,
  `xgo:${packageSpx}?Sprite.setPhysicsMode`,
  `xgo:${packageSpx}?Sprite.setVelocity`,
  `xgo:${packageSpx}?Sprite.setGravity`,
  `xgo:${packageSpx}?Sprite.addImpulse`,

  `xgo:${packageSpx}?Camera.zoom`,
  `xgo:${packageSpx}?Camera.setZoom`,
  `xgo:${packageSpx}?Camera.xpos`,
  `xgo:${packageSpx}?Camera.ypos`,
  `xgo:${packageSpx}?Camera.setXYpos`,
  `xgo:${packageSpx}?Camera.follow#0`

  // TODO: Decide whether to include these var-related APIs in the reference list. They are currently excluded because they are less commonly used and may require additional explanation on variable scopes, which could be complex for beginners.
  // `xgo:${packageSpx}?Game.showVar`,
  // `xgo:${packageSpx}?Game.hideVar`,
  // `xgo:${packageSpx}?Sprite.showVar`,
  // `xgo:${packageSpx}?Sprite.hideVar`
]

const categoryViewInfos: APICategoryViewInfo[] = [
  {
    id: mainCategories.event,
    label: { en: 'Event', zh: '事件' },
    icon: iconEvent,
    color: '#fabd2c',
    subCategories: [
      { id: subCategories.event.game, label: { en: 'Game Events', zh: '游戏事件' } },
      { id: subCategories.event.sensing, label: { en: 'Sensing Events', zh: '感知事件' } },
      { id: subCategories.event.motion, label: { en: 'Motion Events', zh: '运动事件' } },
      { id: subCategories.event.message, label: { en: 'Message Events', zh: '消息事件' } },
      { id: subCategories.event.sprite, label: { en: 'Sprite Events', zh: '精灵事件' } },
      { id: subCategories.event.stage, label: { en: 'Stage Events', zh: '舞台事件' } }
    ]
  },
  {
    id: mainCategories.look,
    label: { en: 'Look', zh: '外观' },
    icon: iconLook,
    color: '#fd8d60',
    subCategories: [
      { id: subCategories.look.visibility, label: { en: 'Visibility', zh: '显示/隐藏' } },
      { id: subCategories.look.behavior, label: { en: 'Behavior', zh: '行为' } },
      { id: subCategories.look.costume, label: { en: 'Costume', zh: '造型' } },
      { id: subCategories.look.animation, label: { en: 'Animation', zh: '动画' } },
      { id: subCategories.look.backdrop, label: { en: 'Backdrop', zh: '背景' } },
      { id: subCategories.look.effect, label: { en: 'Graphic Effect', zh: '特效' } }
    ]
  },
  {
    id: mainCategories.motion,
    label: { en: 'Motion', zh: '运动' },
    icon: iconMotion,
    color: '#91d644',
    subCategories: [
      { id: subCategories.motion.position, label: { en: 'Position', zh: '位置' } },
      { id: subCategories.motion.heading, label: { en: 'Heading', zh: '方向' } },
      { id: subCategories.motion.size, label: { en: 'Size', zh: '大小' } },
      { id: subCategories.motion.rotationStyle, label: { en: 'Rotation', zh: '旋转' } },
      { id: subCategories.motion.physics, label: { en: 'Physics', zh: '物理' } },
      { id: subCategories.motion.others, label: { en: 'Others', zh: '其他' } }
    ]
  },
  {
    id: mainCategories.control,
    label: { en: 'Control', zh: '控制' },
    icon: iconControl,
    color: '#3fcdd9',
    subCategories: [
      { id: subCategories.control.time, label: { en: 'Time', zh: '时间' } },
      { id: subCategories.control.flowControl, label: { en: 'Flow Control', zh: '流程控制' } },
      { id: subCategories.control.declaration, label: { en: 'Declaration', zh: '声明' } }
    ]
  },
  {
    id: mainCategories.sensing,
    label: { en: 'Sensing', zh: '感知' },
    icon: iconSensing,
    color: '#4fc2f8',
    subCategories: [
      { id: subCategories.sensing.distance, label: { en: 'Distance', zh: '距离' } },
      { id: subCategories.sensing.mouse, label: { en: 'Mouse', zh: '鼠标' } },
      { id: subCategories.sensing.keyboard, label: { en: 'Keyboard', zh: '键盘' } },
      { id: subCategories.sensing.ask, label: { en: 'Ask', zh: '提问' } }
    ]
  },
  {
    id: mainCategories.sound,
    label: { en: 'Sound', zh: '声音' },
    icon: iconSound,
    color: 'var(--ui-color-sound-main)',
    subCategories: [
      { id: subCategories.sound.playControl, label: { en: 'Play / Stop', zh: '播放/停止' } },
      { id: subCategories.sound.volume, label: { en: 'Volume', zh: '音量' } }
    ]
  },
  {
    id: mainCategories.game,
    label: { en: 'Game', zh: '游戏' },
    icon: iconGame,
    color: '#5a7afe',
    subCategories: [
      { id: subCategories.game.startStop, label: { en: 'Start / Stop', zh: '开始/停止' } },
      { id: subCategories.game.sprite, label: { en: 'Sprite', zh: '精灵' } },
      { id: subCategories.game.camera, label: { en: 'Camera', zh: '摄像机' } },
      { id: subCategories.game.others, label: { en: 'Others', zh: '其他' } }
    ]
  }
]

export class SpxAPIReferenceProvider implements IAPIReferenceProvider {
  constructor(private documentBase: DocumentBase) {}

  private getStageAPIReferenceItems = once(async () => {
    const maybeItems = await Promise.all(apiReferenceItems.map((id) => this.documentBase.getDocumentation(id)))
    const allItems = maybeItems.filter((i) => i != null) as DefinitionDocumentationItem[]
    return allItems.filter((item) => {
      if (item.definition.package !== packageSpx) return true
      const [receiver] = parseDefinitionName(item.definition.name)
      return receiver !== 'Sprite'
    })
  })

  private getSpriteAPIReferenceItems = once(async () => {
    const maybeItems = await Promise.all(apiReferenceItems.map((id) => this.documentBase.getDocumentation(id)))
    const allItems = maybeItems.filter((i) => i != null) as DefinitionDocumentationItem[]
    const spriteMethods = allItems.reduce((set, item) => {
      const [receiver, method] = parseDefinitionName(item.definition.name)
      if (receiver === 'Sprite') set.add(method)
      return set
    }, new Set<string>())
    return allItems.filter((item) => {
      if (item.definition.package !== packageSpx) return true
      const [receiver, method] = parseDefinitionName(item.definition.name)
      if (receiver === 'Game' && spriteMethods.has(method)) return false
      return true
    })
  })

  async provideAPIReference(ctx: APIReferenceContext) {
    const isStage = isTextDocumentStageCode(ctx.textDocument.id)
    if (isStage) return this.getStageAPIReferenceItems()
    return this.getSpriteAPIReferenceItems()
  }

  provideCategoryViewInfos(): APICategoryViewInfo[] {
    return categoryViewInfos
  }
}
