# BackEnd

## 故事线接口

### 出题接口

#### 接口名称：创建故事线

- 由引导编辑器调用，用于故事线的创建
- `Post`: `/guidanceEdit/storyLine/create`
- 请求参数

```typescript
{
  index: number,
  tag: string,							// 难度标签
  backgroundImage: string,
  title: string,
  description: string,
}
```

#### 接口名称：修改故事线

- 由引导编辑器调用，用于故事线信息的修改
- `Post`:`/guidanceEdit/storyLine/update`
- 请求参数

```typescript
{
  storyId: number,
  index: number,
  tag: string,							// 难度标签
  backgroundImage: string,
  title: string,
  description: string,
}
```

#### 接口名称：删除故事线

- 由引导编辑器调用，用于故事线的删除，在数据库中的表现形式为修改status字段
- `Post`:`/guidanceEdit/storyLine/delete`
- 请求参数

```typescript
{
  storyId: number,
}
```

### 用户接口

#### 接口名称：创建故事线和用户的关系

- 在用户首次进入新的故事线界面时进行调用，创建故事线和用户的关系
- `Post`:`/guidance/storyLine/createRelationship`
- 请求参数

```typescript
{
  userId: number,
  storyLineId: number,
}
```

#### 接口名称：获取故事线页面信息

- 获取与用户关联的故事线信息，用于故事线页面渲染
- `Post`:`/guidance/storyLine/getByUser`
- 请求参数

```typescript
{
  userId: number,
  storyLineId: number,
}
```

- 返回参数

```typescript
{
  storyLine: {
    backgroundImage: string,
    title: string,
    description: string
  },
  levels: [ // 可能有多个
    {
      levelId: number,
      index: number,
      cover: string,				// 封面
      coordinate: number[], // 在界面上的位置信息
      levelTitle: string,
      levelDescription: string,
      status: number,
      achievement: [ // 成就与关卡绑定
        icon: string,
        infoText: string,
        status: number,
      ]
    }
  ]
}
```

#### 接口名称：完成故事线

- 当用户完成一个故事线的所有关卡时，修改故事线的status
- `Post`:`/guidance/storyLine/finish`
- 请求参数

```typescript
{
  userId: number,
  storyLineId: number,
}
```

## 关卡接口

### 出题接口

#### 接口名称：创建关卡

- 由引导编辑器调用，当用户已经创建好故事线之后，用于后续关卡的创建。注：一个关卡对应一个视频，而该视频是由所有的节点任务视频拼接而成，在创建好所有的节点任务之后由后端自动拼接并保存在数据库中。后续若有节点任务的视频被修改，也是同样由后端拼接好后，在数据库中自动修改。
- `Post`:`/guidanceEdit/level/create`
- 请求参数

```typescript
{
  storyId: number,
  index: number,
  title: string,
  cover: string,
  coordinate number[],			// 关卡在故事线页面的位置
  levelTitle: string,
  levelDescription: string,
  achievements: [
    {
      index: number,
      icon: string,
      infoText: string,
    }
  ]
}
```

#### 接口名称：修改关卡

- 由引导编辑器调用，用于修改关卡信息
- `Post`:`/guidanceEdit/level/update`
- 请求参数

```typescript
{
  levelId: number,
  index: number,
  title: string,
  cover: string,
  coordinate number[],			// 关卡在故事线页面的位置
  levelTitle: string,
  levelDescription: string,
  achievements: [
    {
      index: number,
      icon: string,
      infoText: string,
    }
  ]
}
```

#### 接口名称：删除关卡

- 由引导编辑器调用，用于删除关卡，在数据库中修改关卡的status
- `Post`:`/guidanceEdit/level/delete`
- 请求参数

```typescript
{
  levelId: number,
}
```

### 用户接口

#### 接口名称：创建关卡和用户的关系

- 用户首次进入新的关卡时调用，创建关卡和用户的关系
- `Post`:`/guidance/level/createRelationship`
- 请求参数

```typescript
{
  userId: number,
  levelId: number,
}
```

#### 接口名称：获取关卡信息

- 进入关卡时，获取渲染所需信息。此时获取的视频是由所有的节点任务拼接而成的视频。
- `Post`:`/guidance/level/getByUser`
- 请求参数

```typescript
{
  userId: number,
  levelId: number,
}
```

- 返回参数

```typescript
{

  levelDescription: string,
  video: string,
  achievements: [
    {
      index: number,
      icon: string,
      infoText: string,
    }
  ]
  nodeTasks: [ // 可能有多个
    {
      nodeTaskId: number,
      name: string,
      index: number,
      triggerTime: number,
    }
  ]
}
```

#### 接口名称：完成关卡

