export interface Router {
  currentRoute: any
  push(path: string): void
}
export declare class Runtime {}
export declare class Project {
  stage: Stage
  sprites: Sprite[]
  sounds: Sound[]
}
export declare class Stage {
  widgets: Widget[]
  backdrops: Backdrop[]
}
export declare class Sprite {
  id: string
  name: string
  costumes: Costume[]
  animations: Animation[]
}
export declare class Sound {
  id: string
  name: string
}
export declare class Backdrop {
  id: string
  name: string
}
export declare class Widget {
  id: string
  name: string
}
export declare class Animation {
  id: string
  name: string
}
export declare class Costume {
  id: string
  name: string
}
export type ResourceModel = Stage | Sound | Sprite | Backdrop | Widget | Animation | Costume

export type UI = any
export type WatchSource<T> = (() => T) | {
  value: T
}
export declare function toValue<T>(source: WatchSource<T>): T
export declare function watch<T>(source: WatchSource<T>, callback: (value: T) => void, options?: { immediate?: boolean }): void

export function shiftSegment(path: string): [segment: string, extra: string] {
  const idx = path.indexOf('/')
  if (idx === -1) return [path, '']
  return [path.slice(0, idx), path.slice(idx)]
}

export type ResourceURI = string

export type ResourceIdentifier = {
  uri: ResourceURI
}
