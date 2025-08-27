# Milvus向量数据库

基于Milvus的云端图像向量数据库系统，专为SVG图片设计，提供与Faiss版本完全一致的API接口，同时具备分布式存储和高并发处理能力。

## 功能特点

- **分布式架构**: 基于Milvus的分布式向量数据库
- **云端图片处理**: 从URL直接下载和处理SVG图片
- **增量写入**: 支持按需添加图片到向量数据库
- **向量化存储**: 使用OpenCLIP将图片转换为512维向量
- **高效搜索**: 基于Milvus的IVF_FLAT索引，内积相似度搜索
- **API兼容**: 与Faiss版本接口完全一致，便于迁移
- **RESTful API**: 提供完整的HTTP API接口

## 核心接口

### 1. 增量写入接口
```python
def add_image_by_url(self, id: int, url: str) -> bool
```
- **功能**: 根据URL下载SVG图片并添加到向量数据库
- **参数**: 
  - `id`: 图片唯一标识ID
  - `url`: SVG图片的云端URL
- **返回**: 是否成功添加

### 2. 读取所有数据接口
```python
def get_all_data(self) -> List[Dict[str, Any]]
```
- **功能**: 返回数据库中的所有图片信息
- **返回**: 包含id、url和向量数据的记录列表

### 3. 文本搜索接口
```python
def search_by_text(self, query_text: str, k: int = 10) -> List[Dict[str, Any]]
```
- **功能**: 通过文本搜索相似图片
- **返回**: 相似图片列表，按相似度排序

### 4. 统计信息接口
```python
def get_database_stats(self) -> Dict[str, Any]
```
- **功能**: 获取数据库统计信息
- **返回**: 包含记录数量、模型信息等统计数据

### 5. 删除接口
```python
def remove_by_id(self, id: int) -> bool
```
- **功能**: 根据ID删除图片记录
- **返回**: 是否删除成功

## 环境要求

### Milvus服务部署

#### Docker Compose方式（推荐，已验证可用）

**1. 创建docker-compose.yml文件：**
```yaml
version: '3.5'

services:
  etcd:
    container_name: milvus-etcd
    image: quay.io/coreos/etcd:v3.5.5
    environment:
      - ETCD_AUTO_COMPACTION_MODE=revision
      - ETCD_AUTO_COMPACTION_RETENTION=1000
      - ETCD_QUOTA_BACKEND_BYTES=4294967296
      - ETCD_SNAPSHOT_COUNT=50000
    volumes:
      - etcd:/etcd
    command: etcd -advertise-client-urls=http://127.0.0.1:2379 -listen-client-urls http://0.0.0.0:2379 --data-dir /etcd
    healthcheck:
      test: ["CMD", "etcdctl", "endpoint", "health"]
      interval: 30s
      timeout: 20s
      retries: 3

  minio:
    container_name: milvus-minio
    image: minio/minio:RELEASE.2023-03-20T20-16-18Z
    environment:
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    ports:
      - "9001:9001"
      - "9000:9000"
    volumes:
      - minio:/minio_data
    command: minio server /minio_data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  standalone:
    container_name: milvus-standalone
    image: milvusdb/milvus:v2.3.0
    command: ["milvus", "run", "standalone"]
    security_opt:
    - seccomp:unconfined
    environment:
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
    volumes:
      - milvus:/var/lib/milvus
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9091/healthz"]
      interval: 30s
      start_period: 90s
      timeout: 20s
      retries: 3
    ports:
      - "19530:19530"
      - "9091:9091"
    depends_on:
      - "etcd"
      - "minio"

volumes:
  etcd:
    driver: local
  minio:
    driver: local
  milvus:
    driver: local
```

**2. 启动和管理服务：**
```bash
# 启动所有服务
docker-compose up -d

# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs -f milvus-standalone

# 停止服务
docker-compose down

# 完全清理（删除数据）
docker-compose down -v
```

