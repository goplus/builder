# Sound 一期 TTS 接口设计

本文档用于对齐 `builder`（前端）与 `builder-backend`（服务端）的 Sound 生成功能设计。

当前方案基于阿里云 CosyVoice v3.5 的真实约束：

> **前端表达“我要哪类声音、以什么语气说这段话”**  
> **服务端负责“使用哪个 target model / voice_id / instruction 去实现”**

尤其需要注意：

- `cosyvoice-v3.5-flash` / `cosyvoice-v3.5-plus` **没有系统音色**
- 必须先通过**声音设计/复刻**生成 voice_id，后续语音合成时再把该 voice_id 作为 `voice` 参数使用
- 模型本身通常可以根据 `text` 推断基础情绪和表达方式
- 一期前端只选择 `性别 + 年龄段`，服务端为每个桶位固定维护一个默认音色
- 前端更适合暴露开放的 `instruction` 作为补充说明，而不是固定枚举的 `emotion` / `useCase`
- `rate` / `pitch` 虽然底层支持较大范围调节，但前端应收敛为少量合理档位，避免生成结果失真

这样可以最大程度贴合 CosyVoice v3.5 的真实能力边界，同时保持前端心智简洁。

---

## 1. 设计结论

### 1.1 前端暴露“易理解、可复用、不过度绑定供应商”的概念

Sound TTS 的前端公开协议只保留这些字段：

- `name`：生成后的素材名
- `description`：素材描述
- `category`：MVP 版本只有 `voice`（前端不暴露 category 选择，运行时固定传 voice）
- `speechSettings`
  - `text`：要说的话
  - `voiceGender`：声音性别（男 / 女）
  - `voiceAgeGroup`：声音年龄段（儿童 / 青年 / 中年 / 老年）
  - `instruction`：补充“希望怎么说”“更偏什么感觉”“面向谁说”等开放信息
  - `rate`：语速档位
  - `pitch`：音调档位

### 1.2 前端不包含这些底层字段

以下字段都不应该成为前端协议的一部分：

- `provider`
- `model`
- 供应商原始 `voice_id`
- `format`
- `sampleRate`

原因：

1. 这些都是服务端接供应商时的实现细节。
2. 它们会把前端交互变成“调底层模型参数”。
3. 未来更换供应商或调整模型时，不应要求前端同步改协议。

### 1.3 服务端负责按分桶选择固定音色与参数映射

服务端根据前端提交的请求参数自行决定：

- 使用哪个 CosyVoice target model 和 `voice_id`
- 如何组织最终调用参数
- 输出什么格式和采样率

---

## 2. MVP 范围

### 2.1 本期必须实现

- 文本转语音（TTS）
- 手动配置基础音色维度与合成参数
- 异步生成任务创建 / 查询 / SSE 订阅 / 取消
- 返回音频 URL
- 前端将结果落为 XBuilder 的 `Sound` Asset

### 2.2 本期明确不做

- 音效生成（Sound Effect）
- 背景音乐生成（Background Music）
- 公开供应商底层参数，如原始 `voice_id`、连续数值级 `rate` / `pitch`
- 公开 provider / model / voiceId 选择
- 将生成结果自动入库到公共素材库

---

## 3. 核心原则

1. **前端讲用户语言，后端讲供应商语言。**
2. **前端只选性别与年龄桶位，不直接接触 voice_id。**
3. **运行时暴露稳定的可控项：性别、年龄段、开放 `instruction`、有限档位的 `rate / pitch`。**
4. **生成结果仍沿用现有 `/aigc/task` 异步任务体系。**
5. **前端只保留手动选择，不做本地或服务端推荐。**

---

## 4. 数据模型

### 4.1 基础音色维度（前端可见）

```ts
export type SoundVoiceGender = 'male' | 'female'

export type SoundVoiceAgeGroup = 'child' | 'youth' | 'middle-aged' | 'senior'
```

说明：

- 服务端内部按 `男 / 女 × 儿童 / 青年 / 中年 / 老年` 维护 8 个基础桶位
- 每个桶位在一期只对应一个固定默认音色
- 前端暴露的是桶位维度，不暴露供应商原始 `voice_id`
- `rate / pitch` 虽然在协议里仍然使用 number，但前端只提供固定几档可选值
- 这些固定选项由前端直接内置，不再单独提供“获取可选项”的接口
- 前端所有可控项都由用户手动选择，不再引入推荐值

