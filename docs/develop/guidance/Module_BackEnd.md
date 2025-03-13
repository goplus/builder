## 故事线编辑器接口

### 接口名称：创建故事线

- 由引导编辑器调用，用于故事线的创建

```typescript
type CreateStoryLineInput = Omit<StoryLine, "id">;

// POST `/storyline`
declare function createStoryLine(
  input: CreateStoryLineInput
): Promise<StoryLine>;
```

### 接口名称：修改故事线

- 由引导编辑器调用，用于故事线的修改

```typescript
// Put `/storyline/{id}`
declare function updateStoryLine(input: StoryLine): Promise<StoryLine>;
```

### 接口名称：删除故事线

- 由引导编辑器调用，用于故事线的删除

```typescript
// Delete `/storyline/{id}`
declare function deleteStoryLine(id: string): Promise<void>;
```

## 用户接口

### 接口名称：获取故事线页面渲染信息

- 用于获取故事线信息

```typescript
// Get `/storyline/{id}`
declare function getStoryLine(id: string): Promise<StoryLine>;
```

### 接口名称：修改故事线与用户关系

- 当用户完成一个关卡时被调用

```typescript
type UpdateStoryLineStudyInput = {
  id: string;
  lastFinishedLevelIndex: number; // 当前最新完成的关卡下标
};

// Put `/storyline/{id}/study`
declare function updateStoryLineStudy(
  input: UpdateStoryLineStudyInput
): Promise<StoryLineStudy>;
```

### 接口名称：获取故事线与用户关系

```typescript
// Get `/storyline/{id}/study`
declare function getStoryLineStudy(id: string): Promise<StoryLineStudy | null>;
```

### 接口名称：创建故事线与用户关系

- 若用户是第一次进入故事线则需要调用此接口新建用户和故事线的关系。

```typescript
// Post `/storyline/{id}/study`
declare function createStoryLineStudy(id: string): Promise<StoryLineStudy>;
```

### 接口名称：大模型代码验证

- 用于步骤内的代码验证

```typescript
type CheckCodeInput = {
  userCode: string;
  expectedCode: string;
  context: string; // 上下文（背景）信息，如当前项目、任务、步骤等
};

// Post `/util/guidance-check`
declare function checkCode(input: CheckCodeInput): Promise<boolean>;
```
