# Sound 生成

本文档用于承接 XBuilder 中 Sound 生成功能的开发设计与实现拆解。

## 范围

Sound 生成当前规划包含：

- 语音合成（Text-to-Speech, TTS）
- 音效（Sound Effect）
- 背景音乐（Background Music）

## 当前实现建议

当前实现上建议 **TTS 优先**，并以统一的 Sound 生成任务模型向后兼容音效与背景音乐。

- MVP 优先落地：阿里云 CosyVoice TTS
- 后续扩展：同一套任务接口继续支持 Sound Effect / Background Music

## 设计文档

- Sound 一期 TTS 接口设计与 `builder-backend` 开发任务拆解：[`./tts-phase-1.zh.md`](tts-phase-1.zh.md)