- 完成一个关卡的所有节点之后，调用此接口，修改数据库中关卡的status
- `Post`:`/guidance/level/finish`
- 请求参数

```typescript
{
  userId: number,
  levelId: number,
}
```

## 节点任务接口

### 出题接口

#### 接口名称：创建节点任务

- 由引导编辑器调用，用于节点任务的创建。一个节点任务对应一段视频。
- `Post`: `/guidanceEdit/nodeTask/create`
- 请求参数

```typescript
{
  levelId: number,
  name: string,
  index: number,
  triggerTime: date,
  video: string,
  videoQuality: string,
}
```

#### 接口名称：修改节点任务

- 由引导编辑器调用，用于节点任务的修改。
- `Post`:`/guidanceEdit/nodeTask/update`
- 请求参数

```typescript
{
  nodeTaskId: number,
  name: string,
  index: number,
  triggerTime: date,
  video: string,
  videoQuality: string,
}
```

#### 接口名称：删除节点任务

- 由引导编辑器调用，用于节点任务的删除。
- `Post`:`/guidanceEdit/nodeTask/delete`
- 请求参数

```typescript
{
  nodeTaskId: number,
}
```

## 步骤接口

### 出题接口

#### 接口名称：创建步骤

- 由引导编辑器调用，用于步骤的创建。
- `Post`:`/guidanceEdit/step/create`
- 请求参数


- - Coding步骤

```typescript
{
  nodeTaskId: number,
  title: string, 						// 步骤名称
  index: number, 						// 步骤次序
  description: string, 			// 步骤描述
  tip: string, 							// 互动提示（需要条件触发）
  duration: number, 				// 用户当前步骤卡顿距离给提示的时长（单位：秒）
  target: string, 					// 目标元素的id或者class字符串
  content: string, 					// 描述内容
  placement: number[], 			// 在UI展示的位置信息
  type: string,
  isCheck: bool, 						// 该步骤是否涉及快照比对
  targetHighlight: string,	// 语义化标注目标高亮元素
  apis: string,							// 该步骤中需要展示的Api Refrence
  spirits: string,					// 该步骤中需要被展示的精灵
  snapshot: [
    {
      kind: number,					// 快照类型
      content: string,			// 快照内容
    }
  ],
  coding: [
    {
      path: string,					// 编码文件路径
      tokenPos: number[][],	// 一个步骤里面可能有多个空，所以需要一个二维数组来存储，在第二维度，数组的长度为2，第一个位置存放初始mask，第二个位置存放结束mask
    }
  ]
}
```

- - 跟随式步骤

```typescript
{
  stepId: number,
  title: string, 						// 步骤名称
  index: number, 						// 步骤次序
  description: string, 			// 步骤描述
  tip: string, 							// 互动提示（需要条件触发）
  duration: number, 				// 用户当前步骤卡顿距离给提示的时长（单位：秒）
  target: string, 					// 目标元素的id或者class字符串
  content: string, 					// 描述内容
  placement: number[], 			// 在UI展示的位置信息
  type: string,
  isCheck: bool, 						// 该步骤是否涉及快照比对
  followingMaterial: [ 			// 跟随式任务的引导图片，只有在跟随式任务中才需要传入此参数
    {
      spriteSrc: string,		// 图片src
      placement: number[],	// 在UI展示的位置信息
      width: number,
      height: number,
    }
  ],
  targetHighlight: string,	// 语义化标注目标高亮元素
  apis: string,							// 该步骤中需要展示的Api Refrence
  spirits: string,					// 该步骤中需要被展示的精灵
  snapshot: [
    {
      kind: number,					// 快照类型
      content: string,			// 快照内容
    }
  ],
}
```

#### 接口名称：修改步骤

- 由引导编辑器调用，用于步骤的修改。
- `Post`:`/guidanceEdit/step/update`
- 请求参数


- - Coding步骤

```typescript
{
  stepId: number,
  title: string, 						// 步骤名称
  index: number, 						// 步骤次序
  description: string, 			// 步骤描述
  tip: string, 							// 互动提示（需要条件触发）
  duration: number, 				// 用户当前步骤卡顿距离给提示的时长（单位：秒）
  target: string, 					// 目标元素的id或者class字符串
  content: string, 					// 描述内容
  placement: number[], 			// 在UI展示的位置信息
  type: string,
  isCheck: bool, 						// 该步骤是否涉及快照比对
  targetHighlight: string,	// 语义化标注目标高亮元素
  apis: string,							// 该步骤中需要展示的Api Refrence
  spirits: string,					// 该步骤中需要被展示的精灵
  snapshot: [
    {
      kind: number,					// 快照类型
      content: string,			// 快照内容
    }
  ],
  coding: [
    {
      path: string,					// 编码文件路径
      tokenPos: number[][],	// 一个步骤里面可能有多个空，所以需要一个二维数组来存储，在第二维度，数组的长度为2，第一个位置存放初始mask，第二个位置存放结束mask
    }
  ]
}
```