#### 官方快速启动脚本
```bash
# 下载官方启动脚本
curl -sfL https://raw.githubusercontent.com/milvus-io/milvus/v2.3.0/scripts/standalone_embed.sh -o standalone_embed.sh

# 给执行权限
chmod +x standalone_embed.sh

# 启动
./standalone_embed.sh start

# 停止
./standalone_embed.sh stop
```

#### 验证Milvus服务启动成功

**1. 检查容器状态：**
```bash
# 查看所有容器状态
docker-compose ps

# 应该看到类似输出：
# milvus-etcd         Up (health: starting)
# milvus-minio        Up (health: starting) 
# milvus-standalone   Up (healthy)
```

**2. 测试连接：**
```bash
# 检查端口是否开放
lsof -i :19530

# Milvus健康检查
curl http://localhost:9091/healthz
# 应该返回: OK

# Python连接测试
python3 -c "from pymilvus import connections; connections.connect('default', host='localhost', port='19530'); print('Milvus连接成功!')"
```

**3. 管理界面：**
- **MinIO控制台**: http://localhost:9001
  - 用户名：minioadmin
  - 密码：minioadmin
- **Milvus健康检查**: http://localhost:9091/healthz

#### 常见问题排查

**1. 容器启动失败：**
```bash
# 查看详细日志
docker-compose logs milvus-standalone

# 强制清理重新启动
docker-compose down -v
docker system prune -f
docker-compose up -d
```

**2. 端口冲突：**
```bash
# 检查端口占用
lsof -i :19530
lsof -i :9091

# 如有冲突，可修改docker-compose.yml中的端口映射
```

**3. 权限问题：**
```bash
# 确保Docker有足够权限
sudo chown -R $(id -u):$(id -g) /tmp/milvus
```

### 安装依赖

```bash
pip install -r requirements_milvus.txt
```

依赖包括：
- torch>=1.9.0
- open-clip-torch
- pymilvus>=2.3.0
- cairosvg>=2.5.0
- pillow>=8.0.0
- requests>=2.25.0
- flask>=2.0.0

## 快速开始

### 🚀 5分钟快速启动

**1. 启动Milvus服务**
```bash
# 使用提供的docker-compose配置
docker-compose up -d

# 等待服务启动完成（约1-2分钟）
docker-compose ps
```

**2. 验证服务运行**
```bash
# 健康检查
curl http://localhost:9091/healthz
# 应该返回: OK
```

**3. 启动API服务并测试**
```bash
# 启动Milvus API服务
python3 milvus_vector_api.py &

# 运行演示
echo "2" | python3 demo_milvus_vector.py
```

### 基本使用

```python
from milvus_vector_database import MilvusVectorDatabase

# 创建数据库实例
db = MilvusVectorDatabase(
    collection_name='my_vector_collection',
    host='localhost',
    port='19530'
)

# 增量写入 - 添加图片
success = db.add_image_by_url(1, 'https://example.com/dog.svg')
if success:
    print("图片添加成功")

success = db.add_image_by_url(2, 'https://example.com/cat.svg')

# 读取所有数据
all_data = db.get_all_data()
print(f"数据库中共有 {len(all_data)} 条记录")

for data in all_data:
    print(f"ID: {data['id']}, URL: {data['url']}")
    print(f"向量维度: {len(data['vector'])}")

# 文本搜索
results = db.search_by_text('dog', k=5)
for result in results:
    print(f"ID: {result['id']}, 相似度: {result['similarity']:.4f}")

# 关闭连接
db.close_connection()
```

## API接口使用

### 启动API服务器

```bash
python milvus_vector_api.py
```

服务器将在 `http://localhost:5002` 启动。

