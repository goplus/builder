import type { LocaleMessage } from '@/utils/i18n'

import IconListen from '../../icons/listen.svg?raw'
import IconRead from '../../icons/read.svg?raw'
import IconEffect from '../../icons/effect.svg?raw'
import IconCode from '../../icons/code.svg?raw'
import IconAIAbility from '../../icons/ai-helper.svg?raw'

export interface IRange {
  startLineNumber: number
  endLineNumber: number
  startColumn: number
  endColumn: number
}

export type Position = {
  column: number
  lineNumber: number
}

export enum IconEnum {
  Function,
  Event,
  Prototype,
  Keywords,
  AIAbility,
  Document,
  Rename,
  List
}

export type Icon = IconEnum

export type Markdown = string

export type AudioPlayer = {
  src: string
  duration: number
}

export interface RenamePreview {
  placeholder: string
  onSubmit(
    newName: string,
    ctx: {
      signal: AbortSignal
    },
    setError: (message: string) => void
  ): Promise<void>
}

export type RecommendAction = {
  label: string
  activeLabel: string
  onActiveLabelClick(): void | LayerContent
}

export type Action = {
  icon: Icon
  label: string
  onClick(): void | LayerContent
}

export type DocPreview = {
  content: Markdown
  recommendAction?: RecommendAction | undefined
  moreActions?: Action[] | undefined
}

export type LayerContent = DocPreview | AudioPlayer | RenamePreview

export enum ToolType {
  method,
  function,
  constant,
  keyword,
  variable
}

export enum ToolCallEffect {
  read,
  write,
  listen
}

export enum ToolContext {
  /** Availible only in sprite code files */
  sprite,
  /** Availible only in stage code files */
  stage,
  /** Availible in all code files */
  all
}

export type ToolUsage = {
  /** Description for usage, without tailing dot */
  desc: LocaleMessage
  /** Code sample, usually it's similar while sightly different with `insertText` */
  sample: string
  /**
   * A string or snippet that should be inserted in a document for the usage.
   * Same with `languages.CompletionItem.insertText`.
   */
  insertText: string
}

export type Tool = {
  type: ToolType
  /**
   * The calling effect, only exists for function & method tool.
   * `undefined` means no effect.
   */
  callEffect?: ToolCallEffect
  target: ToolContext
  keyword: string
  /** Description, without tailing dot */
  desc: LocaleMessage
  usage?: Omit<ToolUsage, 'desc'>
  usages?: ToolUsage[]
}

export function Icon2SVG(icon: Icon): string {
  switch (icon) {
    case IconEnum.Function:
      return IconEffect
    case IconEnum.Event:
      return IconListen
    case IconEnum.Prototype:
      return IconRead
    case IconEnum.Keywords:
      return IconCode
    case IconEnum.AIAbility:
      return IconAIAbility
    case IconEnum.Document:
      return IconEffect
    case IconEnum.Rename:
      return IconEffect
    case IconEnum.List:
      return IconEffect
  }
}

/**
 * Determine whether $el is closer to the top or bottom of $container
 * @param {HTMLElement} $container - main container element
 * @param {HTMLElement} $el - element to check
 * @returns {'top' | 'bottom'} - 'top' or 'bottom'
 */
export function determineClosestEdge($container: HTMLElement, $el: HTMLElement): 'top' | 'bottom' {
  const containerRect = $container.getBoundingClientRect()
  const elementRect = $el.getBoundingClientRect()

  const topDistance = elementRect.top - containerRect.top
  const bottomDistance = containerRect.bottom - elementRect.bottom

  return topDistance < bottomDistance ? 'top' : 'bottom'
}

/**
 * Check whether $el is in viewport of $container
 * @param {HTMLElement} $container - main container element
 * @param {HTMLElement} $el - element to check
 * @returns {boolean} - whether $el is in viewport of $container
 */
export function isElementInViewport($container: Element, $el: Element): boolean {
  const containerRect = $container.getBoundingClientRect()
  const elementRect = $el.getBoundingClientRect()
  return elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom
}

/**
 * normalize icon size to static size, like npm package XIcon component.
 * @param {Element} $el - icon element
 * @param {number} size - icon size, only for square icon
 * @returns {undefined} - return `undefined` to satisfy some ts error, like vue component ref property need callback function return undefined
 */
export function normalizeIconSize($el: Element | null, size: number): undefined {
  const $icon = $el?.firstElementChild
  if (!$icon) return
  $icon.setAttribute('height', String(size))
  $icon.setAttribute('width', String(size))
}
