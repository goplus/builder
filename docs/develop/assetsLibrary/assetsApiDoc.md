## 全局属性

`category`:类别，如人物分为动画人物，历史人物

`owner`:用户名

`assetType`:精灵/背景/音频

`isPublic`:是否公开，目前没用，后续社区可能有用

`resolution`:分辨率

`imageJobId`:由ai生成服务生成的标识图片（包括背景和人物）的唯一标识性属性

## 搜索模块

**模块功能** 1.通过关键词搜索商品。 2.按类别、价格范围、品牌等筛选素材。 3.搜索结果需要以关联度来进行排序，关联度高的放在前面 4.对查询结果进行排序（如按价格、评分、时间等）。 5.支持分页显示查询结果。 6.显示每个商品的详细信息，包括名称、图片等。

![img](./assets/(null)-20240725154054598.png)

### 对外接口

#### 素材列表

Request

方法：GET

路径：/asset/list

```TypeScript
export interface Request {
    assetType?: number;            
    category?: category; 
    keyword?: string;
    orderBy?: string;
    owner?: string;
    pageIndex?: number;
    pageSize?: number;
    [property: string]: any;
}
interface category {   
    [key: string]:{    
       [subCategory: string]: string[];
  }; 
}
category  e.g.
category: {     
  "内容": {
       "动物": ["狗", "猫", "乌龟"],
       "植物": ["树", "花", "草"]
    },     
  "风格": {
       "像素风格": ["8-bit", "16-bit"],
       "写实风格": ["高清", "逼真"]
    }   
}
此处category结构使用URLencode
```



```Go
e.g.
curl --location --request GET '/asset/list/?data' 
```

Response 

200 ok

内容格式 ： JSON

```TypeScript
{
  "total": 0,
  "data": [
    {
      "id": "string",
      "displayName": "string",
      "owner": "string",
      "files": "string",
      "preview": "string",
      "clickCount": 0,
      "status": 0
      "isAiGen": true
    }
  ]
}
```

#### 历史素材列表

Request

方法：GET

路径：/asset/history/list

```TypeScript
export interface Request {
    assetType?: string;
    category?: category;
    keyword?: string;
    orderBy?: string;
    owner: string;
    pageIndex?: number;
    pageSize?: number;
    [property: string]: any;
}
e.g.
curl --location --request GET '/asset/history/list?owner&category&assetType&keyword&pageIndex&pageSize&orderBy' \
```

Response 

200 ok

内容格式 ： JSON

```TypeScript
{
  "total": 0,
  "data": [
    {
      "id": "string",
      "displayName": "string",
      "owner": "string",
      "files": "string",
      "preview": "string",
      "clickCount": 0,
      "status": 0
      "isAiGen": true
    }
  ]
}
```

#### 收藏素材列表

Request

方法：GET

路径：/asset/favorites/list

```TypeScript
export interface Request {
    assetType?: string;
    category?: string;
    keyword?: string;
    orderBy?: string;
    owner: string;
    pageIndex?: number;
    pageSize?: number;
    [property: string]: any;
}
e.g.
curl --location --request GET '/asset/favorites/list?owner&category&assetType&keyword&pageIndex&pageSize&orderBy' 
```

Response 

200 ok

内容格式 ： JSON

```TypeScript
{
  "total": 0,
  "data": [
    {
      "id": "string",
      "displayName": "string",
      "owner": "string",
      "files": "string",
      "preview": "string",
      "clickCount": 0,
      "status": 0
      "isAiGen": true
    }
  ]
}
```

### **实现方案**

解析前端传递的参数，主要是category和keyword。 经过encoding将参数转化为词向量。 将词向量放入向量数据库（暂定milvus）比对，将结果按匹配度排序。 将搜索到的结果（暂定结果为asset_id）放入mysql中查找。 返回查询结果。

```Go
func ListAssets(){
    encoding()
    searchInMilvus()
    AssetByID()
    return assetsList
}

func encoding() // 将参数转化为词向量。
func searchInMilvus() // 将词向量放入向量数据库（暂定milvus）比对，将结果按匹配度排序。
func AssetByID() //将搜索到的结果（暂定结果为asset_id）放入mysql中查找。
```

## AI生成模块

![img](./assets/(null)-20240725144730930.png)

### **图片生成模块后端实现**

 **模块功能**

- 生成与用户输入一致（keyword、category）的素材。
- 提供查询生成状态接口，以便前端获取查询状态

### 对外接口

#### AI生成精灵图片

