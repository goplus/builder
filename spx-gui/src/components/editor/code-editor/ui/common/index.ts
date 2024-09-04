import {
  type AudioPlayer,
  type DocPreview,
  Icon,
  type LayerContent,
  type RenamePreview
} from '@/components/editor/code-editor/EditorUI'

export * from './monaco-editor-core'

import IconListen from '../icons/listen.svg?raw'
import IconRead from '../icons/read.svg?raw'
import IconEffect from '../icons/effect.svg?raw'
import IconCode from '../icons/code.svg?raw'
import IconAIAbility from '../icons/ai-helper.svg?raw'
import IconDocument from '../icons/document.svg?raw'
import IconRename from '../icons/rename.svg?raw'
import IconPlaylist from '../icons/playlist.svg?raw'
import iconEvent from '../icons/event.svg?raw'
import iconLook from '../icons/look.svg?raw'
import iconMotion from '../icons/motion.svg?raw'
import iconSound from '../icons/sound.svg?raw'
import iconControl from '../icons/control.svg?raw'
import iconGame from '../icons/game.svg?raw'
import iconSensing from '../icons/sensing.svg?raw'
import iconVariable from '../icons/variable.svg?raw'

/** transform icon enum to raw svg html content */
export function icon2SVG(icon: Icon): string {
  switch (icon) {
    case Icon.Function:
      return IconEffect
    case Icon.Event:
      return iconEvent
    case Icon.Listen:
      return IconListen
    case Icon.Prototype:
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
      return iconLook
    case Icon.Motion:
      return iconMotion
    case Icon.Sound:
      return iconSound
    case Icon.Control:
      return iconControl
    case Icon.Sensing:
      return iconSensing
    case Icon.Game:
      return iconGame
    case Icon.Variable:
      return iconVariable
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
