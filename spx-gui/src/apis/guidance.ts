import type { LocaleMessage } from '@/utils/i18n'
import type { Position } from '@/components/editor/code-editor/common'
import { client } from './common'
import { type ByPage } from './common'

export type Mask = {
  startPos: Position
  endPos: Position
}

export enum TaggingHandlerType {
  ClickToNext = 'clickToNext',
  SubmitToNext = 'submitToNext'
}

export type TaggingHandler = {
  [key: string]: TaggingHandlerType
}

export type Step = {
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
    endSnapshot: string // 结束快照
  }
  coding?: {
    // coding任务独有的数据结构
    path: string // 编码文件路径
    codeMasks: Mask[] // 完形填空的mask数组，一个mask对应一个空的答案
    startPosition: Position // 答案展示的开始位置
    endPosition: Position // 答案展示的结束位置
  }
}

export type NodeTask = {
  name: LocaleMessage // 节点名称
  triggerTime: number // 节点在视频中的触发时间(单位：秒)
  video: string
  steps: Step[]
}

export type Level = {
  // 一个故事线存在多个关卡
  cover: string // 封面图片url
  placement: Placement // 在界面上的位置信息（每个故事线中的关卡放置位置是不确定的，由人为指定）
  title: LocaleMessage // 关卡标题
  description: LocaleMessage // 关卡描述
  video: string // 关卡的整体视频url（由NodeTask的视频拼接而来）
  achievement: {
    // 成就与关卡绑定，一个关卡可能存在多个成就
    icon: string // 成就图标url
    title: LocaleMessage // 成就名称
  }
  nodeTasks: NodeTask[]
}

export type StoryLine = {
  id: string
  backgroundImage: string // 故事线的背景图url
  name: string // 故事线的名字（能够唯一标识该故事线，可用于为用户创建project时的projectName）
  title: LocaleMessage // 故事线标题
  description: LocaleMessage // 故事线描述
  tag: 'easy' | 'medium' | 'hard' // 故事线难度标签
  levels: Level[]
}

export type MaybeSavedStoryLine = Omit<StoryLine, 'id'> & {
  id?: string
}

export type StoryLineStudy = {
  storyLineId: string
  lastFinishedLevelIndex: number // 故事线状态，其值为当前最新已完成的关卡下标
}

export type UpdateStoryLineStudyInput = {
  id: string
  lastFinishedLevelIndex: number // 当前最新完成的关卡下标
}

export type CreateStoryLineInput = {
    name: string
    backgroundImage: string
    title: LocaleMessage
    description: LocaleMessage
    tag: 'easy' | 'medium' | 'hard'
    levels: string
}

export type UpdateStoryLineInput = {
    id: string
    name: string
    backgroundImage: string
    title: LocaleMessage
    description: LocaleMessage
    tag: 'easy' | 'medium' | 'hard'
    levels: string
}

type Placement = {
  /** X position in percentage */
  x: number
  /** Y position in percentage */
  y: number
}

