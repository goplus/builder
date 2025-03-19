import { LocaleMessage } from '../../../spx-gui/src/utils/i18n'
import { Position } from '../../../spx-gui/src/components/editor/code-editor/common'

type Mask = {
  startPos: Position
  endPos: Position
}

enum TaggingHandlerType {
  ClickToNext = 'clickToNext',
  ClickForbidden = 'clickForbidden',
  EnterForbidden = 'enterForbidden',
  EscapeForbidden = 'escapeForbidden',
}

type TaggingHandler = {
  [key: string]: TaggingHandlerType
}

type Step = {
  title: LocaleMessage // 步骤名称
  description: LocaleMessage // 步骤描述
  tip: LocaleMessage // 互动提示（需要条件触发）
  duration: number // 用户当前步骤卡顿距离给提示的时长（单位：秒）
  target: string // 目标元素语义化标注的key（用于高亮元素）
  taggingHandler: TaggingHandler // 元素的语义化标注 及其 处理方式
  type: 'coding' | 'following' // 存在两种类型的步骤，分别是Following步骤和Coding步骤
  isCheck: boolean // 该步骤是否涉及快照比对
  isApiControl: boolean // 是否需要去控制API Reference的展示
  apis: string[] // 该步骤中需要展示的API Reference的definition列表
  isAssetControl: boolean // 是否需要去控制素材的展示
  assets: string[] // 该步骤中需要被展示的素材的id列表
  isSpriteControl: boolean // 是否需要去控制精灵的展示
  sprites: string[] // 该步骤中需要被展示的精灵的id列表
  isSoundControl: boolean // 是否需要去控制声音的展示
  sounds: string[] // 该步骤中需要被展示的声音的id列表
  isCostumeControl: boolean // 是否需要去控制造型的展示
  costumes: string[] // 该步骤中需要被展示的造型的id列表
  isAnimationControl: boolean // 是否需要去控制动画的展示
  animations: string[] // 该步骤中需要被展示的动画的id列表
  isWidgetControl: boolean // 是否需要去控制组件的展示
  widgets: string[] // 该步骤中需要被展示的组件的id列表
  isBackdropControl: boolean // 是否需要去控制背景的展示
  backdrops: string[] // 该步骤中需要被展示的背景的id列表
  snapshot: {
    startSnapshot: string // 初始快照
    endSnapshot?: string // 结束快照
  }
  coding?: {
    // coding任务独有的数据结构
    path: string // 编码文件路径
    codeMasks: Mask[] // 完形填空的mask数组，一个mask对应一个空的答案
    startPosition: Position // 答案展示的开始位置
    endPosition: Position // 答案展示的结束位置
  }
}

type NodeTask = {
  name: LocaleMessage // 节点名称
  triggerTime: number // 节点在视频中的触发时间(单位：秒)
  video: string
  steps: Step[]
}

type Level = {
  // 一个故事线存在多个关卡
  cover: string // 封面图片url
  placement: Placement // 在界面上的位置信息（每个故事线中的关卡放置位置是不确定的，由人为指定）
  title: LocaleMessage // 关卡标题
  description: LocaleMessage // 关卡描述
  video: string // 关卡的整体视频url（由NodeTask的视频拼接而来）
  achievement?: {
    // 成就与关卡绑定，一个关卡可能存在多个成就
    icon: string // 成就图标url
    title: LocaleMessage // 成就名称
  }
  nodeTasks: NodeTask[]
}

type StoryLine = {
  id: string
  backgroundImage: string // 故事线的背景图url
  name: string // 故事线的名字（能够唯一标识该故事线，可用于为用户创建project时的projectName）
  title: LocaleMessage // 故事线标题
  description: LocaleMessage // 故事线描述
  tag: 'easy' | 'medium' | 'hard' // 故事线难度标签
  levels: Level[]
}

type StoryLineStudy = {
  storyLineId: string
  lastFinishedLevelIndex: number // 故事线状态，其值为当前最新已完成的关卡下标
}

type Placement = {
  /** X position in percentage */
  x: number
  /** Y position in percentage */
  y: number
}
