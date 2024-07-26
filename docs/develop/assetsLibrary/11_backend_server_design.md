# Controller层

## AIGC

```go
interface{
    (c *AigcClient)CallEmbedding(ctx context.Context, word string)([]float64)
    (c *AigcClient)CallGenImage(ctx context.Context, textDesc string)
    (c *AigcClient)CallGenAsset(ctx context.Context, imageUrl string)
}
```



#### 对AI侧协议：

```json
文本转词向量
Request body
方法 POST
路径 /embedding
{
  "word": "string",
}
e.g.
curl --location --request POST '/embedding'  --form 'word='

Response body
内容格式 ： JSON
{
  "embedding": array,
}
```



```json
文本生成图片
Request body
方法 POST 
路径 /sd/prompt

{
  "textDesc": "string",
}

e.g.
curl --location --request POST '/sd/prompt'  --form 'textDesc='

Response body
内容格式 ： JSON
{
  "imageUrl": "string",
}

```



```JSON
图片生成精灵
Request body
方法 POST 
路径 /imageGenSprite
{
  "imageUrl": "string",
}

e.g.
curl --location --request POST '/imageGenSprite'  --imageUrl 'textDesc='

Response body
内容格式 ： JSON
{
  "files": {
      "imageUrl": "string",
      "skeletonUrl" : "string",
      "animMeshUrl" : "string",
      "frameDataUrl" : "string"
  },
}
```

## 

## 素材列表

```go
interface{
    (ctrl *Controller)ListAssets(ctx context.Context, params *ListAssetsParams) (*model.ByPage[model.Asset])
    (ctrl *Controller) Embedding(word string)(float64[])
}
```

#### AssetList

暴露给客户端，返回素材列表

```Go
type CategoryCollection map[string]string
type ListAssetsParams struct {
        .....
        // just this field changed
        Category *CategoryCollection
        .....
}
func (ctrl *Controller)ListAssets(ctx context.Context, params *ListAssetsParams) (*model.ByPage[model.Asset], error){
    index = nil
    if ListAssetsParams.keyword != nil{
        // word to vector
        vec = Embedding(ListAssetsParams.keyword)
        // search in vector database
        id[] = model.searchByEmbedding(ctx, vec)
    }
    assets = model.ListAssets(ctx, ctrl.db, params.Pagination, wheres, orders, index)
    return assets
}
```

#### Embedding（AI）

实现 将文本encode的功能

会调用 AI 侧能力

```Go
func (ctrl *Controller) Embedding(word string){

    // call aigc service
    result []float64 = ctrl.aigcService.CallEmbedding(ctx, word)
    return result
}
```

## 文本生成图片

```go
interface{
    (ctrl *Controller) GenSpriteImage(ctx context.Context, params *GenSpriteImageParams)(*GenSpriteImageResult)
    (ctrl *Controller) GenBackdropImage(ctx context.Context, params *GenBackdropImageParams)(*GenBackdropImageResult)
    (ctrl *Controller) textGenImage(ctx context.Context, jobId int, textDesc string)
}
```

#### TextGenSpriteImage

```Go
type GenSpriteImageParams{
    Category CategoryCollection `json:"Category"`
    Keyword string `json:"Keyword"`
}
type GenSpriteImageResult{
    ImageJobId string `json:"ImageJobId"`
}
func (ctrl *Controller) GenSpriteImage(ctx context.Context, params *GenSpriteImageParams)(*GenSpriteImageResult){
    // combine the category and keyword in the request into text suitable for input into ai
    textDesc = paramsToText(params)
    // since the ai side currently only supports synchronization 
    // asynchronous is performed here in the backend.
    jobId = model.AddJob(jobType)
    // the coroutine request calls the ai-side service
    go textGenImage(ctx, jobId, textDesc)
    // return
    return &GenSpriteImageResult{
        ImageJobId : jobId
    }
}
```

#### TextGenBackdropImage

```Go
type GenBackdropImageParams{
    Category CategoryCollection
    Keyword string
    Width int
    Height int
}
type GenBackdropImageResult{
    ImageJobId string
}
func (ctrl *Controller) GenBackdropImage(ctx context.Context, params *GenBackdropImageParams)(*GenBackdropImageResult){
    // combine the category, keyword and resolution in the request into 
    // text suitable for input into ai
    textDesc = paramsToText(params)
    // Since the ai side currently only supports synchronization 
    // asynchronous is performed here in the backend.
    jobId = model.AddJob(jobType)
    
	result = GenBackdropImageResult{
        ImageJobId = jobId
    }
    // the coroutine request calls the ai-side service
    go textGenImage(ctx, jobId, textDesc)
    // return
    return &GenBackdropImageResult{
        ImageJobId : jobId
    }
}
```

#### TextGenImage（AI）

```Go

func (ctrl *Controller) textGenImage(ctx context.Context, jobId int, textDesc string){
    // calls the ai-side service
    imageUrl = ctrl.aicgService.CallGenImage(ctx, textDesc)
    // write results back to database
    model.UpdateJob(ctx, ctrl.db, jobId, imageUrl)
}
```

