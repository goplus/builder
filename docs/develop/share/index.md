# Tech design for Share
## 挑战
* 提供丝滑的分享方式以满足用户的需求
    我们将尽可能的将Share与XBuilder的耦合度降低，让Share可以作为一块独立的功能，提供相应的分享方式，以及后续如果需要对分享方式进行修改的话，可以很方便的进行操作
## 模块
### Third-partyPlatform
负责与外部平台的集成。目前支持：QQ、微信、抖音、小红书、B站。为directShare、screenshotShare 、recordShare提供第三方平台的接口支持
### Poster
生成分享海报，包含图片、二维码和项目信息
### QRCode
生成二维码，提供给 Poster、Third-partyPlatform使用
### Screenshot
截屏功能，用于捕获当前应用画面，结果交给 Poster 进行渲染
### Recording
录屏功能，用于捕获用户操作过程并输出视频文件
### suspend
主要实现游戏页面的运行的暂停和运行，服务于 Screenshot、Recording
### StorageEngine
负责本地或云端存储，用于保存录屏文件或临时资源

## 主要功能实现
这里我们描述如何通过组合上述模块来实现关键功能。
### Share
Share模块实现了share功能，借助直接directShare、screenshotShare 、recordShare三种分享模式实现分享
### directShare
直接分享模块，通过集成 Poster、QRCode 和 Third-partyPlatform，将生成的海报或二维码直接分享到第三方平台
### screenshotShare
屏分享模块。通过 Suspend 暂停游戏画面，使用 Screenshot 捕获当前场景，并结合 Poster 与 QRCode 生成分享内容，最后调用 Third-partyPlatform 完成分享
### recordShare
屏分享模块。通过 Suspend 控制录制时机，利用 Recording 捕获用户操作生成视频，并结合 QRCode 与 StorageEngine 存储或生成链接，最终通过 Third-partyPlatform 分享至目标平台
## 模块关系
下图说明了系统中各个模块之间的关系：

```mermaid
graph TB
    %% 功能模块
    ThirdParty["`**Third-partyPlatform**
    第三方平台接口集成`"]

    Poster["`**Poster**
    生成分享海报`"]

    QRCode["`**QRCode**
    生成二维码`"]

    Screenshot["`**Screenshot**
    捕获当前画面`"]

    Recording["`**Recording**
    捕获录屏视频`"]

    Suspend["`**Suspend**
    游戏暂停/恢复`"]

    Storage["`**StorageEngine**
    存储录屏/临时资源`"]

    %% 组件模块
    Share["`**Share**
    分享功能总控`"]

    Direct["`**directShare**
    直接分享`"]

    ScreenShare["`**screenshotShare**
    截屏分享`"]

    RecordShare["`**recordShare**
    录屏分享`"]

    %% 关系
    Share --> Direct
    Share --> ScreenShare
    Share --> RecordShare

    Direct --> Poster
    Direct --> QRCode
    Direct --> ThirdParty

    ScreenShare --> Suspend
    ScreenShare --> Screenshot
    ScreenShare --> Poster
    ScreenShare --> QRCode
    ScreenShare --> ThirdParty

    RecordShare --> Suspend
    RecordShare --> Recording
    RecordShare --> QRCode
    RecordShare --> Storage
    RecordShare --> ThirdParty

    Poster --> QRCode

    %% 分类样式
    classDef functionModule fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef componentModule fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px

    class ThirdParty,Poster,QRCode,Screenshot,Recording,Suspend,Storage functionModule
    class Share,Direct,ScreenShare,RecordShare componentModule
```