- - 跟随式步骤

```typescript
{
  stepId: number,
  title: string, 						// 步骤名称
  index: number, 						// 步骤次序
  description: string, 			// 步骤描述
  tip: string, 							// 互动提示（需要条件触发）
  duration: number, 				// 用户当前步骤卡顿距离给提示的时长（单位：秒）
  target: string, 					// 目标元素的id或者class字符串
  content: string, 					// 描述内容
  placement: number[], 			// 在UI展示的位置信息
  type: string,
  isCheck: bool, 						// 该步骤是否涉及快照比对
  followingMaterial: [ 			// 跟随式任务的引导图片，只有在跟随式任务中才需要传入此参数
    {
      spriteSrc: string,		// 图片src
      placement: number[],	// 在UI展示的位置信息
      width: number,
      height: number,
    }
  ],
  targetHighlight: string,	// 语义化标注目标高亮元素
  apis: string,							// 该步骤中需要展示的Api Refrence
  spirits: string,					// 该步骤中需要被展示的精灵
  snapshot: [
    {
      kind: number,					// 快照类型
      content: string,			// 快照内容
    }
  ],
}
```

#### 接口名称：删除步骤

- 由引导编辑器调用，用于步骤的删除。
- `Post`:`/guidanceEdit/step/delete`
- 请求参数

```typescript
{
  stepId: number
}
```

### 用户接口

#### 接口名称：获取步骤

- 获取节点对应的步骤。
- `Post`:`/guidance/step/getStep`
- 请求参数

```typescript
{
  nodeTaskId: number
}
```

- 返回参数


- - 对于Coding任务

```typescript
{
  steps: [
    stepId: number,
    title: string, 						// 步骤名称
    index: number, 						// 步骤次序
    description: string, 			// 步骤描述
    tip: string, 							// 互动提示（需要条件触发）
    duration: number, 				// 用户当前步骤卡顿距离给提示的时长（单位：秒）
    target: string, 					// 目标元素的id或者class字符串
    content: string, 					// 描述内容
    placement: number[], 			// 在UI展示的位置信息
    type: string,
    isCheck: bool, 						// 该步骤是否涉及快照比对
    targetHighlight: string,	// 语义化标注目标高亮元素
    apis: string,							// 该步骤中需要展示的Api Refrence
    spirits: string,					// 该步骤中需要被展示的精灵
    snapshot: [
      {
        kind: number,					// 快照类型
        content: string,			// 快照内容
      }
    ],
    coding: [
      {
        path: string,					// 编码文件路径
        tokenPos: number[][],	// 一个步骤里面可能有多个空，所以需要一个二维数组来存储，在第二维度，数组的长度为2，第一个位置存放初始mask，第二个位置存放结束mask
      }
    ]
  ]
}
```

- - 对于跟随式任务

```typescript
{
  stepId: number,
  title: string, 						// 步骤名称
  index: number, 						// 步骤次序
  description: string, 			// 步骤描述
  tip: string, 							// 互动提示（需要条件触发）
  duration: number, 				// 用户当前步骤卡顿距离给提示的时长（单位：秒）
  target: string, 					// 目标元素的id或者class字符串
  content: string, 					// 描述内容
  placement: number[], 			// 在UI展示的位置信息
  type: string,
  isCheck: bool, 						// 该步骤是否涉及快照比对
  followingMaterial: [ 			// 跟随式任务的引导图片，只有在跟随式任务中才需要传入此参数
    {
      spriteSrc: string,		// 图片src
      placement: number[],	// 在UI展示的位置信息
      width: number,
      height: number,
    }
  ],
  targetHighlight: string,	// 语义化标注目标高亮元素
  apis: string,							// 该步骤中需要展示的Api Refrence
  spirits: string,					// 该步骤中需要被展示的精灵
  snapshot: [
    {
      kind: number,					// 快照类型
      content: string,			// 快照内容
    }
  ],
}
```

#### 接口名称：大模型验证快照

- 在快照验证阶段，实现流程：先由前端进行字符串匹配进行初步验证，若验证失败则交由后端利用大模型进行验证。
- `Post`:`/guidance/step/checkSnapshot`
- 请求参数

```typescript
{
  firstSnapshot: string,
  secondeSnapshot: string,
}
```

- 返回参数

```typescript
{
  flag: bool, //返回传入的两个快照是否能够通过检测
}
```