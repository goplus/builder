```ts
type Props = {
  nodeTask: NodeTask // 节点任务信息
}
type Events = {
  'update:nodeTask' : [NodeTask] // 节点任务
  selectCurrentStep: [number] // 选中步骤列表中的一个步骤
}
```