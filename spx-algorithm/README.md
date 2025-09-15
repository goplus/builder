# SPX Algorithm - 图像搜索推荐模块

重构后的 SPX 算法推荐模块，提供基于资源管理的智能图像搜索服务。

## 项目概述

本项目是一个独立的算法推荐模块，采用清晰的分层架构设计，自下而上分别为：

- **数据库层**：底层数据存储和索引
- **服务实现层**：图文语义匹配和重排序服务
- **融合协调层**：将多个排序方案组织起来的协调器
- **API 层**：对外暴露基于资源管理的 RESTful API 接口

## 主要特性

- ✅ **智能图像搜索**：基于语义理解的图像检索
- ✅ **资源管理**：统一的资源添加、查询、删除接口
- ✅ **SVG 图片支持**：专门优化的 SVG 图片处理流程
- ✅ **批量操作**：支持批量添加和处理资源
- ✅ **分层架构**：清晰的模块化设计，易于扩展和维护
- ✅ **配置管理**：支持多环境配置（开发/测试/生产）
- ✅ **健康检查**：完整的服务健康监控
- ✅ **内部调试API**：专门用于系统调试和维护的内部接口
- ✅ **LTR 重排序**：基于用户反馈的学习排序

## 技术栈

- **Web 框架**：Flask
- **深度学习**：PyTorch + OpenCLIP
- **数据存储**：高效的向量存储和检索系统
- **图像处理**：Pillow + CairoSVG
- **配置管理**：基于 dataclass 的分环境配置

## 架构设计

```
┌─────────────────┐
│     API层       │  ← 资源管理接口 + 内部调试接口
├─────────────────┤
│   融合协调层     │  ← 排序方案编排
├─────────────────┤
│   服务实现层     │  ← 图文匹配 + 重排序
├─────────────────┤
│    数据库层     │  ← 高效数据存储
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

### 2. 启动数据存储服务

启动底层数据存储服务：

```bash
# 启动向量数据库服务
cd resource/vector_db
docker-compose up -d

# 启动用户反馈数据库服务（MySQL）
cd resource/feedback_db
docker-compose up -d

# 确保所有数据存储服务正常运行
```

### 3. 配置环境变量（可选）

创建 `.env` 文件：

```env
# Flask 配置
SECRET_KEY=your-secret-key

# CLIP 模型配置
CLIP_MODEL_NAME=ViT-B-32
CLIP_PRETRAINED=laion2b_s34b_b79k

# Milvus 向量数据库配置
MILVUS_HOST=localhost
MILVUS_PORT=19530
MILVUS_COLLECTION_NAME=spx_vector_collection
MILVUS_DIMENSION=512

# 重排序配置
ENABLE_RERANKING=true
LTR_MODEL_PATH=models/ltr_model.pkl

# 用户反馈数据库配置
MYSQL_HOST=localhost
MYSQL_PORT=3307
MYSQL_USER=spx_user
MYSQL_PASSWORD=spx_feedback_2024
MYSQL_DATABASE=spx_feedback

# LTR 模型训练配置
LTR_TRAINING_BATCH_SIZE=1000
LTR_MODEL_AUTO_RETRAIN=false
LTR_COARSE_MULTIPLIER=3
LTR_MAX_CANDIDATES=100
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
GET /v1/health
```

### 资源管理

#### 添加单个资源
```http
POST /v1/resource/add
Content-Type: application/json

{
  "id": 123,
  "url": "https://example.com/image.svg",
  "svg_content": "<svg>...</svg>"  // 可选
}
```

#### 批量添加资源
```http
POST /v1/resource/batch
Content-Type: application/json

{
  "resources": [
    {
      "id": 1, 
      "url": "https://example.com/1.svg",
      "svg_content": "<svg>...</svg>"  // 可选
    },
    {"id": 2, "url": "https://example.com/2.svg"}
  ]
}
```

#### 搜索资源
```http
POST /v1/resource/search
Content-Type: application/json

{
  "text": "dog running in park",
  "top_k": 10,
  "threshold": 0.3
}
```

### 用户反馈和模型训练

#### 提交用户反馈
```http
POST /v1/feedback/submit
Content-Type: application/json

{
  "query_id": 123,
  "query": "dog running in park",
  "recommended_pics": [1001, 1002, 1003, 1004],
  "chosen_pic": 1002
}
```

#### 获取反馈统计信息
```http
GET /v1/feedback/stats
```

#### 获取最近的反馈数据
```http
GET /v1/feedback/recent?limit=10
```

#### 训练LTR模型
```http
POST /v1/feedback/train
Content-Type: application/json

