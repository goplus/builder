# SPX Algorithm - 图像搜索推荐模块

重构后的 SPX 算法推荐模块，提供基于 CLIP 模型和 Milvus 向量数据库的智能图像搜索服务。

## 项目概述

本项目是一个独立的算法推荐模块，采用清晰的分层架构设计，自下而上分别为：

- **数据库层**：包含 Milvus 向量数据库和 MySQL 数据库（预留）
- **服务实现层**：基于 CLIP 和 Milvus 的图文匹配服务，以及基于用户反馈的 LTR 重排序服务（预留）
- **融合协调层**：将多个排序方案组织起来的编排器
- **API 层**：对外暴露的 RESTful API 接口

## 主要特性

- ✅ **图文语义匹配**：基于 OpenCLIP 模型的跨模态检索
- ✅ **向量数据库**：使用 Milvus 进行高效向量存储和检索
- ✅ **SVG 图片支持**：专门优化的 SVG 图片处理流程
- ✅ **批量操作**：支持批量添加和处理图片
- ✅ **分层架构**：清晰的模块化设计，易于扩展和维护
- ✅ **配置管理**：支持多环境配置（开发/测试/生产）
- ✅ **健康检查**：完整的服务健康监控
- 🚧 **LTR 重排序**：基于用户反馈的学习排序（规划中）
- 🚧 **MySQL 集成**：用户行为数据存储（规划中）

## 技术栈

- **Web 框架**：Flask
- **深度学习**：PyTorch + OpenCLIP
- **向量数据库**：Milvus
- **图像处理**：Pillow + CairoSVG
- **配置管理**：基于 dataclass 的分环境配置

## 架构设计

```
┌─────────────────┐
│     API层       │  ← 对外接口服务
├─────────────────┤
│   融合协调层     │  ← 排序方案编排
├─────────────────┤
│   服务实现层     │  ← 图文匹配 + 重排序
├─────────────────┤
│    数据库层     │  ← Milvus + MySQL
└─────────────────┘
```

## 快速开始

### 1. 环境准备

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 2. 启动 Milvus

使用 Docker 启动 Milvus 向量数据库：

```bash
# 使用 docker-compose（推荐）
cd resource/vector_db
docker-compose up -d

# 或使用单容器
docker run -d --name milvus-standalone \
  -p 19530:19530 -p 9091:9091 \
  milvusdb/milvus:latest
```

### 3. 配置环境变量（可选）

创建 `.env` 文件：

```env
# Flask 配置
FLASK_ENV=development
SECRET_KEY=your-secret-key

# CLIP 模型配置
CLIP_MODEL_NAME=ViT-B-32
CLIP_PRETRAINED=laion2b_s34b_b79k

# Milvus 配置
MILVUS_HOST=localhost
MILVUS_PORT=19530
MILVUS_COLLECTION_NAME=spx_vector_collection
MILVUS_DIMENSION=512

# 重排序配置
ENABLE_RERANKING=false
LTR_MODEL_PATH=
```

### 4. 启动服务

```bash
# 开发环境
python app.py

# 生产环境
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

服务将在 `http://localhost:5000` 启动。

## API 文档

### 基础接口

#### 服务信息
```http
GET /
```

#### 健康检查
```http
GET /api/health
GET /api/vector/health
```

### 图像搜索

#### 语义搜索（推荐使用）
```http
POST /api/search/resource
Content-Type: application/json

{
  "text": "dog running in park",
  "top_k": 10,
  "threshold": 0.3
}
```

### 向量数据库操作

#### 添加图片
```http
POST /api/vector/add
Content-Type: application/json

{
  "id": 123,
  "url": "https://example.com/image.svg",
  "svg_content": "<svg>...</svg>"  // 可选
}
```

#### 批量添加
```http
POST /api/vector/batch/add
Content-Type: application/json

{
  "images": [
    {
      "id": 1, 
      "url": "https://example.com/1.svg",
      "svg_content": "<svg>...</svg>"  // 可选
    },
    {"id": 2, "url": "https://example.com/2.svg"}
  ]
}
```

#### 向量搜索
```http
POST /api/vector/search
Content-Type: application/json

{
  "text": "butterfly",
  "k": 5
}
```

#### 获取统计信息
```http
GET /api/vector/stats
```

#### 获取所有数据
```http
GET /api/vector/data?include_vectors=false&limit=20&offset=0
```

