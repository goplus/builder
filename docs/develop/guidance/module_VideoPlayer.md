```ts
type Props = {
  videoUrl: string
  segments: Segment[]
}
type Events = {
  // 当视频播放到分段点时触发该事件，传入当前分段点信息
  segmentReached: [segment: Segment]
  // 用户点击了缩放状态切换按钮触发该事件
  cardToggle: [isMinimized: boolean]
}
type Expose = {
  play(): void
  pause(): void
  showCover(): void // 展示封面
  hideCover(): void // 隐藏封面
  minimizeCard(): void // 最小化卡片
  restoreCard(): void // 恢复卡片
}

interface Segment {
  time: number // 分段点在视频中的位置，单位秒（s）
  extension?: Object // 其他可扩展信息
}

type Slots = {
  /** 
   * 供父组件插入的具名插槽(<slot name="cover"></slot>)，用于自定义展示视频上的封面 UI。
  */
  cover: unknown
  /** 
   * 供父组件插入的具名插槽(<slot name="header-left"></slot>)，
   * 父组件可在标题栏左侧添加多个按钮以满足个性化需求
  */
  header-left: unknown
  /** 
   * 供父组件插入的具名插槽(<slot name="header-right"></slot>)，
   * 父组件可在标题栏右侧添加多个按钮以满足个性化需求
  */
  header-right: unknown
}
```