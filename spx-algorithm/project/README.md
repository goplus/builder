# Image Search API

基于 OpenCLIP 的图像搜索 API，支持通过文本查询在多张图片中进行语义搜索。

## 功能特性

- 🔍 基于 CLIP 模型的文本-图像语义搜索
- 📁 支持多种图片格式（PNG, JPG, SVG, WebP 等）
- 🚀 Flask RESTful API 接口
- 📊 返回相似度排序结果
- 🔧 支持自定义返回结果数量（top-k）
- 🐳 Docker 容器化部署
- 📝 完整的错误处理和日志记录

## 项目结构

```
project/
├── app/
│   ├── __init__.py          # Flask 应用工厂
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py        # API 路由
│   ├── services/
│   │   ├── __init__.py
│   │   └── image_search_service.py  # 核心搜索服务
│   ├── config/
│   │   ├── __init__.py
│   │   └── config.py        # 配置管理
│   └── models/              # 数据模型（预留）
├── tests/                   # 测试文件
├── uploads/                 # 上传文件临时目录
├── logs/                    # 日志文件
├── static/                  # 静态文件
├── requirements.txt         # Python 依赖
├── Dockerfile              # Docker 配置
├── .env.example            # 环境变量示例
└── run.py                  # 应用启动文件
```

## 快速开始

### 环境要求

- Python 3.8+
- PyTorch
- 足够的内存运行 CLIP 模型

### 安装依赖

```bash
# 克隆项目
cd project

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\\Scripts\\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 配置环境

```bash
# 复制环境变量配置文件
cp .env.example .env

# 编辑配置文件
nano .env
```

### 启动服务

```bash
# 开发模式
python run.py

# 或使用 gunicorn（生产环境）
gunicorn --bind 0.0.0.0:5000 --workers 4 run:app
```

## API 接口

### 1. 健康检查

```http
GET /api/health
```

**响应示例：**
```json
{
  "status": "healthy",
  "service": "image-search-api"
}
```

### 2. 文件上传搜索

```http
POST /api/search
Content-Type: multipart/form-data
```

**请求参数：**
- `text` (string, required): 查询文本
- `images` (files, required): 图片文件列表
- `top_k` (integer, optional): 返回前 k 个结果

**响应示例：**
```json
{
  "query": "a cute cat",
  "total_images": 4,
  "results_count": 2,
  "results": [
    {
      "rank": 1,
      "similarity": 0.8567,
      "filename": "cute_cat.jpg"
    },
    {
      "rank": 2,
      "similarity": 0.7234,
      "filename": "kitten.png"
    }
  ]
}
```

### 3. URL 搜索

```http
POST /api/search/url
Content-Type: application/json
```

**请求体：**
```json
{
  "text": "查询文本",
  "image_urls": [
    "http://example.com/image1.jpg",
    "http://example.com/image2.png"
  ],
  "top_k": 5
}
```

## 使用示例

### Python 客户端示例

```python
import requests

# 文件上传搜索
def search_with_files():
    url = "http://localhost:5000/api/search"
    
    files = [
        ('images', open('image1.jpg', 'rb')),
        ('images', open('image2.png', 'rb')),
    ]
    
    data = {
        'text': 'a beautiful sunset',
        'top_k': 3
    }
    
    response = requests.post(url, files=files, data=data)
    return response.json()

# URL 搜索
def search_with_urls():
    url = "http://localhost:5000/api/search/url"
    
    data = {
        "text": "a cute dog",
        "image_urls": [
            "https://example.com/dog1.jpg",
            "https://example.com/dog2.png"
        ],
        "top_k": 2
    }
    
    response = requests.post(url, json=data)
    return response.json()
```

### cURL 示例

```bash
# 文件上传搜索
curl -X POST http://localhost:5000/api/search \
  -F "text=a cute cat" \
  -F "images=@image1.jpg" \
  -F "images=@image2.png" \
  -F "top_k=3"

# URL 搜索
curl -X POST http://localhost:5000/api/search/url \
  -H "Content-Type: application/json" \
  -d '{
    "text": "a beautiful landscape",
    "image_urls": ["http://example.com/img1.jpg"],
    "top_k": 5
  }'
```

## Docker 部署

```bash
# 构建镜像
docker build -t image-search-api .

# 运行容器
docker run -p 5000:5000 image-search-api

# 或使用 docker-compose
echo "version: '3.8'
services:
  api:
    build: .
    ports:
      - '5000:5000'
    environment:
      - FLASK_ENV=production
    volumes:
      - ./logs:/app/logs" > docker-compose.yml

docker-compose up -d
```

## 配置选项

### 环境变量

- `FLASK_ENV`: 运行环境 (development/production)
- `SECRET_KEY`: Flask 密钥
- `HOST`: 服务器主机地址
- `PORT`: 服务器端口
- `CLIP_MODEL_NAME`: CLIP 模型名称
- `CLIP_PRETRAINED`: 预训练权重

### 支持的 CLIP 模型

- `ViT-B-32`
- `ViT-B-16`
- `ViT-L-14`
- `RN50`
- `RN101`

## 错误处理

API 返回标准的 HTTP 状态码和错误信息：

```json
{
  "error": "错误描述",
  "code": "ERROR_CODE",
  "details": "详细错误信息"
}
```

常见错误码：
- `MISSING_TEXT_QUERY`: 缺少查询文本
- `NO_FILES_UPLOADED`: 没有上传文件
- `INVALID_TOP_K`: top_k 参数无效
- `INTERNAL_ERROR`: 内部服务器错误

## 开发指南

### 运行测试

```bash
# 安装测试依赖
pip install pytest pytest-flask

# 运行测试
pytest tests/
```

### 代码格式化

```bash
# 格式化代码
black app/ tests/

# 检查代码风格
flake8 app/ tests/
```

## 性能优化

- 模型只在启动时加载一次
- 支持批量图片处理
- 临时文件自动清理
- 可配置的工作进程数量

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！