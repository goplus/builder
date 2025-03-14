```ts
/**
 * VideoPlayer定位仅为 视频播放器部分
 */
type Props = {
  videoUrl: string
  segments: Segment[]
}
type Events = {
  // 当视频播放到分段结束时触发该事件，传入当前分段信息
  segmentEnd: [segment: Segment]
}
type Expose = {
  play(): void
  pause(): void
  showCover(): void // 展示封面
  hideCover(): void // 隐藏封面
  endCurrentSegment(): void // 结束当前分段的视频播放
  enterFullScreen(): void // 进入全屏播放
  exitFullScreen(): void // 退出全屏播放
  reset(): void // 重置视频状态
}

type Segment {
  endTime: number // 分段的视频结束点在整个视频中的位置，单位秒（s）
  extension?: Object // 其他可扩展信息
}

type Slots = {
  /**
   * 供父组件插入的具名插槽(<slot name="cover"></slot>)，用于自定义展示视频上的封面 UI。
  */
  cover: unknown
}
```