### API端点

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/api/milvus/health` | 健康检查 |
| GET | `/api/milvus/stats` | 获取统计信息 |
| POST | `/api/milvus/add` | 添加单个图片 |
| GET | `/api/milvus/data` | 获取所有数据 |
| POST | `/api/milvus/search` | 文本搜索 |
| DELETE | `/api/milvus/delete` | 删除图片 |
| POST | `/api/milvus/batch/add` | 批量添加图片 |
| GET | `/api/milvus/collection/info` | 获取集合信息 |

### 使用示例

#### 添加图片
```bash
curl -X POST http://localhost:5002/api/milvus/add \
  -H "Content-Type: application/json" \
  -d '{"id": 1, "url": "https://example.com/image.svg"}'
```

#### 获取所有数据
```bash
curl http://localhost:5002/api/milvus/data?include_vectors=false&limit=10
```

#### 文本搜索
```bash
curl -X POST http://localhost:5002/api/milvus/search \
  -H "Content-Type: application/json" \
  -d '{"text": "dog", "k": 5}'
```

#### 获取集合信息（Milvus特有）
```bash
curl http://localhost:5002/api/milvus/collection/info
```

## 数据存储格式

### Milvus集合Schema
```python
fields = [
    {"name": "id", "type": "INT64", "is_primary": True},
    {"name": "url", "type": "VARCHAR", "max_length": 2000},
    {"name": "vector", "type": "FLOAT_VECTOR", "dimension": 512},
    {"name": "added_at", "type": "VARCHAR", "max_length": 50},
    {"name": "updated_at", "type": "VARCHAR", "max_length": 50}
]
```

### 索引配置
```python
index_params = {
    "metric_type": "IP",        # 内积相似度（与Faiss一致）
    "index_type": "IVF_FLAT",   # IVF_FLAT索引
    "params": {"nlist": 1024}   # 聚类中心数量
}
```

## 从Faiss迁移指南

### 1. 代码迁移

#### 替换导入
```python
# 原来（Faiss版本）
from cloud_vector_database import CloudVectorDatabase

# 现在（Milvus版本）
from milvus_vector_database import MilvusVectorDatabase
```

#### 修改初始化
```python
# 原来（Faiss版本）
db = CloudVectorDatabase(db_path='cloud_vector_db')

# 现在（Milvus版本）
db = MilvusVectorDatabase(
    collection_name='cloud_vector_collection',
    host='localhost',
    port='19530'
)
```

#### API调用保持不变
```python
# 以下接口调用方式完全一致，无需修改
success = db.add_image_by_url(id, url)
all_data = db.get_all_data()
results = db.search_by_text(query, k)
stats = db.get_database_stats()
success = db.remove_by_id(id)
```

### 2. 配置对比

| 特性 | Faiss版本 | Milvus版本 |
|------|-----------|------------|
| 存储方式 | 本地文件 | 分布式数据库 |
| 扩展性 | 单机限制 | 水平扩展 |
| 并发能力 | 有限 | 高并发 |
| 数据持久化 | 文件系统 | 数据库级别 |
| 高可用 | 无 | 支持 |
| 部署复杂度 | 简单 | 中等 |

### 3. 性能优势

#### Milvus相比Faiss的优势：
- **分布式架构**: 支持数据分片和负载均衡
- **更高并发**: 支持多客户端同时访问
- **数据一致性**: ACID事务保证
- **动态扩展**: 在线增加节点
- **监控管理**: 丰富的管理工具和监控指标

#### 适用场景：
- **大规模数据**: >1000万向量
- **高并发访问**: 多客户端同时使用
- **生产环境**: 需要高可用和数据安全
- **团队协作**: 多人共享同一数据库

### 4. 迁移步骤

1. **环境准备**
   - 部署Milvus服务
   - 安装pymilvus依赖
   - 测试连接

2. **数据迁移**
   - 使用Faiss版本导出数据：`get_all_data()`
   - 使用Milvus版本导入数据：`add_image_by_url()`
   - 验证数据完整性

3. **应用更新**
   - 更新数据库类导入
   - 修改初始化参数
   - 测试API功能

4. **上线切换**
   - 并行运行测试
   - 切换流量
   - 监控性能

## 运行演示

### 前提条件
确保Milvus服务已启动：
```bash
# 检查服务状态
docker-compose ps

