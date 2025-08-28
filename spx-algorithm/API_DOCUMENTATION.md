# SPX 算法向量数据库 API 文档

## 概览

SPX 算法向量数据库 API 提供基于 CLIP 模型的图像向量化存储和语义搜索功能。支持 SVG 图像的智能索引、存储和检索。

**Base URL**: `http://localhost:5000`

**技术栈**:
- Flask Web 框架
- Milvus 向量数据库
- OpenCLIP 模型 (ViT-B-32)
- SVG 处理支持

## 目录

- [基础接口](#基础接口)
- [向量数据库操作](#向量数据库操作)
- [搜索接口](#搜索接口)
- [数据管理](#数据管理)
- [错误处理](#错误处理)
- [使用示例](#使用示例)

---

## 基础接口

### 1. 服务状态检查

#### `GET /`
获取 API 服务信息和可用端点列表。

**响应示例**:
```json
{
  "message": "Image Search API",
  "version": "1.0.0",
  "endpoints": {
    "health": "/api/health",
    "search_resource": "/api/search/resource (POST)",
    "vector_db_health": "/api/vector/health",
    "vector_db_stats": "/api/vector/stats",
    "vector_db_add": "/api/vector/add (POST)",
    "vector_db_data": "/api/vector/data",
    "vector_db_search": "/api/vector/search (POST)",
    "vector_db_delete": "/api/vector/delete (DELETE)",
    "vector_db_batch_add": "/api/vector/batch/add (POST)"
  }
}
```

#### `GET /api/health`
检查 API 服务健康状态。

**响应示例**:
```json
{
  "status": "healthy",
  "service": "image-search-api"
}
```

#### `GET /api/vector/health`
检查向量数据库服务健康状态。

**响应示例**:
```json
{
  "status": "healthy",
  "service": "spx-vector-database-api"
}
```

---

## 向量数据库操作

### 1. 获取数据库统计信息

#### `GET /api/vector/stats`
获取向量数据库的统计信息。

**响应示例**:
```json
{
  "success": true,
  "stats": {
    "total_images": 1250,
    "dimension": 512,
    "model_name": "ViT-B-32",
    "pretrained": "laion2b_s34b_b79k",
    "collection_name": "spx_vector_collection",
    "device": "cuda",
    "host": "localhost",
    "port": "19530"
  }
}
```

### 2. 添加单张图片

#### `POST /api/vector/add`
将 SVG 图片添加到向量数据库。支持两种方式：URL 下载和直接提供 SVG 内容。

**请求体**:

方式1 - 通过 URL 下载：
```json
{
  "id": 123,
  "url": "https://example.com/image.svg"
}
```

方式2 - 直接提供 SVG 内容（推荐）：
```json
{
  "id": 123,
  "url": "https://example.com/image.svg",
  "svg_content": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\">...</svg>"
}
```

**参数说明**:
- `id` (required, integer): 图片的唯一标识ID
- `url` (required, string): 图片的 URL 地址
- `svg_content` (optional, string): SVG 内容字符串

**响应示例**:
```json
{
  "success": true,
  "message": "图片成功添加到向量数据库",
  "id": 123,
  "url": "https://example.com/image.svg"
}
```

### 3. 批量添加图片

#### `POST /api/vector/batch/add`
批量添加多张图片到向量数据库。

**请求体**:
```json
{
  "images": [
    {
      "id": 1,
      "url": "https://example.com/image1.svg",
      "svg_content": "<svg>...</svg>"
    },
    {
      "id": 2,
      "url": "https://example.com/image2.svg"
    }
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "total": 2,
  "success_count": 2,
  "failed_count": 0,
  "results": [
    {
      "index": 0,
      "success": true,
      "id": 1,
      "url": "https://example.com/image1.svg"
    },
    {
      "index": 1,
      "success": true,
      "id": 2,
      "url": "https://example.com/image2.svg"
    }
  ]
}
```

### 4. 删除图片

#### `DELETE /api/vector/delete`
根据 ID 从向量数据库中删除图片记录。

**请求体**:
```json
{
  "id": 123
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "图片记录已删除",
  "id": 123
}
```

---

## 搜索接口

### 1. 主搜索接口（推荐）

#### `POST /api/search/resource`
基于向量数据库的智能图像搜索。使用文本描述搜索相似的 SVG 图片。

**请求体**:
```json
{
  "text": "dog running in park",
  "top_k": 10,
  "threshold": 0.3
}
```

**参数说明**:
- `text` (required, string): 查询文本描述
- `top_k` (optional, integer): 返回结果数量，默认 10
- `threshold` (optional, float): 相似度阈值 (0-1)，默认 0.0

**响应示例**:
```json
{
  "success": true,
  "query": "dog running in park",
  "top_k": 10,
  "threshold": 0.3,
  "results_count": 5,
  "results": [
    {
      "rank": 1,
      "similarity": 0.8542,
      "id": 101,
      "url": "https://example.com/dog.svg",
      "image_path": "https://example.com/dog.svg",
      "added_at": "2024-01-15 10:30:00"
    },
    {
      "rank": 2,
      "similarity": 0.7891,
      "id": 205,
      "url": "https://example.com/running-dog.svg",
      "image_path": "https://example.com/running-dog.svg",
      "added_at": "2024-01-15 11:45:00"
    }
  ]
}
```

### 2. 向量数据库搜索

#### `POST /api/vector/search`
专用的向量数据库搜索接口。

**请求体**:
```json
{
  "text": "butterfly",
  "k": 5
}
```

**参数说明**:
- `text` (required, string): 查询文本
- `k` (optional, integer): 返回结果数量，默认 10

**响应示例**:
```json
{
  "success": true,
  "query": "butterfly",
  "k": 5,
  "results_count": 3,
  "results": [
    {
      "rank": 1,
      "similarity": 0.9123,
      "id": 301,
      "url": "https://example.com/butterfly.svg",
      "added_at": "2024-01-15 09:20:00"
    }
  ]
}
```

---

## 数据管理

### 1. 获取所有数据

#### `GET /api/vector/data`
获取向量数据库中的所有图片信息，支持分页。

**查询参数**:
- `include_vectors` (optional, boolean): 是否包含向量数据，默认 false
- `limit` (optional, integer): 限制返回数量
- `offset` (optional, integer): 偏移量，默认 0

**请求示例**:
```
GET /api/vector/data?include_vectors=false&limit=20&offset=0
```

**响应示例**:
```json
{
  "success": true,
  "total_count": 1250,
  "returned_count": 20,
  "offset": 0,
  "limit": 20,
  "include_vectors": false,
  "data": [
    {
      "id": 1,
      "url": "https://example.com/image1.svg",
      "added_at": "2024-01-15 10:30:00"
    },
    {
      "id": 2,
      "url": "https://example.com/image2.svg",
      "added_at": "2024-01-15 10:35:00",
      "updated_at": "2024-01-15 15:20:00"
    }
  ]
}
```

---

## 错误处理

API 使用标准的 HTTP 状态码和结构化的错误响应。

### 常见错误响应

#### 400 Bad Request
```json
{
  "error": "缺少必需参数: text",
  "code": "MISSING_TEXT"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "删除失败，图片ID不存在",
  "code": "DELETE_FAILED",
  "id": 123
}
```

#### 500 Internal Server Error
```json
{
  "error": "向量数据库初始化失败",
  "code": "VECTOR_DB_INIT_FAILED",
  "details": "Connection refused: localhost:19530"
}
```

### 错误代码列表

| 错误代码 | 描述 |
|---------|------|
| `INVALID_JSON` | 请求体不是有效的 JSON |
| `MISSING_TEXT` | 缺少查询文本参数 |
| `INVALID_K` | k 参数必须是正整数 |
| `INVALID_THRESHOLD` | 阈值参数超出有效范围 |
| `ADD_IMAGE_FAILED` | 添加图片失败 |
| `DELETE_FAILED` | 删除操作失败 |
| `SEARCH_ERROR` | 搜索操作失败 |
| `VECTOR_DB_INIT_FAILED` | 向量数据库初始化失败 |

---

## 使用示例

### 快速开始

#### 1. 启动服务

```bash
# 启动 Milvus 向量数据库
docker run -d --name milvus-standalone \
  -p 19530:19530 -p 9091:9091 \
  milvusdb/milvus:latest

# 安装依赖并启动 Flask 应用
pip install -r requirements.txt
python run.py
```

#### 2. 添加图片

```bash
# 添加单张图片
curl -X POST http://localhost:5000/api/vector/add \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "url": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f436.svg"
  }'

# 批量添加图片
curl -X POST http://localhost:5000/api/vector/batch/add \
  -H "Content-Type: application/json" \
  -d '{
    "images": [
      {"id": 1, "url": "https://example.com/dog.svg"},
      {"id": 2, "url": "https://example.com/cat.svg"}
    ]
  }'
```

#### 3. 搜索图片

```bash
# 基础搜索
curl -X POST http://localhost:5000/api/search/resource \
  -H "Content-Type: application/json" \
  -d '{
    "text": "dog",
    "top_k": 5
  }'

# 带阈值的精确搜索
curl -X POST http://localhost:5000/api/search/resource \
  -H "Content-Type: application/json" \
  -d '{
    "text": "running animal",
    "top_k": 10,
    "threshold": 0.5
  }'
```

#### 4. 管理数据

```bash
# 获取统计信息
curl http://localhost:5000/api/vector/stats

# 获取所有数据（分页）
curl "http://localhost:5000/api/vector/data?limit=20&offset=0"

# 删除图片
curl -X DELETE http://localhost:5000/api/vector/delete \
  -H "Content-Type: application/json" \
  -d '{"id": 1}'
```

### Python SDK 示例

```python
import requests
import json

class SPXVectorAPI:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
    
    def add_image(self, id: int, url: str, svg_content: str = None):
        """添加图片到向量数据库"""
        data = {"id": id, "url": url}
        if svg_content:
            data["svg_content"] = svg_content
        
        response = requests.post(f"{self.api_base}/vector/add", json=data)
        return response.json()
    
    def search_images(self, text: str, top_k: int = 10, threshold: float = 0.0):
        """搜索相似图片"""
        data = {
            "text": text,
            "top_k": top_k,
            "threshold": threshold
        }
        
        response = requests.post(f"{self.api_base}/search/resource", json=data)
        return response.json()
    
    def get_stats(self):
        """获取数据库统计信息"""
        response = requests.get(f"{self.api_base}/vector/stats")
        return response.json()

# 使用示例
api = SPXVectorAPI()

# 添加图片
result = api.add_image(1, "https://example.com/dog.svg")
print(f"添加结果: {result}")

# 搜索图片
results = api.search_images("dog running", top_k=5, threshold=0.3)
print(f"找到 {results['results_count']} 个相似图片")

# 获取统计信息
stats = api.get_stats()
print(f"数据库中共有 {stats['stats']['total_images']} 张图片")
```

### JavaScript 示例

```javascript
class SPXVectorAPI {
    constructor(baseUrl = 'http://localhost:5000') {
        this.baseUrl = baseUrl;
        this.apiBase = `${baseUrl}/api`;
    }
    
    async addImage(id, url, svgContent = null) {
        const data = { id, url };
        if (svgContent) {
            data.svg_content = svgContent;
        }
        
        const response = await fetch(`${this.apiBase}/vector/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        return await response.json();
    }
    
    async searchImages(text, topK = 10, threshold = 0.0) {
        const data = {
            text,
            top_k: topK,
            threshold
        };
        
        const response = await fetch(`${this.apiBase}/search/resource`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        return await response.json();
    }
    
    async getStats() {
        const response = await fetch(`${this.apiBase}/vector/stats`);
        return await response.json();
    }
}

// 使用示例
const api = new SPXVectorAPI();

// 搜索图片
api.searchImages('dog running', 5, 0.3)
    .then(results => {
        console.log(`找到 ${results.results_count} 个相似图片`);
        results.results.forEach(item => {
            console.log(`ID: ${item.id}, 相似度: ${item.similarity.toFixed(4)}`);
        });
    })
    .catch(error => console.error('搜索失败:', error));
```

---

## 配置说明

### 环境变量

| 变量名 | 描述 | 默认值 |
|-------|------|--------|
| `MILVUS_HOST` | Milvus 服务器地址 | `localhost` |
| `MILVUS_PORT` | Milvus 服务器端口 | `19530` |
| `MILVUS_COLLECTION_NAME` | 集合名称 | `spx_vector_collection` |
| `MILVUS_DIMENSION` | 向量维度 | `512` |
| `CLIP_MODEL_NAME` | CLIP 模型名称 | `ViT-B-32` |
| `CLIP_PRETRAINED` | 预训练权重 | `laion2b_s34b_b79k` |

### Docker Compose 配置示例

```yaml
version: '3.8'
services:
  milvus:
    image: milvusdb/milvus:latest
    ports:
      - "19530:19530"
      - "9091:9091"
    volumes:
      - milvus_data:/var/lib/milvus
    
  spx-api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - MILVUS_HOST=milvus
      - MILVUS_PORT=19530
    depends_on:
      - milvus

volumes:
  milvus_data:
```

---

## 性能和限制

### 性能指标

- **搜索延迟**: < 100ms (向量数据库模式)
- **批量添加**: 支持单次添加最多 1000 张图片
- **并发支持**: 支持多用户同时访问
- **存储容量**: 取决于 Milvus 配置，支持百万级图片

### 使用限制

- SVG 文件大小: 建议 < 10MB
- 图片 ID: 必须为正整数且唯一
- URL 长度: 最大 2000 字符
- 查询文本: 建议 < 500 字符
- 批量操作: 单次最多处理 1000 个项目

---

## 常见问题

### Q: 如何提高搜索准确性？
A: 
1. 使用描述性的查询文本
2. 调整 `threshold` 参数过滤低相似度结果
3. 确保向量数据库中有足够的相关图片

### Q: 支持哪些图片格式？
A: 目前主要支持 SVG 格式。SVG 文件会被转换为 PNG 后进行特征提取。

### Q: 如何处理重复的 ID？
A: 如果添加已存在的 ID，系统会更新该记录而不是创建重复项。

### Q: 数据是否持久化？
A: 是的，数据存储在 Milvus 向量数据库中，具有持久化和高可用特性。

---

## 更新日志

### v1.0.0 (2024-01-15)
- 初始发布
- 支持基于 Milvus 的向量搜索
- 完整的 CRUD API
- SVG 图片支持
- 批量操作支持

---

## 联系方式

如有问题或建议，请联系开发团队或提交 Issue。

**API 文档版本**: 1.0.0  
**最后更新**: 2024-01-15