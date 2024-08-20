# 素材库（前端）

## 模块目的

提供素材库页面，提供素材的查询、AI生成、详情查看及编辑预览功能。

## 模块定位

素材库整体以模态框形式承载，功能定位是帮助用户找到所需素材，查找方式是分类为主，搜索为辅；内容类别是公有素材为主，ai生成素材为辅。


## 模块组件

![image-20240725160756590](https://raw.githubusercontent.com/abandon888/photoImg/main/test/image-20240725160756590.png)

### AssetLibraryModal `已有设计`

- 组件：素材库模态框
- 描述：作为素材库的承载形式，控制素材库素材类型、可见性等
- Props：
  - type：素材类型 - 枚举值AssetType：Sprite/Backdrop/Sound
  - visible：可见性 - boolean
  - project：当前项目，通过 editorCtx.project 获取 - Project
- 使用：
  - 通过 useModal 创建实例，通过invokeAssetLibraryModal激活素材库模态框。
  - 对于各个 EditorPanel，使用useAddAssetFromLibrary获取素材库模态框的handler，并调用addAssetFromLibrary打开素材库模态框。
- 子组件：
  - AssetLibrary

```TypeScript
// spx-gui/src/components/asset/index.ts
export function useAddAssetFromLibrary(autoSelect = true) {
  const invokeAssetLibraryModal = useModal(AssetLibraryModal)
  return async function addAssetFromLibrary<T extends AssetType>(project: Project, type: T) {
    const added = (await invokeAssetLibraryModal({ project, type })) as Array<AssetModel<T>> // 返回在素材库中选中的素材
    // 素材添加逻辑应在素材库中进行，这里仅处理添加素材关闭模态框之后的逻辑。
    // ... 
  }
}
// spx-gui/src/components/editor/panels/xxx/XxxPanel.vue
const addAssetFromLibrary = useAddAssetFromLibrary()
const handleAddFromAssetLibrary = useMessageHandle(
  () => addAssetFromLibrary(editorCtx.project, AssetType.Xxx),
  { en: 'Failed to add xxx from asset library', zh: '从素材库添加失败' }
).fn
```

### AssetLibrary

- 组件：素材库
- 描述：素材库页，展示搜索框、分类选项、搜索及AI生成结果列表。在有选中的素材时（selectedAsset非空时）展示素材详情（公有素材）或素材预览编辑（AI预览素材）。
- props：
  - type：素材类型 - 枚举值AssetType：Sprite/Backdrop/Sound
  - project：当前项目，通过 editorCtx.project 获取 - Project
- 视图模型：
  - assetsList：素材列表 - Asset[]
  - aiAssetsList：AI素材列表 - AiAsset[]
  - selectedAsset?：当前选中的素材 - Asset | AiAsset
- 使用：

用于素材库模态框 AssetLibraryModal 中。

- 子组件：
  - [查询模块](./08_frontend_search.md)
    - SearchContextProvider
    - SearchBox
    - CategorySelector
    - OrderSelector
  - [搜索结果及AI生成结果列表](./09_frontend_assetList.md)
    - AssetsList
  - [AI生成结果 素材编辑](./10_frontend_assetEditor.md)
    - AssetEditor
  - [搜索结果 素材详情页](./11_frontend_assetDetail.md)
    - AssetDetail