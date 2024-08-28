onTouched - 回调函数

onTouched 函数会在当前精灵与其他精灵接触时执行。例如：小鸟碰到柱子时游戏结束，马里奥吃到金币加分，等等。这样做，我们通常需要使用 `die` 方法。

```gop
// 当触碰到柱子时，游戏结束，精灵死亡
onTouched "柱子" => {
     die
}
```
效果示例

![onTouched GIF]($picPath$)
