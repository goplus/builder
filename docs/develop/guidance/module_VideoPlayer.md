```ts
/** 
 * VideoPlayer定位仅为 视频播放器部分
 */
type Props = {
  videoUrl: string
  segments: Segment[]
}
type Events = {
  // 当视频播放到分段点时触发该事件，传入当前分段点信息
  segmentReached: [segment: Segment]
}
type Expose = {
  play(): void
  pause(): void
  showCover(): void // 展示封面
  hideCover(): void // 隐藏封面
  skipCurrentVideo(): void // 跳过当前分段点视频播放
}

type Segment {
  time: number // 分段点在视频中的位置，单位秒（s）
  extension?: Object // 其他可扩展信息
}

type Slots = {
  /** 
   * 供父组件插入的具名插槽(<slot name="cover"></slot>)，用于自定义展示视频上的封面 UI。
  */
  cover: unknown
}
```