import { Icon } from '@/components/editor/code-editor/EditorUI'

export * from './monaco-editor-core'

import IconListen from '../icons/listen.svg?raw'
import IconRead from '../icons/read.svg?raw'
import IconEffect from '../icons/effect.svg?raw'
import IconCode from '../icons/code.svg?raw'
import IconAIAbility from '../icons/ai-helper.svg?raw'
import IconDocument from '../icons/document.svg?raw'
import IconRename from '../icons/rename.svg?raw'
import IconPlaylist from '../icons/playlist.svg?raw'
import IconEvent from '../icons/event.svg?raw'
import IconLook from '../icons/look.svg?raw'
import IconMotion from '../icons/motion.svg?raw'
import IconSound from '../icons/sound.svg?raw'
import IconControl from '../icons/control.svg?raw'
import IconGame from '../icons/game.svg?raw'
import IconSensing from '../icons/sensing.svg?raw'
import IconVariable from '../icons/variable.svg?raw'

/** transform icon enum to raw svg html content */
export function icon2SVG(icon: Icon): string {
  switch (icon) {
    case Icon.Event:
      return IconEvent
    case Icon.Listen:
      return IconListen
    case Icon.Property:
      return IconRead
    case Icon.Keywords:
      return IconCode
    case Icon.AIAbility:
      return IconAIAbility
    case Icon.Document:
      return IconDocument
    case Icon.Rename:
      return IconRename
    case Icon.Playlist:
      return IconPlaylist
    case Icon.Look:
      return IconLook
    case Icon.Motion:
      return IconMotion
    case Icon.Sound:
      return IconSound
    case Icon.Control:
      return IconControl
    case Icon.Sensing:
      return IconSensing
    case Icon.Game:
      return IconGame
    case Icon.Variable:
      return IconVariable
    case Icon.Read:
      return IconRead
    case Icon.Code:
      return IconCode
    case Icon.Function:
      return IconEffect
    default:
      return IconEffect
  }
}

/** Determine whether checkElement is closer to the top or bottom of containerElement */
export function determineClosestEdge(
  containerElement: HTMLElement,
  checkElement: HTMLElement
): 'top' | 'bottom' {
  const containerRect = containerElement.getBoundingClientRect()
  const elementRect = checkElement.getBoundingClientRect()

  const topDistance = elementRect.top - containerRect.top
  const bottomDistance = containerRect.bottom - elementRect.bottom

  return topDistance < bottomDistance ? 'top' : 'bottom'
}

/** Check whether checkElement is in viewport of containerElement */
export function isElementInViewport(containerElement: Element, checkElement: Element): boolean {
  const containerRect = containerElement.getBoundingClientRect()
  const elementRect = checkElement.getBoundingClientRect()
  return elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom
}

/** normalize icon size to static size, like npm package XIcon component */
export function normalizeIconSize(
  targetElement: Element | null,
  size: number,
  height = size
): undefined {
  const innerSvgElement = targetElement?.firstElementChild
  if (!innerSvgElement) return
  innerSvgElement.setAttribute('height', String(height))
  innerSvgElement.setAttribute('width', String(size))
}
