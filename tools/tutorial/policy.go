package tutorial

// RunPolicy 决定共享一个运行组的多次运行如何相处：有运行持有组时，新运行加入
// 该怎么办。注册时直接给策略（`onExit OneAtATime, code => {...}`）让该段回调的
// 每次运行从第一条语句起就在一个私有的组里；回调里有过滤、或多段回调要共用一个
// 策略时，用 newRunGroup 建组并在合适的位置 enter()。零值表示不设策略：各次运行
// 相互独立、可以并存。
type RunPolicy int

const (
	// CancelPrevious 取消持有组的运行，让加入者继续。被取消的运行在下一个等待点
	// 结束：正在等待的，宿主 settle 时结果被丢弃；否则在发起下一次等待调用前结束。
	// 等待之间的语句照常执行，宿主也可能把已请求的展示做完。适合"只有最新一次
	// 触发算数"的判定。
	CancelPrevious RunPolicy = iota + 1
	// OneAtATime 让运行按加入顺序依次通过：加入者让出令牌排队，等持有者结束。
	// 适合每次触发都要完整、按序处理的场景，比如每次运行失败都给一条提示。
	OneAtATime
	// SkipWhileBusy 在有运行持有组时让加入者就地结束，加入点之后的语句不执行。
	// 适合对一阵密集触发只反应一次的场景，比如信号每帧重复时只判定一次。
	SkipWhileBusy
)

// RunGroup 是运行的共享策略作用域，见 RunPolicy。作者用 Course.newRunGroup 创建，
// 在回调里 enter() 加入，或直接作为注册时的第一个参数。
type RunGroup interface {
	// Enter 把当前运行加入组。作者不需要检查任何结果：SkipWhileBusy 下本次运行
	// 可能在这里结束，OneAtATime 下可能在这里等待，CancelPrevious 下持有者被取消。
	// 已持有组的运行再次加入没有效果。
	Enter()
}
