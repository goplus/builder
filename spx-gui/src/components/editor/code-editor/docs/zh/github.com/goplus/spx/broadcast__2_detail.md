# broadcast

广播一条消息，并且带上data等待

## 用法

```gop
broadcast "message", data, true
```

## 参数

| 名称 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| message | string | 是 | 要广播的消息 |
| data | any | 是 | 要广播的数据 |
| wait | bool | 否 | 是否等待 |
