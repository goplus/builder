```ts
// NodeTaskPlayer 工具类：用于执行单个节点任务，协调节点任务下的多个步骤（每个步骤由 StepPlayer 组件实现）
// 该类的构造函数接收一个 NodeTaskId
class NodeTaskPlayer {
  private nodeTaskId: number
  private steps: Step[]      // 假设 StepPlayer 是某个步骤的处理类
  private currentStepIndex: number = 0
  // LevelCoordinator 可通过该回调知道该节点任务下所有步骤已经完成
  finishedCallback: () => void = () => {}

  constructor(nodeTaskId: number) {
    this.nodeTaskId = nodeTaskId
    // 根据 nodeTaskId 加载该节点任务下的所有步骤
    this.steps = this.loadStepsForTask(this.nodeTaskId)
  }

  private async loadStepsForTask(taskId: number): Step[] {
    const response = await fetch(`/api/tasks/${this.nodeTaskId}/steps`)
    const data = await response.json()
    return data as Step[]
  }

  // 获取当前步骤
  public getCurrentStep(): Step | undefined {
    return this.steps[this.currentStepIndex]
  }

  // 当前步骤完成后，更新内部状态；如果所有步骤完成，则调用 finishedCallback
  public completeCurrentStep(): void {
    this.currentStepIndex++
    if (this.currentStepIndex >= this.steps.length) {
      // 该节点任务下所有步骤均完成，通知 LevelCoordinator
      this.finishedCallback()
    }
  }
}
```