## 故事线编辑器接口

### 接口名称：创建故事线

- 由引导编辑器调用，用于故事线的创建

```typescript
type CreateStoryLineInput = Omit<StoryLine, 'id'>

// POST `/storyline`
declare function createStoryLine(input: CreateStoryLineInput): Promise<void>
```

### 接口名称：修改故事线

- 由引导编辑器调用，用于故事线的修改

```typescript
// Put `/storyline/{id}`
declare function updateStoryLine(input: StoryLine): Promise<void>
```

### 接口名称：删除故事线

- 由引导编辑器调用，用于故事线的删除

```typescript
// Delete `/storyline/{id}`
declare function updateStoryLine(id: string): Promise<void>
```

## 用户接口

### 接口名称：获取故事线页面渲染信息

- 用于获取故事线信息

```typescript
type GetUserStoryLineRelationshipInput = {
    userName: string,
    storyLineName: string,
}

// Get `/storyline/{owner}/{name}`
declare function getStoryLine(input: GetUserStoryLineRelationshipInput): Promise<StoryLine>
```

### 接口名称：创建故事线与用户关系

- 用于创建用户与故事线的关系（当用户新进入一个故事线时被调用）

```typescript
type CreateUserStoryLineRelationshipInput = {
    userName: string,
    storyLineName: string,
}

// Post `/storyline/{owner}/{name}/study`
declare function CreateUserStoryLineRelationShip(input: CreateUserStoryLineRelationshipInput): Promise<void>
```

### 接口名称：修改故事线与用户关系

- 当用户完成一个关卡时被调用

```typescript
type UpdateUserStoryLineRelationshipInput = {
    userName: string,
    storyLineName: string,
    lastFinishedLevelIndex: number,    // 当前最新完成的关卡下标
}

// Put `/storyline/{owner}/{name}/study`
declare function UpdateUserStoryLineRelationShip(input: UpdateUserStoryLineRelationshipInput): Promise<void>
```

### 接口名称：获取故事线与用户关系

```typescript
type GetUserStoryLineRelationshipInput = {
    userName: string,
    storyLineName: string,
}

// Get `/storyline/{owner}/{name}/study`
declare function GetUserStoryLineRelationShip(input: GetUserStoryLineRelationshipInput): Promise<UserStoryLineRelationship>
```

### 接口名称：大模型快照验证

- 用于步骤内的快照验证

```typescript
type CheckSnapshotInput = { 
    userSnapshot: string, 
    expectedSnapshot: string
}

// Post `/checkSnapshot`
declare function UpdateUserStoryLineRelationShip(input: CheckSnapshotInput): Promise<boolean>
```