Request

方法 ： POST

路径 ： /asset/ai/sprite/image

```TypeScript
export interface Request {
    category?: string;
    keyword?: string;
    [property: string]: any;
}
e.g.

curl --location --request POST '/asset/ai/spriteImage' \
--form 'keyword=""' \
--form 'category=""'
```

Response

200 ok

内容格式 ： JSON

```TypeScript
{
  "imageJobId": "string"
}
```

#### AI生成背景图片

Request

方法 ： POST

路径 ： /asset/ai/backdrop/image

```TypeScript
export interface Request {
    category?: string;
    keyword?: string;
//    resolution?: string;
    width?: number;
    height?: number;
    [property: string]: any;
}
e.g.
curl --location --request POST '/asset/ai/backdropImage' \
--form 'keyword=""' \
--form 'category=""' \
--form 'resolution=""'
```

Response

200 ok

内容格式 ： JSON

```TypeScript
{
  "imageJobId": "string"
}
```

![img](./assets/(null)-20240725144730917.png)

#### AI图片生成精灵

传入所选的图片的生成任务id、所选图片url ， 返回生成精灵任务id 、 生成精灵结果url

Request 

方法 ： POST

路径 ： /asset/ai/sprite

```TypeScript
export interface Request {
    imageJobId: string;
    [property: string]: any;
}
e.g.
curl --location --request POST '/asset/ai/sprite' \
--form 'imageJobId=""'
```

Response

200 ok

内容格式 ： JSON

```TypeScript
{
  "spritejobId": "string",
}
```

#### ~~AI图片生成背景~~

~~传入所选的图片的生成任务id、所选图片url ， 返回生成精灵任务id 、 生成精灵结果url~~

~~Request~~ 

~~方法 ： POST~~

~~路径 ： /asset/ai/backdrop~~

```TypeScript
export interface Request {
    imageJobId: string;
    [property: string]: any;    
}     
e.g.
curl --location --request POST '/asset/ai/backdrop' \
--form 'imageJobId=""' \
--form 'resolution=""'
```

~~Response~~

~~200 ok~~

~~内容格式 ： JSON~~

```TypeScript
{
  "backdropJobId": "string",
}
```

#### 查询生成状态

传入生成任务id ， 返回生成状态

Request 

方法 ： GET

路径 ： /asset/ai/status

```TypeScript
export interface Request {
    jobId: string;
    [property: string]: any;
}
e.g.
curl --location --request GET '/asset/ai/status/?jobId'
```

200 ok

内容格式 ： JSON

```TypeScript
{
  "status": 0,
  "result": {
    "jobId": "string",
    "type": 0,
    "files": {
        "imageUrl": "string",
        "skeletonUrl" : "string",
        "animMeshUrl" : "string",
        "frameDataUrl" : "string"
        "backdropImageUrl" : "string"
    }
  }
}
/*      "imageUrl": "string",
      "spriteComponent": {
        "skeletonUrl" : "string",
        "animMeshUrl" : "string",
        "frameDataUrl" : "string"
        ......
      },
      "backdropComponent": {
        "backdropImageUrl" : "string"
        ......
      },
*/
//      "soundsComponent": [
//        "string"
//      ]
```

status分为以下几种：

```Go
const{
    waitting = 0   // 正在排队
    generating = 1 // 正在生成
    finish = 2     // 已完成
}
```

type分为以下几种：

```Go
const{
    image = 0       // 纯图片生成，包含精灵图片和背景图片
    sprite = 1      // 图片生成精灵素材
    backdrop = 3    // 图片生成背景素材
//    sounds = 4      // 生成音乐素材
}
```

### **实现方案**

- 解析前端传递的参数，主要是category和keyword。
- 将参数传递给aigc服务器。
- 将生成摘要返回给前端。
- 将生成状态返回给前端。

## 添加/收藏素材模块

 **概述**

- 模块描述：用户点击收藏或添加某一ai生成的素材后，将该素材添加至公有素材库中。
- 目标：添加ai素材到公有素材库。

 **功能需求**

- 添加ai素材到公有素材库。

![img](./assets/(null)-20240725144730961.png)

![img](./assets/(null)-20240725144730919.png)

### 对外接口

#### AI素材导入至素材库

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

#### 添加到历史记录

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

#### 添加到收藏

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

### **实现方案**

- 解析前端传递的参数，ai素材的url和id。
- 查询此素材对应的词向量。
- 后端将此素材信息（id、词向量）写入milvus和数据库。