## 图片生成精灵

```go
interface{
    (ctrl *Controller) ImageGenSprite(ctx context.Context, params *ImageGenSpriteParams)(*ImageGenSpriteResult)
    (ctrl *Controller) genAsset(jobId int,imageUrl string)
}
```



#### ImageGenSprite

```Go
type ImageGenSpriteParams struct{
    ImageJobId string `json:"imageJobId"`
}
type ImageGenSpriteResult struct {
    JobId string `json:"jobId"`
}
func (ctrl *Controller) ImageGenSprite(ctx context.Context, params *ImageGenSpriteParams){
    // get the URL of the AI-generated image through the jobid generated by the AI image.
    imageUrl = model.getImageUrl(params.ImageJobId)
    // Since the ai side currently only supports synchronization 
    // asynchronous is performed here in the backend.
    jobId = model.AddJob(jobType)
	
    // the coroutine request calls the ai-side service
    go genAsset(ctx, jobId, imageUrl)
    // return
    return &ImageGenSpriteResult{
        JobId = jobId
    }
}
```

#### ImageGenAsset（AI）

```Go
func (ctrl *Controller) genAsset(ctx context.Context, jobId int,imageUrl string){
    // calls the ai-side service
    files FileCollection = ctrl.aicgService.CallGenAsset(ctx, imageUrl)
    // write results back to database
    model.UpdateJob(ctx, ctrl.db, jobId, files)
}
```

## 查询生成状态

```go
interface{
    (ctrl *Controller)GenStatus(ctx context.Context, params *GenStatusParams)(*GenStatusResult)
}
```



#### GenStatus

```Go
type GenStatusParams struct {
    JobId string `json:"jobId"`
}
type genResult{
    jobId string 'json:"jobId"'
    jobType int 'json:"jobType"'
    files FileCollection `json:"files"`
}

type GenStatusResult struct{
    Status int 'json:"status"'
    Result GenResult`json:"result"`
}

func (ctrl *Controller) GenStatus(ctx context.Context, params *GenStatusParams)(*GenStatusResult){
    // query job status
    statusResult = model.getJob(params.jobId)
    return &GenStatusResult{
        Status : statusResult.Status
        Result : statusResult.Result
    }
}
```

## 收藏/添加模块

```go
interface{
    (ctrl *Controller) ExportAiAsset(ctx context.Context, params *ExportAiAssetParams)(*ExportAiAssetResult)
    (ctrl *Controller) AddHistory(ctx context.Context, params *HistoryParams)
    (ctrl *Controller) AddFavorite(ctx context.Context, params *FavoriteParams)
}
```



#### ExportAiAsset

```Go
type ExportAiAssetParams{
    JobId string 'json:"jobId"'
}
type ExportAiAssetResult{
    AssetId string 'json:"assetId"'
}
func (ctrl *Controller) ExportAiAsset(ctx context.Context, params *ExportAiAssetParams)(*ExportAiAssetResult){
    addAssetParams = model.getJob(params.JobId)
    // write to database
    asset = model.AddAsset(ctx, addAssetParams)
    //write to vector database
    model.addByVec(ctx, ctrl.db, asset.ID, addAssetParams.Embedding)
    return &ExportAiAssetResult{
        AssetId = asset.id
    }
}
```

#### History

```Go
type HistoryParams{
    AssetId string 'json:"assetId"'
}
func (ctrl *Controller) AddHistory(ctx context.Context, params *HistoryParams){
    model.AddHistory(ctx, ctrl.db, params.AssetId)
}
```

#### Favorite

```Go
type FavoriteParams{
    AssetId string 'json:"assetId"'
}
func (ctrl *Controller) AddFavorite(ctx context.Context, params *FavoriteParams){
    model.AddFavorite(ctx, ctrl.db, params.AssetId)
}
```

## Model层

```go
interface{
    AddJob(ctx context.Context, db *sql.DB, jobType)(string) //返回jobId
    UpdateJob(ctx context.Context, db *sql.DB, jobId string, files FileCollection)
    GetJob(ctx context.Context, db *sql.DB, jobId string)(*Job) // 返回生成内容所有参数
    AddByVec(ctx context.Context, db *sql.DB, assetId string, embedding float64[])
    SearchByEmbedding(ctx context.Context, db *sql.DB, embedding float64[])(int[])//返回记录的素材库主键
    AddFavorite(ctx context.Context, db *sql.DB, assetId string)
    AddHistory(ctx context.Context, db *sql.DB, assetId string)
}
```

```go
type Job struct{
    ID string `db:"id" json:"id"`
    Embedding float64[] `db:"embedding" json:"embedding"`
    Files FileCollection `db:"files" json:"files"`
}
type Favorite{
    AssetId string 'db:"assetId" json:"assetId"'
    Owner string 'db:"owner" json:"owner"'
}
type History{
    AssetId string 'db:"assetId" json:"assetId"'
    Owner string 'db:"owner" json:"owner"'
}
```

