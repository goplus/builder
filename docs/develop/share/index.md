# Tech design for Share
## 挑战
* 提供丝滑的分享方式以满足用户的需求
* 我们将尽可能的将Share与XBuilder的耦合度降低，让Share可以作为一块独立的功能，提供相应的分享方式
* 以及后续如果需要对分享方式进行修改的话，可以很方便的进行操作
* 实现海报的组件布局与暴露方法的强关联，同时需要注意kodo和COEP
* 模态框统一管理，而不是复杂的父子组件通信
* 游戏引擎方法暴露


## 模块
### PlatformShare
负责与外部平台的集成。目前支持：QQ、微信、抖音、小红书、B站。为三种分享方式提供第三方平台的接口支持
### PlatformSelector
定义可复用的平台选择组件，向各弹窗提供被选择的社交平台信息
### Poster
用于生成海报，包含图片、二维码和项目信息
### ProjectRunner
通过 ProjectRunner 获取 runner 游戏引擎上暴露的方法，控制游戏画面
### RecordingPage
录屏业务的承载页面
### Recording APIs
spx-backend 提供的用于对 Recording 管理的 APIs


## UI 层（分享弹窗）
### DirectSharing
项目页面上的直接分享弹窗，用于直接分享项目到各个平台，调用 Poster 模块以生成海报图片
### ScreenShotSharing
项目页面上的截屏分享弹窗，用于接收截屏图片（通过 ProjectRunner 模块）、调用Poster生成海报后分享到各个平台
### ProjectRecordingSharing
项目页面上的录屏分享弹窗，用于接收录屏后分享到各个平台，调用 Recording APIs 创建并存储对应的 Recording 记录

## 模块关系
下图说明了分享策略中各个模块之间的关系：

```mermaid
graph TB
    %% XBuilder 主界面
    BuilderUI["`**Builder UI**
    Project 主界面`"]
    
    %% 分享方式 UI 层
    DirectSharing["`**DirectSharing**
    直接分享弹窗`"]
    
    ScreenShotSharing["`**ScreenShotSharing**
    截屏分享弹窗`"]

    ProjectRunner["`**ProjectRunner**
    游戏引擎接口模块`"]
    
    ProjectRecordingSharing["`**ProjectRecordingSharing**
    录屏分享弹窗`"]
    
    %% 平台相关模块
    PlatformSelector["`**PlatformSelector**
    平台选择组件`"]
    
    PlatformShare["`**PlatformShare**
    第三方平台集成模块`"]
    
    %% 核心功能模块
    Poster["`**Poster**
    海报生成模块`"]
    
    RecordingPage["`**RecordingPage**
    录屏业务承载页面`"]
    
    RecordingAPIs["`**Recording APIs**
    录屏管理API服务`"]
    
    %% 主界面到分享弹窗
    BuilderUI --> DirectSharing
    BuilderUI --> ScreenShotSharing  
    BuilderUI --> ProjectRecordingSharing
    BuilderUI --> ProjectRunner
    
    %% 分享弹窗到平台选择器
    
    ScreenShotSharing --> PlatformSelector
    DirectSharing --> PlatformSelector
    ProjectRecordingSharing --> PlatformSelector
    
    %% 平台选择器到平台集成
    PlatformSelector --> PlatformShare    
    
    %% 截屏分享流程  
    ScreenShotSharing --> Poster
    DirectSharing --> Poster
    
    %% 录屏分享流程
    ProjectRecordingSharing --> RecordingAPIs
    
    %% 底层协作
    RecordingPage --> RecordingAPIs
    
    %% 样式定义
    classDef coreModule fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef platformModule fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef uiModule fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef apiModule fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef builderModule fill:#fafafa,stroke:#424242,stroke-width:2px
    
    class Poster,ProjectRunner,RecordingPage coreModule
    class PlatformSelector,PlatformShare platformModule
    class DirectSharing,ScreenShotSharing,ProjectRecordingSharing uiModule
    class RecordingAPIs apiModule
    class BuilderUI builderModule
```
