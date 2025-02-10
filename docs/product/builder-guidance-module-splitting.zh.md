# 模块拆分

## 故事线模块

**定位**：主要针对用户 UI 层面的故事线页面

**对外接口**：

- 路由跳转
  - 输入：`storyLineId`
  - 输出：UI 组件 `component`

## 有向导的项目编辑模块

**定位**：用户从故事线页面点击进入一个关卡打开的页面，是原先普通 Project 编辑页面的一个高级扩展

**对外接口**：

- 路由跳转
  - 输入：`projectName`、`levelId`
  - 输出：UI 组件 `component`

## 向导中涉及到原先项目编辑的模块

**定位**：对原先项目编辑模块的扩展以满足向导的需求

**对外接口**：

- 接口（由步骤执行器模块调用）：
  - 输入：`stepId`
  - 输出：Project Editor UI（IDE 根据得到的 spx API reference、Asset List、快照，进行对应的 UI 渲染）

## 语义化标注模块

**定位**：对页面元素进行语义化标注，用于蒙层或高亮的定位、用户触发行为的监听

**对外接口**：

- 元素语义化标注（可由蒙层模块调用、步骤执行器模块（跟随式步骤）调用）：
  - 输入：一个 `key`
  - 输出：`HTMLElement`

## 蒙层模块

**定位**：根据页面元素对页面进行蒙层

**对外接口**：

- 创建蒙层（可由步骤执行器模块以及其他各页面（主页、社区页面）调用）：
  - 输入：`HTMLElement`
  - 输出：UI 界面

## 关卡调度模块

**定位**：在一个关卡中调度关卡介绍、节点任务视频播放、步骤

**对外接口**：

- 接口 1（由“有向导的项目编辑模块”调用）：
  - 输入：`levelId`
  - 输出：关卡介绍 UI 界面

## 视频播放器模块

**定位**：播放视频，并且展示视频的分段点（可以不知晓业务的存在）

**对外接口**：

- 接口 1（由“有向导的项目编辑模块”调用）：
  - 输入：视频 `url`，分段点列表（主要用于各分段点在视频中的定位）
  - 输出：视频 UI 界面

## 节点任务管理器模块

**定位**：管理单个节点任务

**对外接口**：

- 接口 1（由“视频播放器模块”调用）:
  - 输入：`nodeTaskId`
  - 输出：视频 UI 界面

## 步骤执行器模块

**定位**：执行单一步骤，步骤结束即销毁

**对外接口**：

- 接口 1：
  - 输入：`stepId`
  - 输出：步骤结果 UI

## 后台服务

```go
// StoryLineInfo 故事线信息
type StoryLineInfo struct {
    IsCheck         bool              `json:"isCheck"`         // 该步骤是否涉及快照比对
    SpriteMaterial  []SpriteMaterial  `json:"spriteMaterial,omitempty"` // SpriteMaterial 数组
    TargetHighlight string            `json:"targetHighlight"` // 语义化标注目标高亮元素
    Path            string            `json:"path,omitempty"`  // coding 步骤涉及的文件路径
    Apis            string            `json:"api"`             // 该步骤中需要展示的 Api Reference
    Spirits         string            `json:"spirits"`         // 该步骤中需要被展示的精灵
}

// SpriteMaterial 定义了 SpriteMaterial 的结构体
type SpriteMaterial struct {
    SpriteSrc string    `json:"spriteSrc"` // Sprite 的源路径
    Placement Placement `json:"placement"` // Sprite 的放置位置
    Width     int       `json:"width"`     // Sprite 的宽度
    Height    int       `json:"height"`    // Sprite 的高度
}

// Placement 定义了放置位置的结构体
type Placement struct {
    Top    int `json:"top"`    // 上边界
    Bottom int `json:"bottom"` // 下边界
    Left   int `json:"left"`   // 左边界
    Right  int `json:"right"`  // 右边界
}

type Snapshot struct {
    Id      int    `json:"id"`
    StepId  int    `json:"stepId"`
    Kind    int    `json:"kind"`    // 0 是起始快照 1 是结束快照
    Content string `json:"content"`
}

// CodingStep 编码步骤
type CodingStep struct {
    Id        int
    StepId    int
    Path      string    `json:"path"`      // 编码文件路径
    TokenPos  [][]int   `json:"tokenPos"`  // 一个步骤里面可能有多个空，所以需要一个二维数组来存储，在第二维度，数组的长度为 2，第一个位置存放初始 mask，第二个位置存放结束 mask
}