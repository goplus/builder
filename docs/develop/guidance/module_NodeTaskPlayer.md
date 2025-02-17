```ts
// NodeTaskPlayer 的对外接口主要提供给LevelPlayer模块调用
type Props = {
  nodeTask: NodeTask
}
type Events = {
  nodeTaskCompleted: []
}
type Expose = {
  /** NodeTaskPlayer作为LevelPlayer和StepPlayer的中间组件，
   * 对StepPlayer expose的内容进行转发
   */
  getStepPlayerAPI(): StepPlayerExpose; 
}
type NodeTask = {
    name: LocaleMessage,					// 节点名称
    triggerTime: number,					// 节点在视频中的触发时间(单位：秒)
    video: string,
    steps: Step[],
}
```