import type { Token, TokenCategory, TokenGroup } from './types'
import { defineConst } from './spx'
import * as spx from './spx'
import * as gop from './gop'
import type { Project } from '@/models/project'

export const eventCategory: TokenCategory = {
  label: { en: 'Event', zh: '事件' },
  groups: [
    {
      label: { en: 'Game Events', zh: '游戏事件' },
      tokens: [spx.onStart]
    },
    {
      label: { en: 'Sensing Events', zh: '感知事件' },
      tokens: [spx.onClick, spx.onKey, spx.onAnyKey]
    },
    {
      label: { en: 'Motion Events', zh: '运动事件' },
      tokens: [spx.onMoving, spx.onTurning]
    },
    {
      label: { en: 'Message Events', zh: '消息事件' },
      tokens: [spx.onMsg, spx.broadcast]
    },
    {
      label: { en: 'Sprite Events', zh: '精灵事件' },
      tokens: [spx.onCloned]
    },
    {
      label: { en: 'Stage Events', zh: '舞台事件' },
      tokens: [spx.onBackdrop]
    }
  ]
}

export const motionCategory: TokenCategory = {
  label: { en: 'Motion', zh: '运动' },
  groups: [
    {
      label: { en: 'Move', zh: '移动' },
      tokens: [spx.step, spx.move, spx.goto, spx.glide]
    },
    {
      label: { en: 'Position', zh: '位置' },
      tokens: [
        spx.xpos,
        spx.ypos,
        spx.setXYpos,
        spx.changeXYpos,
        spx.setXpos,
        spx.changeXpos,
        spx.setYpos,
        spx.changeYpos
      ]
    },
    {
      label: { en: 'Rotation', zh: '旋转' },
      tokens: [spx.setRotationStyle, spx.normal, spx.leftRight, spx.none]
    },
    {
      label: { en: 'Heading', zh: '方向' },
      tokens: [
        spx.heading,
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
      tokens: [spx.size, spx.setSize, spx.changeSize]
    },
    {
      label: { en: 'Others', zh: '其他' },
      tokens: [spx.bounceOffEdge]
    }
  ]
}

export const lookCategory: TokenCategory = {
  label: { en: 'Look', zh: '外观' },
  groups: [
    {
      label: { en: 'Visibility', zh: '显示/隐藏' },
      tokens: [spx.visible, spx.hide, spx.show]
    },
    {
      label: { en: 'Behavior', zh: '行为' },
      tokens: [spx.say, spx.think]
    },
    {
      label: { en: 'Costume', zh: '造型' },
      // index-related tools are excluded, as they are not recommended to use (animation is prefered)
      tokens: [spx.costumeName, spx.setCostume]
    },
    {
      label: { en: 'Animation', zh: '动画' },
      tokens: [spx.animate]
    },
    {
      label: { en: 'Backdrop', zh: '背景' },
      tokens: [
        spx.backdropName,
        spx.backdropIndex,
        spx.startBackdrop,
        spx.nextBackdrop,
        spx.prevBackdrop
      ]
    }
  ]
}

export const sensingCategory: TokenCategory = {
  label: { en: 'Sensing', zh: '感知' },
  groups: [
    {
      label: { en: 'Distance', zh: '距离' },
      tokens: [
        spx.touching,
        spx.distanceTo,
        spx.edge,
        spx.edgeLeft,
        spx.edgeRight,
        spx.edgeTop,
        spx.edgeBottom
      ]
    },
    {
      label: { en: 'Mouse', zh: '鼠标' },
      tokens: [spx.mouseX, spx.mouseY, spx.mousePressed, spx.mouseHitItem, spx.mouse]
    },
    {
      label: { en: 'Keyboard', zh: '键盘' },
      tokens: [
        spx.keyPressed
        // ...spx.keys // TODO
      ]
    }
  ]
}

export const soundCategory: TokenCategory = {
  label: { en: 'Sound', zh: '声音' },
  groups: [
    {
      label: { en: 'Play / Stop', zh: '播放/停止' },
      tokens: [spx.play, spx.stopAllSounds]
    },
    {
      label: { en: 'Volume', zh: '音量' },
      tokens: [spx.volume, spx.setVolume, spx.changeVolume]
    }
  ]
}

export const controlCategory: TokenCategory = {
  label: { en: 'Control', zh: '控制' },
  groups: [
    {
      label: { en: 'Time', zh: '时间' },
      tokens: [spx.wait]
    },
    {
      label: { en: 'Flow Control', zh: '流程控制' },
      tokens: [gop.ifStatement, gop.forLoop]
    },
    {
      label: { en: 'Function', zh: '函数' },
      tokens: [gop.functionDefinition]
    }
  ]
}

export const gameCategory: TokenCategory = {
  label: { en: 'Game', zh: '游戏' },
  groups: [
    {
      label: { en: 'Start / Stop', zh: '开始/停止' },
      tokens: [spx.exit]
    },
    {
      label: { en: 'Sprite', zh: '精灵' },
      tokens: [spx.clone, spx.die]
    },
    {
      label: { en: 'Others', zh: '其他' },
      tokens: [spx.rand, gop.println]
    }
  ]
}

export function getVariableCategory(project: Project): TokenCategory {
  const { sprites, sounds } = project
  const groups: TokenGroup[] = [
    {
      label: { en: 'Variable Definition', zh: '变量定义' },
      tokens: [gop.varDefinition]
    }
  ]

  groups.push({
    label: { en: 'Sprites', zh: '精灵' },
    tokens: sprites.map((sprite) => {
      const keyword = `"${sprite.name}"`
      return defineConst(keyword, 'main')
    })
  })

  groups.push({
    label: { en: 'Sounds', zh: '声音' },
    tokens: sounds.map((sound) => {
      const keyword = `"${sound.name}"`
      return defineConst(keyword, 'main')
    })
  })

  groups.push({
    label: { en: 'Backdrops', zh: '背景' },
    tokens: project.stage.backdrops.map((backdrop) => {
      const keyword = `"${backdrop.name}"`
      return defineConst(keyword, 'main')
    })
  })

  if (project.selectedSprite != null) {
    groups.push({
      label: {
        en: `Animations of "${project.selectedSprite.name}"`,
        zh: `${project.selectedSprite.name} 的动画`
      },
      tokens: project.selectedSprite.animations.map((animation) => {
        const keyword = `"${animation.name}"`
        return defineConst(keyword, 'main')
      })
    })
    groups.push({
      label: {
        en: `Costumes of "${project.selectedSprite.name}"`,
        zh: `${project.selectedSprite.name} 的造型`
      },
      tokens: project.selectedSprite.costumes.map((costume) => {
        const keyword = `"${costume.name}"`
        return defineConst(keyword, 'main')
      })
    })
  }

  return {
    label: { en: 'Variable', zh: '变量' },
    groups
  }
}

export function getGroupTokens(project: Project): Token[] {
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
    .map((c) => c.groups.map((g) => g.tokens))
    .flat(2)
    .concat(...spx.keys)
}