#### 删除图片
```http
DELETE /api/vector/delete
Content-Type: application/json

{
  "id": 123
}
```

## 项目结构

```
spx-algorithm/
├── database/                    # 数据库层
│   ├── milvus/                 # Milvus向量数据库
│   │   ├── connection.py       # 连接管理
│   │   ├── operations.py       # 基础CRUD操作
│   │   └── config.py          # 配置类
│   └── mysql/                  # MySQL数据库（预留）
├── services/                   # 服务实现层
│   ├── image_matching/         # 图文匹配服务
│   │   ├── clip_service.py     # CLIP模型服务
│   │   ├── vector_service.py   # 向量化服务
│   │   └── matching_service.py # 匹配业务逻辑
│   └── reranking/              # LTR重排序服务（预留）
├── orchestrator/               # 融合协调层
│   ├── ranking_orchestrator.py # 排序方案编排器
│   └── pipeline_service.py     # 搜索管道服务
├── api/                        # API层
│   ├── routes/                 # 路由
│   │   ├── search_routes.py    # 搜索相关路由
│   │   ├── vector_routes.py    # 向量数据库路由
│   │   └── health_routes.py    # 健康检查路由
│   ├── schemas/                # 请求/响应模式
│   └── middlewares/            # 中间件
├── config/                     # 配置管理
│   ├── base.py                # 基础配置
│   ├── development.py         # 开发环境配置
│   ├── production.py          # 生产环境配置
│   └── testing.py             # 测试环境配置
├── common/                     # 公共组件
├── tests/                      # 测试
├── docs/                       # 文档
├── app.py                      # 主应用入口
└── requirements.txt            # 依赖文件
```

## 配置说明

### 环境配置

项目支持三种环境配置：
- `development`：开发环境（默认）
- `production`：生产环境
- `testing`：测试环境

通过 `FLASK_ENV` 环境变量指定：
```bash
export FLASK_ENV=production
```

### 关键配置项

| 配置项 | 描述 | 默认值 |
|-------|------|--------|
| `CLIP_MODEL_NAME` | CLIP 模型名称 | `ViT-B-32` |
| `CLIP_PRETRAINED` | 预训练权重 | `laion2b_s34b_b79k` |
| `MILVUS_HOST` | Milvus 服务器地址 | `localhost` |
| `MILVUS_PORT` | Milvus 服务器端口 | `19530` |
| `MILVUS_COLLECTION_NAME` | 集合名称 | `spx_vector_collection` |
| `MILVUS_DIMENSION` | 向量维度 | `512` |
| `ENABLE_RERANKING` | 是否启用重排序 | `false` |

## 开发指南

### 添加新功能

1. **数据库层**：在 `database/` 目录下扩展数据访问逻辑
2. **服务层**：在 `services/` 目录下实现业务逻辑
3. **编排层**：在 `orchestrator/` 目录下协调多个服务
4. **API层**：在 `api/routes/` 目录下添加新的路由

### 架构原则

- **单一职责**：每个模块只负责特定功能
- **依赖注入**：通过构造函数传递依赖
- **接口隔离**：定义清晰的接口边界
- **配置分离**：配置与代码分离

### 测试

```bash
# 运行所有测试
python -m pytest tests/

# 运行特定测试
python -m pytest tests/test_api.py

# 生成覆盖率报告
python -m pytest --cov=. tests/
```

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t spx-algorithm .

# 运行容器
docker run -d -p 5000:5000 \
  -e MILVUS_HOST=your-milvus-host \
  spx-algorithm
```

### 生产部署

推荐使用 Gunicorn + Nginx 部署：

```bash
# 启动 Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 \
  --access-logfile - \
  --error-logfile - \
  "app:create_app()"
```

## 性能指标

- **搜索延迟**：< 100ms（向量搜索）
- **批量处理**：支持单次最多 1000 张图片
- **并发支持**：支持多用户同时访问
- **存储容量**：支持百万级图片向量

## 故障排除

### 常见问题

1. **Milvus 连接失败**
   - 检查 Milvus 服务是否启动
   - 确认网络连接和端口配置

2. **CLIP 模型加载慢**
   - 首次运行会下载模型，请耐心等待
   - 考虑使用本地模型文件

3. **SVG 处理失败**
   - 确保安装了 CairoSVG：`pip install cairosvg`
   - 在 Windows 上可能需要额外的系统依赖
