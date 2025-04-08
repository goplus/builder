## 对外接口
故事线编辑模块
```ts
type Props = {
  storyLine: StoryLine // 故事线json
}

type Events = {
  save:[] // 保存
  'update:storyLine' : [MaybeSavedStoryLine] // 双向绑定
  levelChange: [number]  // 选中不同关卡进行编辑
  minimize: [boolean] // 最小化
}

type MaybeSavedStoryLine = Omit<StoryLine, 'id'> & {
  id?: string
}
```