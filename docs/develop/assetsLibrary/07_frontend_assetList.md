# 搜索结果及AI生成结果列表（前端）

## 模块目的

以虚拟列表形式展示每个搜索素材和AI生成的素材预览。

## 模块定位

此模块是[素材库页面](./07_frontend_assetLibrary.md)的子模块，主要负责素材的搜索结果及AI生成结果的展示。

模块展示从[搜索模块](./08_frontend_search.md)获取的结果列表，对于 AI 生成的素材，展示生成状态及生成预览。使用虚拟列表展示搜索结果，在滚动时动态加载素材。

![img](https://raw.githubusercontent.com/abandon888/photoImg/main/test/202407260940696.png)

## 模块组件


![image-20240725160911981](https://raw.githubusercontent.com/abandon888/photoImg/main/test/image-20240725160911981.png)

### AssetList

- 组件：搜索结果及AI生成结果列表
- 描述：以虚拟列表形式展示每个搜索素材和AI生成的素材预览。在滚动到底部时更新搜索上下文的 page 参数。
- 子组件：
  - AiAssetItem
  - AssetItem
- props：
  - assetsList：素材列表 - Asset[]
  - aiAssetsList：AI素材列表 - AiAsset[]
- emits：
  - select-asset：传递子组件的素材选中事件，更新素材库的选中素材状态。

### AssetItem

- 组件：搜索素材项目
- 描述：展示一个公有素材库项目
- props：
  - asset：素材 - Asset
- emits：
  - select-asset：素材选中事件，更新素材库的选中素材状态。

### AiAssetItem

- 组件：AI生成素材预览项目
- 描述：展示一个AI生成素材的预览图片。轮询生成状态，在未生成完成时显示进度或状态提示。
- props：
  - generationId：AI生成id - string
  - preview：AI素材预览（image_url） - string
- 视图模型：
  - generating：正在生成？- boolean
- emits：
  - select-asset：素材选中事件，更新素材库的选中素材状态。仅在生成完成时点击触发。