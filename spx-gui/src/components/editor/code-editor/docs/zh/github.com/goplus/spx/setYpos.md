```gop
var is_up_state bool
var y float32

// 自动循环切换精灵造型
onStart => {
    for {
        nextCostume
        wait 0.3
    }
}
```
移动到指定位置

