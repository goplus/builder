```ts
type Props = {
  step: Step  // 已有的 Step 类型
}
type Events = {
  stepCompleted: []
}

type StepPlayerExpose = {
  checkAnswer(): boolean
}
```
