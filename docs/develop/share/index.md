# Tech design for Share
## 挑战
* 提供丝滑的分享方式以满足用户的需求
    我们将尽可能的将Share与XBuilder的耦合度降低，让Share可以作为一块独立的功能，提供相应的分享方式，以及后续如果需要对分享方式进行修改的话，可以很方便的进行操作

## 模块
### sharePlatform
负责与外部平台的集成。目前支持：QQ、微信、抖音、小红书、B站。为三种分享方式提供第三方平台的接口支持
### Poster
用于生成海报，包含图片、二维码和项目信息
### ProjectRunner
通过ProjectRunner获取runner游戏引擎上暴露的方法
### RecordingPage
录屏业务的承载页面
### DirectSharing
项目页面上的直接分享弹窗，用于直接分享项目到各个平台
### ScreenShotSharing
项目页面上的截屏分享弹窗，用于接收截屏图片、调用Poster生成海报后分享到各个平台
### ProjectRecordingSharing
项目页面上的录屏分享弹窗，用于接收录屏后分享到各个平台
### Recording APIs
spx-backend 提供的用于对 Recording 管理的 APIs


## UI 层（分享方式）
### 直接分享 UI
项目直接分享界面，调用 ThirdPartyPlatform 和 Poster（抖音/小红书/B站显示海报图片）
### 截屏分享 UI
截屏分享界面，调用 ThirdPartyPlatform 和 Poster（抖音/小红书/B站/微信/QQ 都显示海报图片）
### 录屏分享 UI
录屏分享界面，调用 ThirdPartyPlatform

## 模块关系
下图说明了系统中各个模块之间的关系：

```mermaid
graph TB
    %% 分享功能模块
    ThirdPartyPlatform["`**ThirdPartyPlatform**
    第三方平台分享模块`"]
    
    Poster["`**Poster**
    海报生成模块`"]
    
    Screenshot["`**Screenshot**
    截屏功能模块`"]
    
    Recording["`**Recording**
    录屏功能模块`"]
    
    RecordingAPIs["`**Recording APIs**
    录屏管理API服务`"]
    
    %% 分享方式 UI 层
    DirectShareUI["`**直接分享 UI**
    项目分享界面`"]
    
    ScreenshotShareUI["`**截屏分享 UI**
    截屏分享界面`"]
    
    RecordingShareUI["`**录屏分享 UI**
    录屏分享界面`"]
    
    %% XBuilder 主界面
    BuilderUI["`**Builder UI**
    XBuilder 主界面`"]
    
    %% 关系连接
    BuilderUI --> DirectShareUI
    BuilderUI --> ScreenshotShareUI
    BuilderUI --> RecordingShareUI
    
    %% 直接分享流程
    DirectShareUI --> ThirdPartyPlatform
    DirectShareUI --> Poster
    
    %% 截屏分享流程
    ScreenshotShareUI --> Screenshot
    ScreenshotShareUI --> ThirdPartyPlatform
    ScreenshotShareUI --> Poster
    
    %% 录屏分享流程
    RecordingShareUI --> Recording
    RecordingShareUI --> ThirdPartyPlatform
    
    %% 模块间协作
    Screenshot --> Poster
    Recording --> RecordingAPIs
    
    %% 样式定义
    classDef coreModule fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef platformModule fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef uiModule fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef apiModule fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef builderModule fill:#fafafa,stroke:#424242,stroke-width:2px
    
    class Poster,Screenshot,Recording coreModule
    class ThirdPartyPlatform platformModule
    class DirectShareUI,ScreenshotShareUI,RecordingShareUI uiModule
    class RecordingAPIs apiModule
    class BuilderUI builderModule
```