export const storyLineJson: StoryLine = {
  id: '1',
  backgroundImage: 'http://ssbvnda4w.hn-bkt.clouddn.com/qny/img/road-background.png',
  name: 'road',
  title: {
    zh: '过马路',
    en: 'Cross the Road'
  },
  description: {
    zh: '《过马路》是一款简单有趣的休闲游戏，玩家需要操控角色避开来往车辆，成功穿越马路。游戏玩法简单易上手，适合各年龄段玩家。',
    en: '"Cross the Road" is a simple yet fun casual game. Players control a character to avoid oncoming traffic and successfully cross the street. it\'s suitable for all ages.'
  },
  tag: 'easy',
  levels: [
    {
      cover: 'http://ssbvnda4w.hn-bkt.clouddn.com/qny/img/green.png',
      placement: {
        x: 70,
        y: 50
      },
      title: {
        zh: '编写相关代码.',
        en: 'Write relevant code.'
      },
      description: {
        zh: '编写相关代码.',
        en: 'Write relevant code.'
      },
      video: 'http://ssbvnda4w.hn-bkt.clouddn.com/qny/video/coding-person.mkv',
      achievement: {
        icon: 'http://ssbvnda4w.hn-bkt.clouddn.com/qny/img/senior.png',
        title: {
          zh: '高级',
          en: 'senior'
        }
      },
      nodeTasks: [
        {
          name: {
            zh: '编写与人相关的代码.',
            en: 'Write human-related code.'
          },
          triggerTime: 55,
          video: '',
          steps: [
            {
              title: {
                zh: '编写代码',
                en: 'Write relevant code.'
              },
              description: {
                zh: '编写与人相关的代码',
                en: 'Write human-related code.'
              },
              tip: {
                zh: '测试',
                en: 'test'
              },
              duration: 20,
              target: 'code-editor',
              taggingHandler: {},
              type: 'coding',
              isCheck: true,
              isApiControl: true,
              apis: [
                'gop:github.com/goplus/spx?Game.onStart',
                'gop:github.com/goplus/spx?Sprite.think#1',
                'gop:github.com/goplus/spx?Game.broadcast#0',
                'gop:github.com/goplus/spx?Sprite.onTouchStart#0',
                'gop:github.com/goplus/spx?Sprite.die',
                'gop:github.com/goplus/spx?Game.onKey#0',
                'gop:github.com/goplus/spx?Sprite.setHeading',
                'gop:github.com/goplus/spx?Sprite.step#0'
              ],
              isAssetControl: false,
              isSpriteControl: true,
              isSoundControl: false,
              isCostumeControl: false,
              isAnimationControl: false,
              isWidgetControl: false,
              isBackdropControl: false,
              assets: [],
              sprites: ['WizardBlue'],
              sounds: [],
              costumes: [],
              animations: [],
              widgets: [],
              backdrops: [],
              snapshot: {
                startSnapshot:
                  '{"assets/index.json": "data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22City%22%2C%22path%22%3A%22City.png%22%2C%22builder_id%22%3A%224Z7HpVxGWDUaa9xpAhp4m%22%7D%5D%2C%22backdropIndex%22%3A1%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D", "main.spx": "data:;,", "assets/backdrop.png": "kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264", "assets/City.png": "kodo://goplus-builder-usercontent-test/files/Fpa4N41zCy22Iz3-IgOJAsIfEo84-139687", "assets/sprites/WizardBlue/cover.svg": "kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856", "assets/sprites/WizardBlue/__animation_death__animation_death_0.svg": "kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562", "assets/sprites/WizardBlue/__animation_death__animation_death_1.svg": "kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028", "assets/sprites/WizardBlue/__animation_death__animation_death_2.svg": "kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838", "assets/sprites/WizardBlue/__animation_death__animation_death_3.svg": "kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305", "assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg": "kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856", "assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg": "kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981", "assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg": "kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676", "assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg": "kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130", "assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg": "kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441", "assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg": "kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682", "assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg": "kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305", "WizardBlue.spx": "data:;,onStart%20%3D%3E%20%7B%0D%0A%09__%20%22%E5%A6%82%E4%BD%95%E9%80%9A%E8%BF%87%E6%96%91%E9%A9%AC%E7%BA%BF%E5%91%A2%EF%BC%9F%22%2C%20__%0D%0A%09__%20%22start%22%0D%0A%7D%0D%0A%0D%0A__%20%3D%3E%20%7B%0D%0A%09__%0D%0A%7D%0D%0A%0D%0A__%20__%2C%20%3D%3E%20%7B%0D%0A%09__%20180%0D%0A%09__%2030%0D%0A%7D%0D%0A", "assets/sprites/WizardBlue/index.json": "data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A-55%2C%22size%22%3A0.3%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D", "assets/sprites/Convertible/convertible.svg": "kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038", "Convertible.spx": "data:;,", "assets/sprites/Convertible/index.json": "data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A-204%2C%22y%22%3A-126%2C%22size%22%3A0.04%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D"}',
                endSnapshot:
                  '{"assets/index.json": "data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22City%22%2C%22path%22%3A%22City.png%22%2C%22builder_id%22%3A%224Z7HpVxGWDUaa9xpAhp4m%22%7D%5D%2C%22backdropIndex%22%3A1%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D", "main.spx": "data:;,", "assets/backdrop.png": "kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264", "assets/City.png": "kodo://goplus-builder-usercontent-test/files/Fpa4N41zCy22Iz3-IgOJAsIfEo84-139687", "assets/sprites/WizardBlue/cover.svg": "kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856", "assets/sprites/WizardBlue/__animation_death__animation_death_0.svg": "kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562", "assets/sprites/WizardBlue/__animation_death__animation_death_1.svg": "kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028", "assets/sprites/WizardBlue/__animation_death__animation_death_2.svg": "kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838", "assets/sprites/WizardBlue/__animation_death__animation_death_3.svg": "kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305", "assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg": "kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856", "assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg": "kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981", "assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg": "kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676", "assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg": "kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130", "assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg": "kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441", "assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg": "kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682", "assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg": "kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305", "WizardBlue.spx": "data:;,onStart%20%3D%3E%20%7B%0D%0A%09think%20%22%E5%A6%82%E4%BD%95%E9%80%9A%E8%BF%87%E6%96%91%E9%A9%AC%E7%BA%BF%E5%91%A2%EF%BC%9F%22%2C%204%0D%0A%09broadcast%20%22start%22%0D%0A%7D%0D%0A%0D%0AonTouchStart%20%3D%3E%20%7B%0D%0A%09die%0D%0A%7D%0D%0A%0D%0AonKey%20KeyDown%2C%20%3D%3E%20%7B%0D%0A%09setHeading%20180%0D%0A%09step%2030%0D%0A%7D%0D%0A", "assets/sprites/WizardBlue/index.json": "data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A-55%2C%22size%22%3A0.3%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D", "assets/sprites/Convertible/convertible.svg": "kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038", "Convertible.spx": "data:;,", "assets/sprites/Convertible/index.json": "data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A-204%2C%22y%22%3A-126%2C%22size%22%3A0.04%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D"}'
              },
              coding: {
                path: 'WizardBlue.spx',
                codeMasks: [
                  {
                    startPos: {
                      line: 2,
                      column: 5
                    },
                    endPos: {
                      line: 2,
                      column: 9
                    }
                  },
                  {
                    startPos: {
                      line: 2,
                      column: 23
                    },
                    endPos: {
                      line: 2,
                      column: 24
                    }
                  },
                  {
                    startPos: {
                      line: 3,
                      column: 5
                    },
                    endPos: {
                      line: 3,
                      column: 13
                    }
                  },
                  {
                    startPos: {
                      line: 6,
                      column: 1
                    },
                    endPos: {
                      line: 6,
                      column: 12
                    }
                  },
                  {
                    startPos: {
                      line: 7,
                      column: 5
                    },
                    endPos: {
                      line: 7,
                      column: 7
                    }
                  },
                  {
                    startPos: {
                      line: 10,
                      column: 1
                    },
                    endPos: {
                      line: 10,
                      column: 5
                    }
                  },
                  {
                    startPos: {
                      line: 10,
                      column: 7
                    },
                    endPos: {
                      line: 10,
                      column: 13
                    }
                  },
                  {
                    startPos: {
                      line: 11,
                      column: 5
                    },
                    endPos: {
                      line: 11,
                      column: 14
                    }
                  },
                  {
                    startPos: {
                      line: 12,
                      column: 5
                    },
                    endPos: {
                      line: 12,
                      column: 8
                    }
                  }
                ],
                startPosition: {
                  line: 1,
                  column: 1
                },
                endPosition: {
                  line: 13,
                  column: 2
                }
              }
            },
            {
              title: {
                zh: '编写代码',
                en: 'Write relevant code.'
              },
              description: {
                zh: '编写与车相关的代码',
                en: 'Write car-related code.'
              },
              tip: {
                zh: '测试',
                en: 'test'
              },
              duration: 20,
              target: 'code-editor',
              taggingHandler: {},
              type: 'coding',
              isCheck: true,
              isApiControl: true,
              apis: [
                'gop:github.com/goplus/spx?Game.onMsg#1',
                'gop:github.com/goplus/spx?Sprite.glide#0',
                'gop:github.com/goplus/spx?Sprite.ypos'
              ],
              isAssetControl: false,
              isSpriteControl: true,
              sprites: ['Convertible'],
              isSoundControl: false,
              isCostumeControl: false,
              isAnimationControl: false,
              isWidgetControl: false,
              isBackdropControl: false,
              assets: [],
              sounds: [],
              costumes: [],
              animations: [],
              widgets: [],
              backdrops: [],
              snapshot: {
                startSnapshot:
                  '{"assets/index.json": "data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22City%22%2C%22path%22%3A%22City.png%22%2C%22builder_id%22%3A%224Z7HpVxGWDUaa9xpAhp4m%22%7D%5D%2C%22backdropIndex%22%3A1%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D", "main.spx": "data:;,", "assets/backdrop.png": "kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264", "assets/City.png": "kodo://goplus-builder-usercontent-test/files/Fpa4N41zCy22Iz3-IgOJAsIfEo84-139687", "assets/sprites/WizardBlue/cover.svg": "kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856", "assets/sprites/WizardBlue/__animation_death__animation_death_0.svg": "kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562", "assets/sprites/WizardBlue/__animation_death__animation_death_1.svg": "kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028", "assets/sprites/WizardBlue/__animation_death__animation_death_2.svg": "kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838", "assets/sprites/WizardBlue/__animation_death__animation_death_3.svg": "kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305", "assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg": "kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856", "assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg": "kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981", "assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg": "kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676", "assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg": "kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130", "assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg": "kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441", "assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg": "kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682", "assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg": "kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305", "WizardBlue.spx": "data:;,onStart%20%3D%3E%20%7B%0D%0A%09think%20%22%E5%A6%82%E4%BD%95%E9%80%9A%E8%BF%87%E6%96%91%E9%A9%AC%E7%BA%BF%E5%91%A2%EF%BC%9F%22%2C%204%0D%0A%09broadcast%20%22start%22%0D%0A%7D%0D%0A%0D%0AonTouchStart%20%3D%3E%20%7B%0D%0A%09die%0D%0A%7D%0D%0A%0D%0AonKey%20KeyDown%2C%20%3D%3E%20%7B%0D%0A%09setHeading%20180%0D%0A%09step%2030%0D%0A%7D%0D%0A", "assets/sprites/WizardBlue/index.json": "data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A-55%2C%22size%22%3A0.3%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D", "assets/sprites/Convertible/convertible.svg": "kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038", "Convertible.spx": "data:;,__%20%22start%22%2C%20%3D%3E%20%7B%0D%0A%09__%20%7B%0D%0A%09%09__%20200%2C%20ypos%2C%202%0D%0A%09%09glide%20-200%2C%20ypos%2C%202%0D%0A%09%7D%0D%0A%7D%0D%0A", "assets/sprites/Convertible/index.json": "data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A-204%2C%22y%22%3A-126%2C%22size%22%3A0.04%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D"}',
                endSnapshot:
                  '{"assets/index.json": "data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22City%22%2C%22path%22%3A%22City.png%22%2C%22builder_id%22%3A%224Z7HpVxGWDUaa9xpAhp4m%22%7D%5D%2C%22backdropIndex%22%3A1%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D", "main.spx": "data:;,", "assets/backdrop.png": "kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264", "assets/City.png": "kodo://goplus-builder-usercontent-test/files/Fpa4N41zCy22Iz3-IgOJAsIfEo84-139687", "assets/sprites/WizardBlue/cover.svg": "kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856", "assets/sprites/WizardBlue/__animation_death__animation_death_0.svg": "kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562", "assets/sprites/WizardBlue/__animation_death__animation_death_1.svg": "kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028", "assets/sprites/WizardBlue/__animation_death__animation_death_2.svg": "kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838", "assets/sprites/WizardBlue/__animation_death__animation_death_3.svg": "kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305", "assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg": "kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856", "assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg": "kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981", "assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg": "kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676", "assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg": "kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130", "assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg": "kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441", "assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg": "kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682", "assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg": "kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305", "WizardBlue.spx": "data:;,onStart%20%3D%3E%20%7B%0D%0A%09think%20%22%E5%A6%82%E4%BD%95%E9%80%9A%E8%BF%87%E6%96%91%E9%A9%AC%E7%BA%BF%E5%91%A2%EF%BC%9F%22%2C%204%0D%0A%09broadcast%20%22start%22%0D%0A%7D%0D%0A%0D%0AonTouchStart%20%3D%3E%20%7B%0D%0A%09die%0D%0A%7D%0D%0A%0D%0AonKey%20KeyDown%2C%20%3D%3E%20%7B%0D%0A%09setHeading%20180%0D%0A%09step%2030%0D%0A%7D%0D%0A", "assets/sprites/WizardBlue/index.json": "data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A-55%2C%22size%22%3A0.3%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D", "assets/sprites/Convertible/convertible.svg": "kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038", "Convertible.spx": "data:;,onMsg%20%22start%22%2C%20%3D%3E%20%7B%0D%0A%09for%20%7B%0D%0A%09%09glide%20200%2C%20ypos%2C%202%0D%0A%09%09glide%20-200%2C%20ypos%2C%202%0D%0A%09%7D%0D%0A%7D%0D%0A", "assets/sprites/Convertible/index.json": "data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A-204%2C%22y%22%3A-126%2C%22size%22%3A0.04%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D"}'
              },
              coding: {
                path: 'Convertible.spx',
                codeMasks: [
                  {
                    startPos: {
                      line: 1,
                      column: 1
                    },
                    endPos: {
                      line: 1,
                      column: 5
                    }
                  },
                  {
                    startPos: {
                      line: 2,
                      column: 5
                    },
                    endPos: {
                      line: 2,
                      column: 7
                    }
                  },
                  {
                    startPos: {
                      line: 3,
                      column: 9
                    },
                    endPos: {
                      line: 3,
                      column: 13
                    }
                  }
                ],
                startPosition: {
                  line: 1,
                  column: 1
                },
                endPosition: {
                  line: 6,
                  column: 12
                }
              }
            }
          ]
        }
      ]
    }
  ]
}