### 4.2 生成请求（前端可见）

```ts
export type SpeechSoundSettings = {
  name: string
  description: string
  category: 'voice'
  speechSettings: {
    text: string
    voiceGender: SoundVoiceGender
    voiceAgeGroup: SoundVoiceAgeGroup
    instruction?: string
    rate?: number
    pitch?: number
  }
}
```

说明：

- `voiceGender / voiceAgeGroup` 用于选定基础音色桶位
- `text` 暂定限制为最多 200 个字符，避免长文本导致生成用时过长
- `instruction` 限制为最多 50 个字符，不超过 CosyVoice 可接受的长度范围
- 协议字段 `rate / pitch` 使用 number；前端通过固定档位映射到这些数值

前端固定档位映射如下：

| UI 档位 | `rate` | `pitch` |
| --- | --- | --- |
| 低 / 慢 | `0.8` | `0.85` |
| 稍低 / 稍慢 | `0.9` | `0.95` |
| 标准 | `1.0` | `1.0` |
| 稍高 / 稍快 | `1.1` | `1.05` |
| 高 / 快 | `1.2` | `1.15` |

---

## 5. 接口设计

### 5.1 创建 Sound 生成任务

继续沿用统一任务接口：

```http
POST /aigc/task
Content-Type: application/json
```

#### Request

```json
{
  "type": "generateSound",
  "parameters": {
    "settings": {
      "name": "hero-hello",
      "description": "主角的一句开心问候",
      "category": "voice",
      "speechSettings": {
        "text": "你好，我们出发吧！",
        "voiceGender": "female",
        "voiceAgeGroup": "youth",
        "instruction": "像在提醒队友准备出发，语气轻快一点",
        "rate": 1.1,
        "pitch": 1.05
      }
    }
  }
}
```

### 5.2 TaskResult 设计

```ts
export type TaskResultGenerateSound = {
  audioUrl: string
}
```

---

## 6. 前端交互

UI 顺序：

1. 输入素材名称
2. 输入要说的话
3. 选择声音性别 / 年龄段
4. 选择语速 / 音调档位
5. 按需补充 `instruction`
6. 点击生成
7. 试听生成结果
8. 采用到项目

---

## 7. 服务端开发建议

### 任务 1：维护基础音色库存

服务端维护一份基础音色库存，例如：

```text
builder-backend/internal/aigc/sound/base_voice_inventory.json
```

库存项可包含：

- `target_model`
- `voice_gender`
- `voice_age_group`
- `voice_id`

其中：

- `voice_id` 来自 CosyVoice 声音设计接口
- `voice_gender + voice_age_group` 共同决定一个基础音色桶位

建议：

- 一期先按 `男 / 女 × 儿童 / 青年 / 中年 / 老年` 维护 8 个基础桶位
- 每个桶位只维护一个默认基础音色，优先保证稳定、自然、通用
- 如果后续某个桶位的默认音色无法覆盖主要场景，再考虑扩展该桶位的候选音色数量

### 任务 2：处理 Sound 生成任务

服务端收到请求后完成：

1. 根据 `voiceGender + voiceAgeGroup` 选定基础音色桶位对应的固定 `voice_id`
2. 根据 `text / instruction / rate / pitch` 等信息生成最终调用参数
3. 调用供应商生成音频
4. 上传对象存储并写回 task result

例如：

- `male + middle-aged` -> `cosyvoice-v3.5-plus` 的中年男声默认 `voice_id`
- `female + youth` -> `cosyvoice-v3.5-plus` 的青年女声默认 `voice_id`

然后再根据：

- `text`
- `instruction`
- `rate`
- `pitch`

生成最终调用参数。默认值策略：

- `instruction` 为空时，仅基于 `text` 做自然表达
- `rate / pitch` 缺省时使用 `1.0`
- 输出格式固定用 `mp3`
- 其它参数不指定，使用 CosyVoice 默认值

---

## 8. 相关文档

- [阿里百炼语音合成模型用户指南](https://help.aliyun.com/zh/model-studio/tts-model)
- [CosyVoice 语音合成 API 参考](https://help.aliyun.com/zh/model-studio/non-realtime-cosyvoice-api)
