# 查询模块（后端）

## 模块目的

此模块用于实现用户在素材库中精准查询的需求，提供高效、准确的查询服务，以便用户能够快速找到所需的素材。
![image-20240725160715631](https://raw.githubusercontent.com/abandon888/photoImg/main/test/image-20240725160715631.png)

## 模块定位

此模块模块为Go+ builder后端服务的一部分。主要用于实现用户在素材库中的查询需求，包括：

- 用户可以通过关键词搜索素材。
- 用户可以按类别、价格范围、品牌等筛选素材。
- 搜索结果需要以关联度来进行排序，关联度高的放在前面。
- 用户可以对查询结果进行排序（如按价格、评分、时间等）。
- 支持分页显示查询结果。
- 显示每个素材的详细信息，包括名称、图片等。

![img](https://raw.githubusercontent.com/abandon888/photoImg/main/test/(null)-20240725154054598.png)

## 模块接口

### 素材列表

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

### 历史素材列表

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

### 收藏素材列表

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