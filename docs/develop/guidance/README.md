# Guidance

## 模块概览

![guidance-architecture](./assets/guidance-architecture.png)

## 模块详情

### StoryLine

定位：主要针对用户UI层面的故事线页面
类型：component

### ProjectEditorWithGuidance

定位：用户从故事线页面点击进入一个关卡打开的页面，是原先普通Project编辑页面的一个高级扩展
类型：component

### UIAdapter

定位：对原先项目编辑模块的扩展（隐藏）以满足向导的需求
类型：class

### Tagging

定位：对页面元素进行语义化标注，用于蒙层或高亮的定位、用户触发行为的监听
类型：class

### Mask

定位：根据页面元素对页面进行蒙层
类型：component

### LevelCoordinator

定位：在一个关卡中调度关卡介绍、节点任务视频、步骤
类型：component

### VideoPlayer 视频播放



### NodeTaskPlayer 任务执行 

定位：播放视频，并且展示视频的分段点，在每个分段点会触发特定事件（可以不知晓业务的存在）
类型：component

### StepPlayer 步骤执行

定位：执行单一步骤，步骤结束即销毁
类型：component

### BackEnd

```ts
// StoryLineInfo 故事线信息
type StoryLine struct {
	Id                int             	`json:"id"`
	Index             int             	`json:"index"` // 故事线顺序
	Tag               string    	  	`json:"tag"`   // 难度标签
	BackgroundImage   string          	`json:"backgroundImage"` // 地图背景图
	Title             string          	`json:"title"` // 故事线标题
	Description       string          	`json:"description"` // 故事线描述
	Status            int		  	  	`json:"status"` // 故事线状态(是否被删除)
}

type UserStoryLine struct {
    UserId			int			`json:"userId"`
    StoryLineId 	int			`json:"storyLineId"`
    Status			int			`json:"status"`
    CreateTime		time.Time	`json:"createTime"`
}

// LevelBasic 关卡基础信息
type Level struct {
    Id        			int    		`json:"id"`
    StoryLineId			int			`json:"storyLineId"`
	Index           	int         `json:"index"` // 关卡顺序
	AchievementID   	int         `json:"achievementId"`
	Title           	string      `json:"title"`
	Cover           	string      `json:"cover"`
	Coordinate      	[]int      	`json:"coordinate"` // 关卡在故事线上的坐标
	LevelStatus     	int     	`json:"levelStatus"`
    LevelTitle       	string     	`json:"levelTitle"`       // 关卡标题
	LevelDescription 	string     	`json:"levelDescription"` // 关卡描述
    Video				string		`json:"video"`			// 视频
}

type UserLevel struct {
    UserId 		int
    LevelId 	int
    Status		int // 未通过为0 通过为1
}

type UserLevelDto struct {
    Level
    Status 		int 		`json:"status"`
}

// Achievement 成就展示
type Achievement struct {
	Id        int    	`json:"id"`
    LevelId	  int	 	`json:"levelId"`
	Index     int    	`json:"index"`
	Icon      string 	`json:"icon"`
	InfoText  string 	`json:"infoText"`
}

// NodeTask 节点任务
type NodeTask struct {
	Id      		int     	`json:"nodeId"`      // 节点ID
    LevelId			int			`json:"levelId"`
	Name        	string  	`json:"name"`        // 节点名称
	TriggerTime     int     	`json:"triggerTime"` // 触发时间
	VideoSrc    	string  	`json:"videoSrc"`    // 视频信息
    VideoQuality 	string 		`json:"videoQuality"`
}

// Step 步骤信息
type Step struct {
    Id				int		 			`json:"id`
    NodeTaskId		int					`json:"nodeId"`
	Title           string   			`json:"title"`          	// 步骤名称
	Index           int      			`json:"index"`          	// 步骤次序
	Description     string   			`json:"description"`    	// 步骤描述
	Tip             string   			`json:"tip"`            	// 互动提示（需要条件触发）
	Duration        int      			`json:"duration"`       	// 用户当前步骤卡顿距离给提示的时长（单位：秒）
	Feedback        string   			`json:"feedback"`       	// 用户完成检测后的反馈信息
	Target          string   			`json:"target"`         	// 目标元素的id或者class字符串
	Content         string   			`json:"content"`        	// 步骤的描述内容
	Placement       string   			`json:"placement"`      	// 步骤提示框放置在目标元素的方位 ["left", "top", "right", "bottom"]
	Type            string   			`json:"type"`           	// 步骤类型（Coding步骤、跟随式步骤）
	IsCheck         bool     			`json:"isCheck"`        	// 该步骤是否涉及快照比对
    SpriteMaterial  []SpriteMaterial    `json:"spriteMaterial,omitempty"` // SpriteMaterial数组
	TargetHighlight string              `json:"targetHighlight"` 	// 语义化标注目标高亮元素
	Path            string              `json:"path,omitempty"`  	// coding步骤涉及的文件路径
    Apis			string				`json:"api"`				// 该步骤中需要展示的Api Refrence
	Spirits	        string              `json:"spirits"`            // 该步骤中需要被展示的精灵
}

// SpriteMaterial 定义了SpriteMaterial的结构体
type SpriteMaterial struct {
	SpriteSrc string    `json:"spriteSrc"` // Sprite的源路径
	Placement Placement `json:"placement"` // Sprite的放置位置
	Width     int       `json:"width"`     // Sprite的宽度
	Height    int       `json:"height"`    // Sprite的高度
}

// Placement 定义了放置位置的结构体
type Placement struct {
	Top    int 	`json:"top"`    // 上边界
	Bottom int 	`json:"bottom"` // 下边界
	Left   int 	`json:"left"`   // 左边界
	Right  int 	`json:"right"`  // 右边界
}

type Snapshot struct {
    Id		int 	`json:"id"`
    StepId 	int 	`json:"stepId"`
    Kind 	int		`json:"kind"`    // 0是起始快照 1是结束快照
    Content string	`json:"content"`
}

// Coding步骤
type CodingStep struct {
    Id			  int
    StepId		  int
    // EncodingStepInfo 编码式步骤特有信息
	Path       	  string   	`json:"path"`               // 编码文件路径
	TokenPos	  int[][]	`json:"tokenPos"`			// 一个步骤里面可能有多个空，所以需要一个二维数组来存储，在第二维度，数组的长度为2，第一个位置存放初始mask，第二个位置存放结束mask
}
```
