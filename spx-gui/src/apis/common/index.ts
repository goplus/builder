import { Client } from './client'

export type PaginationParams = {
  pageSize?: number
  pageIndex?: number
}

export type ByPage<T> = {
  total: number
  data: T[]
}

export const ownerAll = '*'

export enum Visibility {
  Private = 'private',
  Public = 'public'
}

/** Url with 'http:', 'https:', or 'data:' schemes, used for web resources that can be accessed directly via `fetch()` */
export type WebUrl = string

/** Url for universal resources, which could be either a WebUrl or a Url with a custom scheme like 'kodo:' */
export type UniversalUrl = string

/** Map from UniversalUrl to WebUrl */
export type UniversalToWebUrlMap = {
  [universalUrl: UniversalUrl]: WebUrl
}

/** Map from relative path to UniversalUrl */
export type FileCollection = {
  [path: string]: UniversalUrl
}

/** Get time string for spx-backend APIs */
export function timeStringify(time: number) {
  return new Date(time).toISOString()
}

export const client = new Client()

/** Art style indicates the visual style or aesthetic approach used in the creation of graphics */
export const enum ArtStyle {
  /** Pixel Art is a form of digital art where images are created and edited at the pixel level, often characterized by its blocky appearance and limited color palettes. */
  PixelArt = 'pixel-art',
  /** Flat Design is a minimalist design style that emphasizes usability, featuring clean, open space, crisp edges, bright colors, and two-dimensional illustrations. */
  FlatDesign = 'flat-design',
  /** Hand-Drawn art style involves creating images manually, often with a sketchy or illustrative look, emphasizing organic shapes and lines. */
  HandDrawn = 'hand-drawn',
  /** Low-Poly art style uses a minimal number of polygons to create 3D models, resulting in a stylized, geometric appearance often seen in early 3D video games. */
  LowPoly = 'low-poly',
  /** Ghibli art style is a Japanese animation style that emphasizes movement, energy, and a sense of wonder. */
  Ghibli = 'ghibli',
  Unspecified = 'unspecified'
}

/** Perspective indicates the viewpoint from which the "game world" is viewed */
export const enum Perspective {
  /**
   * Angled Top-Down (also known as 3/4 view or dimetric projection):
   * The camera is still looking down from above, but at an angle (commonly between 45° and 60°).
   * This perspective reveals both the top and sides of objects, providing a better sense of depth, volume, and character detail.
   */
  AngledTopDown = 'angled-top-down',
  /**
   * Side-Scrolling (also known as a side view or 2D side perspective):
   * The camera is positioned to the side of the scene, looking horizontally across it.
   */
  SideScrolling = 'side-scrolling',
  Unspecified = 'unspecified'
}

export const enum SpriteCategory {
  /** Character sprites represent the main figures or entities that players control or interact with in a game. */
  Character = 'character',
  /** Item sprites represent functional objects that players can collect, consume, equip, or otherwise use to affect gameplay mechanics. */
  Item = 'item',
  /** Effect sprites represent visual effects such as explosions, magic spells, or weather effects that add atmosphere or feedback to the game. */
  Effect = 'effect',
  /** UI sprites are graphical elements used in the user interface, such as buttons, icons, and menus, to facilitate player interaction with the game. */
  UI = 'ui',
  Unspecified = 'unspecified'
}

export const enum BackdropCategory {
  /** UI backdrops are designed specifically for user interface elements, providing a visually appealing background for menus, dialogs, and other interactive components. */
  UI = 'ui',
  Unspecified = 'unspecified'
}

export const enum SoundCategory {
  /** Sound effects are audio elements that enhance the gaming experience by providing auditory feedback for actions, events, or interactions within the game. */
  Effect = 'effect',
  /** Music tracks are composed pieces that set the tone, mood, and atmosphere of the game, often playing in the background during gameplay or specific scenes. */
  Music = 'music',
  /** Ambience sounds create an immersive environment by simulating background noises that reflect the setting of the game, such as forest sounds, cityscapes, or weather effects. */
  Ambience = 'ambience',
  /** Other sounds represent any other types of sounds that do not fit into the predefined categories. */
  Other = 'other'
}

export const enum AnimationLoopMode {
  /** For loopable animations, the 1st frame and the last frame are connected to form a seamless loop. */
  Loopable = 'loopable',
  /** Non-loopable animations do not connect the 1st and last frames, resulting in a clear start and end. */
  NonLoopable = 'non-loopable'
}
