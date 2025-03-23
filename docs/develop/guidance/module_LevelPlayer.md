```ts
// LevelPlayer模块主要负责执行VideoPlayer和NodeTaskPlayer模块
type Props = {
    storyLineInfo: StoryLine
    currentLevelIndex: number
}
type Placement = {
  /** X position in px */
  x: number
  /** Y position in px */
  y: number
}
type LevelPlayerCtx = {
  getPos(): Placement
  setPos(pos: Placement): void
  getVideoPlayerVisible(): boolean
  setVideoPlayerVisible(visible: boolean): void
}

declare function useLevelPlayerCtx(): LevelPlayerCtx
```

