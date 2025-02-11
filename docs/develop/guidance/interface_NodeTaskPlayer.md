```ts
// NodeTaskPlayer 的对外接口主要提供给LevelCoordinator模块调用
class NodeTaskPlayer {
  constructor(nodeTaskId: number)
  getCurrentStep(): Step
  completeCurrentStep(): void
}
```