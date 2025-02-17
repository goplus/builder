```ts
// LevelPlayer模块主要负责执行VideoPlayer和NodeTaskPlayer模块
type Props = {
    level: Level
}
type LevelPlayerCtx = {
  getPos(): Placement
  setPos(pos: Placement): void
}

declare function useLevelPlayerCtx(): LevelPlayerCtx
```