# 验证连接
curl http://localhost:9091/healthz
```

### 启动API服务
```bash
# 启动Milvus向量数据库API服务
python3 milvus_vector_api.py

# 服务将在 http://localhost:5002 启动
```

### 运行演示程序
```bash
# 交互式演示
python3 demo_milvus_vector.py

# 选择模式2进行API接口演示
```

### 演示成功示例
当Milvus服务正常运行时，你将看到类似输出：

```
=== API接口使用演示 ===

1. 健康检查...
   API服务正常运行
   响应: {'service': 'milvus-vector-database-api', 'status': 'healthy'}

2. 获取统计信息...

3. 获取集合信息...

4. 测试添加图片...
   添加成功: ID=101
   添加成功: ID=102

5. 获取所有数据...
   总记录数: 2
   返回记录数: 2
     ID: 101, URL: https://raw.githubusercontent.com/twitter/twemoji/...
     ID: 102, URL: https://raw.githubusercontent.com/twitter/twemoji/...

6. 测试文本搜索...
   搜索 'dog' 的结果:
   找到 2 个结果
     ID: 101, 相似度: 0.3073
     ID: 102, 相似度: 0.2435

7. 测试批量添加...
   批量添加结果: 成功 2/2

8. 测试删除功能...

=== API接口演示完成 ===
```

### 直接使用命令行测试
```bash
# 健康检查
curl http://localhost:5002/api/milvus/health

# 添加图片
curl -X POST http://localhost:5002/api/milvus/add \
  -H "Content-Type: application/json" \
  -d '{"id": 123, "url": "https://example.com/image.svg"}'

# 文本搜索
curl -X POST http://localhost:5002/api/milvus/search \
  -H "Content-Type: application/json" \
  -d '{"text": "cat", "k": 5}'
```

## 技术架构

### 向量化流程
1. **URL下载**: 从提供的URL下载SVG文件
2. **SVG转换**: 使用CairoSVG将SVG转换为224x224的PNG图片
3. **图像编码**: 使用OpenCLIP ViT-B-32模型提取512维特征向量
4. **向量存储**: 将向量存储到Milvus集合中
5. **索引构建**: 自动构建IVF_FLAT索引

### 模型配置
- **CLIP模型**: ViT-B-32
- **预训练权重**: laion2b_s34b_b79k
- **向量维度**: 512
- **相似度度量**: 内积（IP）
- **索引类型**: IVF_FLAT

## 监控和维护

### 性能监控
```python
# 获取集合统计信息
stats = db.get_database_stats()
print(f"总记录数: {stats['total_images']}")

# 获取集合详细信息
collection_info = db.collection.describe()
print(f"集合信息: {collection_info}")
```

### 数据备份
Milvus提供多种备份方案：
- 数据文件备份
- 快照功能
- 集群间同步

### 性能调优
- 调整索引参数（nlist, nprobe）
- 设置合适的内存限制
- 配置负载均衡策略

## 故障排除

### 常见问题

1. **连接失败**
   - 检查Milvus服务是否启动
   - 验证host和port配置
   - 检查防火墙设置

2. **性能问题**
   - 调整索引参数
   - 增加内存配置
   - 考虑分布式部署

3. **数据一致性**
   - 使用flush()确保数据写入
   - 检查集合加载状态

### 日志配置
```python
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('milvus_vector_database')
```

## 总结

Milvus版本的向量数据库在保持与Faiss版本API完全兼容的基础上，提供了：

- ✅ **分布式存储**: 支持大规模数据和高并发
- ✅ **高可用性**: 数据安全和服务稳定性
- ✅ **易于扩展**: 水平扩展能力
- ✅ **生产就绪**: 企业级特性和监控工具
- ✅ **平滑迁移**: 最小化代码修改

适合需要处理大量SVG图片、高并发访问或生产环境部署的应用场景。