// const storyLineStudyJson: StoryLineStudy = {
//   storyLineId: '1',
//   lastFinishedLevelIndex: 1
// }

export async function getStoryLine(storyLineId: string): Promise<StoryLine> {
  const result = (await client.get(`/storyline/${encodeURIComponent(storyLineId)}`)) as StoryLine
  // 解析levels字段
  if (result && typeof result.levels === 'string') {
    result.levels = JSON.parse(result.levels)
  }
  return result
}

export async function getStoryLineStudy(storyLineId: string): Promise<StoryLineStudy | null> {
  try {
    const result = (await client.get(
      `/storyline/${encodeURIComponent(storyLineId)}/study`
    )) as Promise<StoryLineStudy | null>
    return result
  } catch {
    return null
  }
}
export async function listStoryLine(tag: 'easy' | 'medium' | 'hard'): Promise<ByPage<StoryLine>> {
  return client.get(`/storylines/list?tag=${tag}`) as Promise<ByPage<StoryLine>>
}

export type CheckCodeInput = {
  userCode: string
  expectedCode: string
  context: string
}

export async function checkCode(input: CheckCodeInput): Promise<boolean> {
  return client.post('/util/guidance-check', input) as Promise<boolean>
}

export async function createStoryLineStudy(storyLineId: string): Promise<StoryLineStudy> {
  return client.post(`/storyline/${encodeURIComponent(storyLineId)}/study`) as Promise<StoryLineStudy>
}

export async function updateStoryLineStudy(input: UpdateStoryLineStudyInput): Promise<StoryLineStudy> {
  return client.put(`/storyline/${encodeURIComponent(input.id)}/study`, input) as Promise<StoryLineStudy>
}

export async function createStoryLine(input: CreateStoryLineInput): Promise<StoryLine> {
  return client.post(`/storyline`, input) as Promise<StoryLine>
}

export async function updateStoryLine(input: UpdateStoryLineInput): Promise<StoryLine> {
  return client.put(`/storyline/${encodeURIComponent(input.id)}`, input) as Promise<StoryLine>
}

export async function deleteStoryLine(storyLineId: string): Promise<void> {
  return client.delete(`/storyline/${encodeURIComponent(storyLineId)}`) as Promise<void>
}