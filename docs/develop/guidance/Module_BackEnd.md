## 故事线编辑器接口

### 接口名称：创建故事线

- 由引导编辑器调用，用于故事线的创建

```typescript
type CreateStoryLineInput = {
    backgroundImage: string,								// 故事线的背景图url
    title: LocaleMessage,									// 故事线标题
    description: LocaleMessage,								// 故事线描述
    tag: LocaleMessage,										// 故事线难度标签 是一个枚举值 其可选值为：简单 中等 困难
    levels: Level[],
}

// POST `/storyLine`
declare function createStoryLine(input: CreateStoryLineInput): Promise<void>
```

### 接口名称：修改故事线

- 由引导编辑器调用，用于故事线的修改

```typescript
type UpdateStoryLineInput = {
    storyLine: StoryLine
}

// Put `/storyLine/{id}`
declare function updateStoryLine(input: UpdateStoryLineInput): Promise<void>
```

### 接口名称：删除故事线

- 由引导编辑器调用，用于故事线的删除

```typescript
type DeleteStoryLineInput = {
    storyLineId: number,
}

// Delete `/storyLine/{storyLineId}`
declare function updateStoryLine(input: DeleteStoryLineInput): Promise<void>
```

## 用户接口

### 接口名称：获取故事线页面渲染信息

- 用于获取故事线页面渲染所需的信息（包括故事线自身信息以及渲染关卡所需的信息）

```typescript
type GetStoryLineInput = {
    storyLineId: number,
}

type StoryLineInfo = {
    storyLineId: number,
    backgroundImage: string,								// 故事线的背景图url
    title: LocaleMessage,									// 故事线标题
    description: LocaleMessage,								// 故事线描述
    tag: LocaleMessage,										// 故事线难度标签 是一个枚举值 其可选值为：简单 中等 困难
    levels: [
        cover: string,									    // 封面图片url
        placement: Placement, 							    // 在界面上的位置信息
        title: LocaleMessage,							    // 关卡标题
        description: LocaleMessage,						    // 关卡描述
        achievement: [									    // 成就与关卡绑定，一个关卡可能存在多个成就
            {
                icon: string,							    // 成就图标url
                title: LocaleMessage,					    // 成就名称
            }
        ],
    ],
}

// Get `/storyLine/{storyLineId}`
declare function getStoryLineInfo(input: GetStoryLineInput): Promise<StoryLineInfo> // StoryLine数据结构在base.ts中已被定义
```

### 接口名称：获取关卡信息

- 由故事线ID和关卡下标获取关卡信息的接口（包括节点任务列表以及节点任务下的步骤列表）

```typescript
type GetStoryLineInput = {
    storyLineId: number,
    levelIndex: number,
}

// Get `/storyLine/{storyLineId}/{levelIndex}`
declare function getLevelInfo(input: GetStoryLineInput): Promise<Level>
```

### 接口名称：创建故事线与用户关系

- 用于创建用户与故事线的关系（当用户新进入一个故事线时被调用）

```typescript
type CreateUserStoryLineRelationshipInput = {
    storyLineId: number,
}

// Post `/userStoryLineRelationShip`
declare function CreateUserStoryLineRelationShip(input: CreateUserStoryLineRelationshipInput): Promise<void>
```

### 接口名称：修改故事线与用户关系

- 当用户完成一个关卡时被调用

```typescript
type UpdateUserStoryLineRelationshipInput = {
    storyLineId: number,
    levelindex: number,    // 当前最新完成的关卡下标
}

// Put `/userStoryLineRelationShip`
declare function UpdateUserStoryLineRelationShip(input: UpdateUserStoryLineRelationshipInput): Promise<void>
```

### 接口名称：获取故事线与用户关系

```typescript
type GetUserStoryLineRelationshipInput = {
    storyLineId: number,
}

// Get `/userStoryLineRelationShip/{storyLineId}`
declare function UpdateUserStoryLineRelationShip(input: GetUserStoryLineRelationshipInput): Promise<UserStoryLineRelationship>
```

### 接口名称：大模型快照验证

- 用于步骤内的快照验证

```typescript
type CheckSnapshotInput = {
	userSnapshot: string,
  	expectedSnapshot: string
}

// Post `/storyLine/checkSnapshot`
declare function UpdateUserStoryLineRelationShip(input: CheckSnapshotInput): Promise<boolean>
```

