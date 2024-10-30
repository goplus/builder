import type { LocaleMessage } from '@/utils/i18n'
import type { Project } from '@/models/project'
import { type Tool, ToolContext, ToolType } from './common'
import * as gop from './gop'
import * as spx from './spx'

export * from './common'

export type ToolGroup = {
  label: LocaleMessage
  tools: Tool[]
}

export type ToolCategory = {
  label: LocaleMessage
  groups: ToolGroup[]
}

export const eventCategory: ToolCategory = {
  label: { en: 'Event', zh: '事件' },
  groups: [
    {
      label: { en: 'Game Events', zh: '游戏事件' },
      tools: [spx.onStart]
    },
    {
      label: { en: 'Sensing Events', zh: '感知事件' },
      tools: [spx.onClick, spx.onKey, spx.onAnyKey, spx.onTouchStart]
    },
    {
      label: { en: 'Motion Events', zh: '运动事件' },
      tools: [spx.onMoving, spx.onTurning]
    },
    {
      label: { en: 'Message Events', zh: '消息事件' },
      tools: [spx.onMsg, spx.broadcast]
    },
    {
      label: { en: 'Sprite Events', zh: '精灵事件' },
      tools: [spx.onCloned]
    },
    {
      label: { en: 'Stage Events', zh: '舞台事件' },
      tools: [spx.onBackdrop]
    }
  ]
}

export const motionCategory: ToolCategory = {
  label: { en: 'Motion', zh: '运动' },
  groups: [
    {
      label: { en: 'Position', zh: '位置' },
      tools: [
        spx.xpos,
        spx.ypos,
        spx.step,
        spx.move,
        spx.goto,
        spx.glide,
        spx.setXYpos,
        spx.changeXYpos,
        spx.setXpos,
        spx.changeXpos,
        spx.setYpos,
        spx.changeYpos
      ]
    },
    {
      label: { en: 'Heading', zh: '方向' },
      tools: [
        spx.heading,
        spx.turn,
        spx.turnTo,
        spx.setHeading,
        spx.changeHeading,
        spx.up,
        spx.down,
        spx.left,
        spx.right
      ]
    },
    {
      label: { en: 'Size', zh: '大小' },
      tools: [spx.size, spx.setSize, spx.changeSize]
    },
    {
      label: { en: 'Rotation', zh: '旋转' },
      tools: [spx.setRotationStyle, spx.normal, spx.leftRight, spx.none]
    },
    {
      label: { en: 'Others', zh: '其他' },
      tools: [spx.bounceOffEdge]
    }
  ]
}

export const lookCategory: ToolCategory = {
  label: { en: 'Look', zh: '外观' },
  groups: [
    {
      label: { en: 'Visibility', zh: '显示/隐藏' },
      tools: [spx.visible, spx.hide, spx.show]
    },
    {
      label: { en: 'Behavior', zh: '行为' },
      tools: [spx.say, spx.think]
    },
    {
      label: { en: 'Costume', zh: '造型' },
      // index-related tools are excluded, as they are not recommended to use (animation is prefered)
      tools: [spx.costumeName, spx.setCostume]
    },
    {
      label: { en: 'Animation', zh: '动画' },
      tools: [spx.animate]
    },
    {
      label: { en: 'Backdrop', zh: '背景' },
      tools: [spx.backdropName, spx.backdropIndex, spx.startBackdrop, spx.nextBackdrop, spx.prevBackdrop]
    }
  ]
}

export const sensingCategory: ToolCategory = {
  label: { en: 'Sensing', zh: '感知' },
  groups: [
    {
      label: { en: 'Distance', zh: '距离' },
      tools: [spx.touching, spx.distanceTo, spx.edge, spx.edgeLeft, spx.edgeRight, spx.edgeTop, spx.edgeBottom]
    },
    {
      label: { en: 'Mouse', zh: '鼠标' },
      tools: [spx.mouseX, spx.mouseY, spx.mousePressed, spx.mouseHitItem, spx.mouse]
    },
    {
      label: { en: 'Keyboard', zh: '键盘' },
      tools: [
        spx.keyPressed
        // ...spx.keys // TODO
      ]
    }
  ]
}

