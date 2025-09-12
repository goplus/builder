# Tech design for Share

## 挑战

- 提供丝滑的分享方式以满足用户的需求
- 我们将尽可能的将 Share 与 XBuilder 的耦合度降低，让 Share 可以作为一块独立的功能，提供相应的分享方式
- 以及后续如果需要对分享方式进行修改的话，可以很方便的进行操作
- 实现海报的组件布局与暴露方法的强关联，同时需要注意 kodo 和 COEP
- 模态框统一管理，而不是复杂的父子组件通信
- 游戏引擎方法暴露

## 核心功能模块

### PlatformShare

负责与外部平台的集成。目前支持：QQ、微信、抖音、小红书、B 站。为三种分享方式提供第三方平台的接口支持

See API design in [`module_PlatformShare.ts`](./module_PlatformShare.ts).

### PlatformSelector

定义可复用的平台选择组件，向各弹窗提供被选择的社交平台信息。

See API design in [`module_PlatformSelector.ts`](./module_PlatformSelector.ts).

### Poster

用于生成海报，包含图片、二维码和项目信息。

See API design in [`module_ProjectPoster.ts`](./module_ProjectPoster.ts).

### ProjectRunner

通过 ProjectRunner 获取 runner 游戏引擎上暴露的方法，控制游戏画面。

See API design in [`module_ProjectRunner.ts`](./module_ProjectRunner.ts).

### Recording

录屏的展示模块，包括录屏卡片和录屏详情

See API design in [`module_Recording.ts`](./module_Recording.ts).

### MobileKeyboard

移动键盘的组件，负责键盘的展示与编辑逻辑，与 Project 绑定。

See API design in [`module_MobileKeyboard.ts`](./module_MobileKeyboard.ts).

### Recording APIs

spx-backend 提供的用于对 Recording 管理的 APIs

See API design in [`module_RecordingAPIs.ts`](./module_RecordingAPIs.ts).

### Project APIs

spx-backend 的 Project 管理相关 API 中，有一部分因支持 mobileKeyboard 的加入而被修改。

See details in [`ProjectAPIs`](./module_ProjectAPIs.ts).

## UI 层（分享弹窗）

### DirectSharing

项目页面上的直接分享弹窗，用于直接分享项目到各个平台，调用 Poster 模块以生成海报图片。

See API design in [`module_ProjectDirectSharing.ts`](./module_ProjectDirectSharing.ts).

### ScreenShotSharing

项目页面上的截屏分享弹窗，用于接收截屏图片（通过 ProjectRunner 模块）、调用 Poster 生成海报后分享到各个平台。

See API design in [`module_ProjectScreenShotSharing.ts`](./module_ProjectScreenShotSharing.ts).

### ProjectRecordingSharing

项目页面上的录屏分享弹窗，用于接收录屏后分享到各个平台，调用 Recording APIs 创建并存储对应的 Recording 记录。

See API design in [`module_ProjectRecordingSharing.ts`](./module_ProjectRecordingSharing.ts).

## 模块关系

下图说明了分享策略中各个模块之间的关系：

```mermaid
graph TB
    %% 主界面层
    subgraph MainLayer["主界面层"]
        BuilderUI["`**Builder UI**
        项目主界面
        录屏展示界面`"]
    end

    %% 功能模块层
    subgraph FunctionLayer["功能模块层"]
        MobileKeyboard["`**MobileKeyboard**
        移动端键盘模块`"]

        ProjectRunner["`**ProjectRunner**
        游戏引擎接口模块`"]

        Recording["`**Recording**
        录屏展示模块`"]
    end

    %% API 服务层
    subgraph APILayer["API 服务层"]
        RecordingAPIs["`**Recording APIs**
        录屏管理服务`"]

        ProjectAPIs["`**Project APIs**
        项目管理服务`"]
    end

    %% 分享界面层
    subgraph ShareLayer["分享界面层"]
        DirectSharing["`**DirectSharing**
        直接分享弹窗`"]

        ProjectRecordingSharing["`**ProjectRecordingSharing**
        录屏分享弹窗`"]

        ScreenShotSharing["`**ScreenShotSharing**
        截屏分享弹窗`"]
    end

    %% 平台集成层
    subgraph PlatformLayer["平台集成层"]
        PlatformSelector["`**PlatformSelector**
        平台选择组件`"]

        PlatformShare["`**PlatformShare**
        第三方平台集成`"]
    end

    %% 核心处理层
    subgraph CoreLayer["核心处理层"]
        Poster["`**Poster**
        海报生成模块`"]
    end

    %% 主要流程连接
    BuilderUI --> MobileKeyboard
    BuilderUI --> ProjectRunner
    BuilderUI --> Recording
    BuilderUI --> DirectSharing
    BuilderUI --> ScreenShotSharing
    BuilderUI --> ProjectRecordingSharing

    %% 功能模块间连接
    MobileKeyboard --> ProjectRunner
    MobileKeyboard --> ProjectAPIs

    %% 分享流程连接
    DirectSharing --> PlatformSelector
    ScreenShotSharing --> PlatformSelector
    ProjectRecordingSharing --> PlatformSelector

    %% 平台处理流程
    PlatformSelector --> PlatformShare

    %% 内容生成流程
    DirectSharing --> Poster
    ScreenShotSharing --> Poster

    %% API 调用关系
    ProjectRecordingSharing --> RecordingAPIs
    Recording --> RecordingAPIs

    %% 去掉所有subgraph的背景色，只保留边框
    %%{init: {"theme": "base", "themeVariables": {"primaryColor": "transparent", "primaryTextColor": "#000", "primaryBorderColor": "#000", "lineColor": "#000", "secondaryColor": "transparent", "tertiaryColor": "transparent", "background": "transparent", "mainBkg": "transparent", "secondaryBkg": "transparent"}}}%%

    %% 样式定义
    classDef uiLayer fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000
    classDef unifiedLayer fill:#f5f5f5,stroke:#757575,stroke-width:2px,color:#000
    classDef shareLayer fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#000
    classDef apiLayer fill:#e8f5e8,stroke:#388e3c,stroke-width:2px,color:#000

    class BuilderUI uiLayer
    class VirtualKeyboard,ProjectRunner,Recording,PlatformSelector,PlatformShare,Poster unifiedLayer
    class DirectSharing,ScreenShotSharing,ProjectRecordingSharing shareLayer
    class RecordingAPIs,ProjectAPIs apiLayer

    %% 设置所有subgraph为完全透明，无边框
    style MainLayer fill:transparent,stroke:transparent,stroke-width:0px
    style FunctionLayer fill:transparent,stroke:transparent,stroke-width:0px
    style APILayer fill:transparent,stroke:transparent,stroke-width:0px
    style ShareLayer fill:transparent,stroke:transparent,stroke-width:0px
    style PlatformLayer fill:transparent,stroke:transparent,stroke-width:0px
    style CoreLayer fill:transparent,stroke:transparent,stroke-width:0px
```
