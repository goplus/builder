# 添加/收藏素材模块（后端）

## 模块目的

实现AI生成素材，补充搜索结果的需求，提供高效、符合预期的素材生成服务。包括 AI生成精灵、AI生成背景、AI生成音频等。

## 模块定位

该模块为Go+ builder后端服务的一部分。主要用于记录用户使用素材的历史记录，以及用户收藏素材的需求。此外，当用户点击收藏或添加某一AI生成的素材时，可以将该素材添加至公有素材库中。


![img](https://raw.githubusercontent.com/abandon888/photoImg/main/test/(null)-20240725144730961.png)

![img](https://raw.githubusercontent.com/abandon888/photoImg/main/test/(null)-20240725144730919.png)

## 模块接口

### AI素材导入至素材库

Request 

方法：POST

路径：/asset/ai/export

```TypeScript
export interface Request {
    jobId: string;
    [property: string]: any;
}
e.g.
curl --location --request POST '/asset/ai/export' \
--form 'jobId=""'
```

Response

200 ok

内容格式 ： JSON

```TypeScript
{
    "assetId": "string"
}
```

400 badrequest

owner和 authorization不一致时报错

```Go
{
    "err": "failed to export asset"
}
```

### 添加到历史记录

Request

方法 ： POST

路径 ： /asset/history

```TypeScript
export interface Request {
    assetId: string;
    [property: string]: any;
}
e.g.
curl --location --request POST '/asset/history?assetId&owner' \
--form 'assetId=""' \
--form 'owner=""'
```

Response

200 ok

owner和 authorization中不一致时报错

400 badrequest

```Go
{
    "err": "failed to add history"
}
```

### 添加到收藏

Request

方法 ： POST

路径 ： /asset/favorites

```TypeScript
export interface Request {
    assetId: string;
    [property: string]: any;
}
e.g.
curl --location --request POST '/asset/favorites' \
--form 'assetId=""' \
--form 'owner=""'
```

Response

200 ok

400 badrequest

owner和 authorization中不一致时报错

```Go
{
    "err": "failed to add favorites"
}
```