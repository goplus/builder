import { flatten } from 'lodash'
import type { Project } from '@/models/project'
import { type Snippet, SnippetTarget, SnippetType } from './common'
import * as gop from './gop'
import * as spx from './spx'

export { type Snippet, SnippetTarget, SnippetType }

export const eventSnippets = [
  [spx.onStart],
  [spx.onClick, spx.onKey, spx.onKeys, spx.onAnyKey],
  [spx.onMoving, spx.onTurning],
  [spx.onMsg1, spx.onMsg2, spx.broadcast1, spx.broadcast2, spx.broadcast3],
  [spx.onCloned],
  [spx.onScene1, spx.onScene2],
  [spx.onTouched1, spx.onTouched2, spx.onTouched3]
]

const motionMoveSnippets = [spx.move, spx.goto, spx.glide1, spx.glide2]

const motionPosSnippets = [
  spx.setXYpos,
  spx.changeXYpos,
  spx.xpos,
  spx.setXpos,
  spx.changeXpos,
  spx.ypos,
  spx.setYpos,
  spx.changeYpos
]

const motionHeadingSnippets = [
  spx.heading,
  spx.turnTo1,
  spx.turnTo2,
  spx.setHeading,
  spx.changeHeading,
  spx.up,
  spx.down,
  spx.left,
  spx.right
]

const motionSizeSnippets = [spx.size, spx.setSize, spx.changeSize]

const motionOtherSnippets = [spx.bounceOffEdge]

export const motionSnippets = [
  motionMoveSnippets,
  motionPosSnippets,
  motionHeadingSnippets,
  motionSizeSnippets,
  motionOtherSnippets
]

const lookVisibilitySnippets = [spx.hide, spx.show, spx.visible]

const lookBehaviorSnippets = [spx.say1, spx.say2, spx.think1, spx.think2]

const lookCostumeSnippets = [
  spx.costumeName,
  spx.costumeIndex,
  spx.setCostume,
  spx.nextCostume,
  spx.prevCostume
]

const lookSceneSnippets = [
  spx.sceneName,
  spx.sceneIndex,
  spx.startScene1,
  spx.startScene2,
  spx.nextScene1,
  spx.nextScene2,
  spx.prevScene1,
  spx.prevScene2
]

export const lookSnippets = [
  lookVisibilitySnippets,
  lookBehaviorSnippets,
  lookCostumeSnippets,
  lookSceneSnippets
]

const sensingDistanceSnippets = [
  spx.touching,
  spx.distanceTo,
  spx.edge,
  spx.edgeLeft,
  spx.edgeRight,
  spx.edgeTop,
  spx.edgeBottom
]

const sensingMouseSnippets = [spx.mouseX, spx.mouseY, spx.mousePressed, spx.mouseHitItem, spx.mouse]

const sensingKeyboardSnippets = [
  spx.keyPressed
  // ...spx.keys // TODO
]

export const sensingSnippets = [
  sensingDistanceSnippets,
  sensingMouseSnippets,
  sensingKeyboardSnippets
]

const soundPlayStopSnippets = [spx.play1, spx.play2, spx.stopAllSounds]

const soundVolumeSnippets = [spx.volume, spx.setVolume, spx.changeVolume]

export const soundSnippets = [soundPlayStopSnippets, soundVolumeSnippets]

export const controlSnippets = [
  [spx.wait],
  [gop.ifStatemeent, gop.ifElseStatemeent],
  [gop.forLoop, gop.forRange, gop.forRangeSet]
]

const gameStopSnippets = [spx.exit]

const gameSpriteSnippets = [spx.clone, spx.die]

const gameUtilsSnippets = [spx.rand, gop.println]

export const gameSnippets = [gameUtilsSnippets, gameSpriteSnippets, gameStopSnippets]

export function getVariableSnippets(project: Project) {
  // TODO: costumes & backdrops here
  const { sprites, sounds } = project
  const snippets: Snippet[][] = [[gop.varDefinition]]
  snippets.push(
    sprites.map((sprite) => ({
      type: SnippetType.variable,
      target: SnippetTarget.all,
      label: sprite.name,
      desc: { en: `Sprite "${sprite.name}"`, zh: `精灵 ${sprite.name}` },
      insertText: `"${sprite.name}"`
    }))
  )
  snippets.push(
    sounds.map((sound) => ({
      type: SnippetType.variable,
      target: SnippetTarget.all,
      label: sound.name,
      desc: { en: `Sound "${sound.name}"`, zh: `声音 ${sound.name}` },
      insertText: `"${sound.name}"`
    }))
  )
  return snippets
}

export function getAllSnippets(project?: Project) {
  return flatten([
    ...eventSnippets,
    ...motionSnippets,
    ...lookSnippets,
    ...sensingSnippets,
    ...soundSnippets,
    ...controlSnippets,
    ...gameSnippets,
    ...spx.keys,
    ...(project != null ? getVariableSnippets(project) : [])
  ])
}
