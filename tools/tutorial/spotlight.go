package tutorial

// Spotlight 把学习者的注意力引到界面的某一处。
//
// 与 ShowMessage 那类展示的关键区别：spotlight **不阻塞**课程流程——高亮出现即返回，
// 不等它消失。产品文档里"每次展示可等待确认、也可自动推进"的两种形态，就是由
// "对话框/视频阻塞"与"spotlight 不阻塞"分别承担的。
type Spotlight struct {
	program *courseProgram
}

// SpotlightOptions 控制高亮的呈现方式。
type SpotlightOptions struct {
	// Mask 表示是否把目标以外的界面压暗，用来收拢注意力。
	Mask bool `json:"mask"`
	// Duration 是自动消隐的延时（秒）；0 表示不自动消失，一直留到学习者点击任意处。
	//
	// 这里用 duration 而不是布尔的 persist，是评审时定的：一个字段同时表达"要不要
	// 自动消失"和"多久消失"，而且 Go 的零值恰好就是课程场景想要的默认（不消失）。
	Duration float64 `json:"duration"`
}

// courseGuidanceSpotlight 是课程引导场景的默认呈现：压暗周围、并且留到学习者动手为止。
// 之所以默认不自动消隐，是因为课程里的高亮通常在指路（"点这里的运行按钮"），
// 在学习者反应过来之前消失就白提示了。
var courseGuidanceSpotlight = SpotlightOptions{Mask: true, Duration: 0}

type spotlightRevealRequest struct {
	Target  string           `json:"target"`
	Tip     string           `json:"tip"`
	Options SpotlightOptions `json:"options"`
}

// Reveal 高亮 target 匹配到的界面元素，并在旁边显示 tip。
//
// target 是 **Radar selector**（形如 "Code editor > Code text editor"，由 builder
// 编辑器 UI 代码里标注且尽量保持稳定的 node name 组合而成），不是 Radar 的 node ID——
// 后者是每次挂载随机生成的，预先写好的课程代码无从得知。selector 的语法由 Radar 模块
// 定义，框架这侧只做透传。
//
// 一个 selector 匹配到多个元素时，它们会作为一组一起高亮（例如同名 API 的全部重载）。
//
// 失败语义分两级：selector 语法错误 → capability 失败 → panic，作者在 Preview 阶段
// 就能发现；语法正确但当前匹配不到（API 被 filterAPIs 滤掉了、元素还没挂载）→ 宿主
// 短暂重试后跳过并告警，不算错误——那多半是瞬时状态，为一个高亮把整节课炸掉不值得。
func (p *Spotlight) Reveal(target, tip string) {
	p.RevealWith(target, tip, courseGuidanceSpotlight)
}

// RevealWith 是可显式指定呈现方式的 Reveal。
//
// 注意作者侧的默认值是在**框架这一层**填好的：宿主契约里 options 是必填的完整值，
// 宿主不需要知道"课程引导场景的默认是什么"。
func (p *Spotlight) RevealWith(target, tip string, options SpotlightOptions) {
	p.program.mustCallCapability("spotlight_reveal", spotlightRevealRequest{
		Target:  target,
		Tip:     tip,
		Options: options,
	}, nil)
}