export const soundCategory: ToolCategory = {
  label: { en: 'Sound', zh: '声音' },
  groups: [
    {
      label: { en: 'Play / Stop', zh: '播放/停止' },
      tools: [spx.play, spx.stopAllSounds]
    },
    {
      label: { en: 'Volume', zh: '音量' },
      tools: [spx.volume, spx.setVolume, spx.changeVolume]
    }
  ]
}

export const controlCategory: ToolCategory = {
  label: { en: 'Control', zh: '控制' },
  groups: [
    {
      label: { en: 'Time', zh: '时间' },
      tools: [spx.wait]
    },
    {
      label: { en: 'Flow Control', zh: '流程控制' },
      tools: [gop.ifStatemeent, gop.forLoop]
    },
    {
      label: { en: 'Function', zh: '函数' },
      tools: [gop.functionDefinition]
    }
  ]
}

export const gameCategory: ToolCategory = {
  label: { en: 'Game', zh: '游戏' },
  groups: [
    {
      label: { en: 'Start / Stop', zh: '开始/停止' },
      tools: [spx.exit]
    },
    {
      label: { en: 'Sprite', zh: '精灵' },
      tools: [spx.clone, spx.die]
    },
    {
      label: { en: 'Others', zh: '其他' },
      tools: [spx.rand, gop.println]
    }
  ]
}

export function getVariableCategory(project: Project): ToolCategory {
  const { sprites, sounds } = project
  const groups: ToolGroup[] = [
    {
      label: { en: 'Variable Definition', zh: '变量定义' },
      tools: [gop.varDefinition]
    }
  ]

  groups.push({
    label: { en: 'Sprites', zh: '精灵' },
    tools: sprites.map((sprite) => {
      const keyword = `"${sprite.name}"`
      return {
        type: ToolType.variable,
        target: ToolContext.all,
        keyword,
        desc: { en: `Sprite "${sprite.name}"`, zh: `精灵 ${sprite.name}` },
        usage: {
          sample: keyword,
          insertText: keyword
        }
      }
    })
  })

  groups.push({
    label: { en: 'Sounds', zh: '声音' },
    tools: sounds.map((sound) => {
      const keyword = `"${sound.name}"`
      return {
        type: ToolType.variable,
        target: ToolContext.all,
        keyword,
        desc: { en: `Sound "${sound.name}"`, zh: `声音 ${sound.name}` },
        usage: {
          sample: keyword,
          insertText: keyword
        }
      }
    })
  })

  groups.push({
    label: { en: 'Backdrops', zh: '背景' },
    tools: project.stage.backdrops.map((backdrop) => {
      const keyword = `"${backdrop.name}"`
      return {
        type: ToolType.variable,
        target: ToolContext.all,
        keyword,
        desc: { en: `Backdrop "${backdrop.name}"`, zh: `背景 ${backdrop.name}` },
        usage: {
          sample: keyword,
          insertText: keyword
        }
      }
    })
  })

  if (project.selectedSprite != null) {
    groups.push({
      label: {
        en: `Animations of "${project.selectedSprite.name}"`,
        zh: `${project.selectedSprite.name} 的动画`
      },
      tools: project.selectedSprite.animations.map((animation) => {
        const keyword = `"${animation.name}"`
        return {
          type: ToolType.variable,
          target: ToolContext.sprite,
          keyword,
          desc: { en: `Animation "${animation.name}"`, zh: `动画 ${animation.name}` },
          usage: {
            sample: keyword,
            insertText: keyword
          }
        }
      })
    })
    groups.push({
      label: {
        en: `Costumes of "${project.selectedSprite.name}"`,
        zh: `${project.selectedSprite.name} 的造型`
      },
      tools: project.selectedSprite.costumes.map((costume) => {
        const keyword = `"${costume.name}"`
        return {
          type: ToolType.variable,
          target: ToolContext.sprite,
          keyword,
          desc: { en: `Costume "${costume.name}"`, zh: `造型 ${costume.name}` },
          usage: {
            sample: keyword,
            insertText: keyword
          }
        }
      })
    })
  }

  return {
    label: { en: 'Variable', zh: '变量' },
    groups
  }
}

export function getAllTools(project: Project): Tool[] {
  return [
    eventCategory,
    motionCategory,
    lookCategory,
    sensingCategory,
    soundCategory,
    controlCategory,
    gameCategory,
    getVariableCategory(project)
  ]
    .map((c) => c.groups.map((g) => g.tools))
    .flat(2)
    .concat(...spx.keys)
}
