# AI生成结果 素材编辑（前端）

## 模块目的

根据 AI 生成的素材（预览）类型展示不同的预览或编辑。

## 模块定位

此模块是[素材库页面](./07_frontend_assetLibrary.md)的子模块，在素材库选中AI素材时显示，激活时由图片预览进一步进行AI生成素材。

- 对于`精灵`素材，提供动画预览、背景扣除、骨骼绑定等功能。
- 对于`背景`素材，提供背景拖拽拉伸功能。
- 对于`音频`素材，提供音频预览功能。

![image-20240725161150019](./assets/image-20240725161150019.png)

## 模块组件

![image-20240725160928562](./assets/image-20240725160928562.png)

### AssetEditor

- 组件：AI生成素材预览（及编辑）
- 描述：在素材库选中AI素材时显示。激活时由图片预览进一步进行AI生成素材。生成完成后根据素材类型展示不同的预览或编辑。
- props：
  - asset：AI生成素材预览 - Partial<AiAsset>
- 视图模型：
  - generating：正在生成？- boolean
- 子组件：
  - SpriteAssetEditor
  - BackdropAssetEditor
  - SoundAssetEditor

### 骨骼动画预览

[骨骼动画预览](./12_frontend_skeletonAnimation.md)