{
  "limit": 1000  // 可选，限制使用的反馈数据量
}
```

#### 获取模型状态
```http
GET /v1/feedback/model/status
```

#### 启用/禁用重排序功能
```http
POST /v1/feedback/model/enable   # 启用重排序
POST /v1/feedback/model/disable  # 禁用重排序
```

### 内部调试和管理接口（仅用于系统维护）

这些接口仅供系统管理员和开发人员调试使用，生产环境建议限制访问权限：

#### 系统状态和调试
```http
GET /v1/internal/health                    # 内部健康检查
GET /v1/internal/vectors?include_vectors=true&limit=10  # 获取向量数据
POST /v1/internal/vectors/search           # 向量搜索调试
GET /v1/internal/database/stats            # 详细数据库统计
GET /v1/internal/vectors/{id}              # 获取特定资源向量
```

#### 资源管理（内部）
```http
GET /v1/internal/resources?limit=20&offset=0    # 获取资源列表
DELETE /v1/internal/resources/{id}              # 删除资源
POST /v1/internal/resources/search              # 内部资源搜索
GET /v1/internal/resources/stats                # 详细资源统计
```

## 项目结构

```
spx-algorithm/
├── database/                    # 数据库层
│   ├── milvus/                 # Milvus向量数据库
│   │   ├── connection.py       # 连接管理
│   │   ├── operations.py       # 基础CRUD操作
│   │   └── config.py          # 配置类
│   ├── user_feedback/          # 用户反馈数据库
│   │   ├── models.py          # 反馈数据模型
│   │   └── feedback_storage.py # 反馈数据存储
│   └── mysql/                  # MySQL数据库（预留）
├── services/                   # 服务实现层
│   ├── image_matching/         # 图文匹配服务
│   │   ├── clip_service.py     # CLIP模型服务
│   │   ├── vector_service.py   # 向量化服务
│   │   └── matching_service.py # 匹配业务逻辑
│   └── reranking/              # LTR重排序服务
│       ├── rerank_service.py   # 重排序服务主逻辑
│       ├── ltr_trainer.py      # LTR模型训练器
│       └── feature_extractor.py # 特征提取器
├── coordinator/                # 融合协调层
│   └── search_coordinator.py    # 搜索协调器
├── api/                        # API层
│   ├── routes/                 # 路由
│   │   ├── resource_routes.py  # 资源管理路由（添加、搜索）
│   │   ├── feedback_routes.py  # 用户反馈路由
│   │   ├── internal_routes.py  # 内部调试路由
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
| `SECRET_KEY` | Flask 密钥 | `spx-algorithm-secret-key` |
| `CLIP_MODEL_NAME` | CLIP 模型名称 | `ViT-B-32` |
| `CLIP_PRETRAINED` | 预训练权重 | `laion2b_s34b_b79k` |
| `MILVUS_HOST` | Milvus 服务器地址 | `localhost` |
| `MILVUS_PORT` | Milvus 服务器端口 | `19530` |
| `MILVUS_COLLECTION_NAME` | 向量集合名称 | `spx_vector_collection` |
| `MILVUS_DIMENSION` | 向量维度 | `512` |
| `ENABLE_RERANKING` | 是否启用重排序 | `true` |
| `LTR_MODEL_PATH` | LTR模型路径 | `models/ltr_model.pkl` |
| `MYSQL_HOST` | MySQL 数据库地址 | `localhost` |
| `MYSQL_PORT` | MySQL 数据库端口 | `3307` |
| `MYSQL_USER` | MySQL 数据库用户 | `spx_user` |
| `MYSQL_PASSWORD` | MySQL 数据库密码 | `spx_feedback_2024` |
| `MYSQL_DATABASE` | MySQL 数据库名称 | `spx_feedback` |
| `LTR_TRAINING_BATCH_SIZE` | LTR训练批次大小 | `1000` |
| `LTR_MODEL_AUTO_RETRAIN` | 是否自动重训练 | `false` |
| `LTR_COARSE_MULTIPLIER` | 粗排数量倍数 | `3` |
| `LTR_MAX_CANDIDATES` | 粗排最大候选数 | `100` |

## 开发指南

### 添加新功能

1. **数据库层**：在 `database/` 目录下扩展数据访问逻辑
2. **服务层**：在 `services/` 目录下实现业务逻辑
3. **协调层**：在 `coordinator/` 目录下协调多个服务
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

- **搜索延迟**：< 100ms（语义搜索）
- **批量处理**：支持单次最多 1000 个资源
- **并发支持**：支持多用户同时访问
- **存储容量**：支持百万级资源

## 接口设计说明

本模块专注于算法服务的核心功能，采用了统一的资源导向API设计：

### 对外接口（`/v1/resource/`）
- **添加资源**：`POST /v1/resource/add` - 添加单个资源
- **批量添加**：`POST /v1/resource/batch` - 批量添加资源
- **搜索资源**：`POST /v1/resource/search` - 基于语义的资源搜索

### 内部接口（`/v1/internal/`）
- **系统调试**：向量数据查看、详细搜索调试
- **资源管理**：列表查询、删除、统计等管理功能
- **数据库维护**：底层数据库状态和配置信息

### 用户反馈和学习接口（`/v1/feedback/`）
- **反馈收集**：基于用户行为的模型训练数据收集
- **模型训练**：使用用户反馈数据自动优化搜索结果排序
- **智能重排序**：基于训练好的模型对搜索结果进行个性化重排序

### 设计原则
- **统一性**：所有资源相关操作都在 `/v1/resource/` 下，避免接口分散
- **简洁性**：对外只暴露核心的添加和搜索功能，隐藏复杂的管理操作
- **职责分离**：业务功能与调试维护功能严格分离
- **用户驱动**：通过用户反馈持续优化搜索体验

## 故障排除

### 常见问题

1. **数据存储服务连接失败**
   - 检查底层存储服务是否启动
   - 确认网络连接和端口配置

2. **CLIP 模型加载慢**
   - 首次运行会下载模型，请耐心等待
   - 考虑使用本地模型文件

3. **SVG 处理失败**
   - 确保安装了 CairoSVG：`pip install cairosvg`
   - 在 Windows 上可能需要额外的系统依赖

4. **内部调试接口访问**
   - 内部调试接口仅供开发和维护使用
   - 生产环境建议限制这些接口的访问权限
