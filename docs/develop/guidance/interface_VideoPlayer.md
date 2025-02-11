```ts
// VideoPlayer 的对外接口在向导中主要提供给LevelCoordinator模块调用
type Props = {
  videoUrl: string
  segments: Segment[]
}
type Events = {
  segment-reached: [segment: Segment]
}
type Expose = {
  play(): void
  pause(): void
  coverShow(): void
  coverHide(): void
}

interface Segment {
  time: number // 分段点在视频中的位置
  extension?: object // 其他可扩展信息
}
// 在Builder向导中 extension可能为
interface extension {
  nodeTaskId: number
}
```