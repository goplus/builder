package tutorial

// Copilot 为课程提供 LLM 能力。
//
// 与学习者主动求助 Copilot 是两回事：这里发出的请求**不会**出现在学习者与 Copilot 的
// 对话里，它们是课程代码自己的判定/生成手段。产品设计上，目标式课程里 Copilot 对学习者
// 是"被动待命的助手"，对课程代码则是"按需调用的能力"。
type Copilot struct {
	program *courseProgram
}

// CopilotRound 是学习者与 Copilot 的一轮完整对话。
// 字段的 json tag 直接对应契约里 copilot.roundFinish 的载荷，解码后原样交给课程。
type CopilotRound struct {
	UserMessage    string   `json:"userMessage"`
	ResultMessages []string `json:"resultMessages"`
}

// OnRoundFinish 注册"学习者完成了一轮 Copilot 对话"的回调，可注册多个。
// 课程可以据此感知学习者求助了什么（例如求助过多时给点额外提示）。
func (p *Copilot) OnRoundFinish(handler func(round CopilotRound)) {
	p.program.addHandler(func(h *handlers) { h.copilotRound = append(h.copilotRound, handler) })
}

// GenerateText 让 Copilot 生成一段纯文本并返回。
//
// 用途是确定性检查覆盖不了的地方：判定"表达类"目标（让角色说句打招呼的话，说什么都对），
// 或基于学习者的实际代码生成个性化评语。调用期间课程程序是阻塞的，可能好几秒——
// 这正是事件队列要留足容量的原因（见 program.go 的 eventQueueSize）。
func (p *Copilot) GenerateText(message string) string {
	var text string
	p.program.mustCallCapability("copilot_generateText", contentRequest{Content: message}, &text)
	return text
}

// GenerateJSON 让 Copilot 生成一个结构化结果，直接填回 result 指向的结构体。
//
// 用法（课程代码）：
//
//	feedback := &Feedback{}
//	Copilot.generateJSON "点评这份代码", feedback
//	if feedback.Score > 3 { ... }
//
// 机制：框架用反射从 result 的结构体类型派生出 JSON Schema，连同 message 一起发给
// 前端；前端用 schema 约束 LLM 的输出格式，回传的 JSON 再由 xgoexec 的桥解码进 result。
//
// 为什么反射在这里是可行的（曾经的最大技术疑点）：课程代码虽然是 ixgo 解释执行的，
// 但 xgobuild 会先把它编译成一个普通的 package main，作者写的 struct 就是普通的
// main 包类型，reflect 看到的与原生类型没有区别。这一点做过专门的验证实验。
//
// result 必须是非 nil 的结构体指针，且至少有一个导出字段——否则 deriveSchema 会报错，
// 进而 panic。这道检查不是吹毛求疵：XGo 作者很容易顺手把字段写成小写，那样
// encoding/json 既读不到也填不进，课程会拿到一个全零值却毫无提示。
func (p *Copilot) GenerateJSON(message string, result any) {
	schema, err := deriveSchema(result)
	if err != nil {
		panic(err)
	}
	p.program.mustCallCapability("copilot_generateJSON", struct {
		Content string         `json:"content"`
		Schema  map[string]any `json:"schema"`
	}{Content: message, Schema: schema}, result)
}
