# 云端向量数据库

基于URL的云端图像向量数据库系统，专为SVG图片设计，提供简洁的增量写入和数据读取接口。

## 功能特点

- **云端图片处理**: 从URL直接下载和处理SVG图片
- **增量写入**: 支持按需添加图片到向量数据库
- **向量化存储**: 使用OpenCLIP将图片转换为512维向量
- **高效搜索**: 基于Faiss的向量相似度搜索
- **简化接口**: 仅提供两个核心接口，使用简单
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

## 快速开始

### 安装依赖

```bash
pip install torch open-clip-torch faiss-cpu cairosvg pillow requests numpy
```

### 基本使用

```python
from cloud_vector_database import CloudVectorDatabase

# 创建数据库实例
db = CloudVectorDatabase(db_path='my_vector_db')

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
```

## API接口使用

### 启动API服务器

```bash
python cloud_vector_api.py
```

服务器将在 `http://localhost:5001` 启动。

### API端点

#### 1. 健康检查
```
GET /api/vector/health
```

#### 2. 添加图片
```
POST /api/vector/add
Content-Type: application/json

{
  "id": 123,
  "url": "https://example.com/image.svg"
}
```

#### 3. 获取所有数据
```
GET /api/vector/data?include_vectors=false&limit=10&offset=0
```

参数：
- `include_vectors`: 是否包含向量数据 (默认false)
- `limit`: 限制返回数量
- `offset`: 偏移量

#### 4. 文本搜索
```
POST /api/vector/search
Content-Type: application/json

{
  "text": "dog",
  "k": 5
}
```

#### 5. 删除图片
```
DELETE /api/vector/delete
Content-Type: application/json

{
  "id": 123
}
```

#### 6. 批量添加
```
POST /api/vector/batch/add
Content-Type: application/json

{
  "images": [
    {"id": 1, "url": "https://example.com/image1.svg"},
    {"id": 2, "url": "https://example.com/image2.svg"}
  ]
}
```

### 使用示例

#### Python requests示例

```python
import requests

base_url = "http://localhost:5001/api/vector"

# 添加图片
response = requests.post(f"{base_url}/add", json={
    "id": 1,
    "url": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f436.svg"
})

if response.status_code == 200:
    print("添加成功:", response.json())

# 获取所有数据
response = requests.get(f"{base_url}/data")
if response.status_code == 200:
    data = response.json()
    print(f"共有 {data['total_count']} 条记录")

# 文本搜索
response = requests.post(f"{base_url}/search", json={
    "text": "dog",
    "k": 5
})

if response.status_code == 200:
    results = response.json()
    print(f"找到 {results['results_count']} 个结果")
```

#### curl示例

```bash
# 添加图片
curl -X POST http://localhost:5001/api/vector/add \
  -H "Content-Type: application/json" \
  -d '{"id": 1, "url": "https://example.com/image.svg"}'

# 获取所有数据
curl http://localhost:5001/api/vector/data

# 文本搜索
curl -X POST http://localhost:5001/api/vector/search \
  -H "Content-Type: application/json" \
  -d '{"text": "dog", "k": 5}'
```

## 数据存储格式

### 数据库文件结构
```
cloud_vector_db/
├── index.faiss           # Faiss向量索引
└── data_store.pkl        # 数据存储文件
```

### 存储的数据格式
```python
{
    'id': 123,                    # 用户指定的ID
    'url': 'https://...',         # SVG图片URL
    'vector': [0.1, 0.2, ...],    # 512维向量
    'faiss_index': 0,             # 在Faiss中的索引位置
    'added_at': '2025-08-27...',  # 添加时间
    'updated_at': '2025-08-27...' # 更新时间（如果有更新）
}
```

## 技术实现

### 向量化流程
1. **URL下载**: 从提供的URL下载SVG文件
2. **SVG转换**: 使用CairoSVG将SVG转换为224x224的PNG图片
3. **图像编码**: 使用OpenCLIP ViT-B-32模型提取512维特征向量
4. **向量存储**: 将向量添加到Faiss索引中
5. **元数据保存**: 保存ID、URL和向量数据

### 模型配置
- **CLIP模型**: ViT-B-32
- **预训练权重**: laion2b_s34b_b79k
- **向量维度**: 512
- **Faiss索引类型**: IndexFlatIP (内积相似度)

### 支持的URL格式
- 直接SVG文件URL (如: `https://example.com/image.svg`)
- 支持常见的HTTP headers
- 自动检测SVG内容类型
- 超时设置: 30秒

## 运行演示

### 基本演示
```bash
python demo_cloud_vector.py
```

### 选择演示模式
```bash
python demo_cloud_vector.py direct    # 直接使用数据库类
python demo_cloud_vector.py api       # API接口演示
python demo_cloud_vector.py examples  # 显示使用示例
```

## 性能特性

### 优化特点
- **模型复用**: 启动时加载一次CLIP模型
- **批量处理**: 支持批量添加图片
- **向量缓存**: 向量数据持久化存储
- **增量更新**: 支持ID相同时更新记录

### 注意事项
1. **网络依赖**: 需要能够访问图片URL
2. **SVG依赖**: 需要安装cairosvg库
3. **内存使用**: 向量数据会占用内存
4. **删除限制**: Faiss删除需要重建索引
5. **并发限制**: 不支持多进程并发写入

## 扩展功能

除了两个核心接口外，还提供了以下扩展功能：

- **文本搜索**: 根据文本描述搜索相似图片
- **统计信息**: 获取数据库状态和统计信息
- **记录删除**: 根据ID删除图片记录
- **批量操作**: 一次添加多个图片

## 错误处理

### 常见错误和解决方案

1. **URL无法访问**
   - 检查网络连接
   - 验证URL有效性
   - 检查防火墙设置

2. **SVG转换失败**
   - 确保安装cairosvg: `pip install cairosvg`
   - 检查SVG文件格式

3. **模型加载失败**
   - 检查网络连接（首次需要下载模型）
   - 确保有足够存储空间

4. **内存不足**
   - 使用CPU模式
   - 减少批量处理大小

## 使用建议

1. **URL管理**: 确保图片URL的长期可访问性
2. **ID规划**: 使用有意义的ID编号系统
3. **定期备份**: 定期备份vector_db目录
4. **监控日志**: 关注错误日志以便及时处理问题
5. **性能测试**: 根据使用场景进行性能测试和优化

## 总结

这个云端向量数据库专门为处理SVG图片设计，提供了简洁而强大的接口。通过URL直接处理云端图片，避免了本地文件管理的复杂性，非常适合需要处理大量云端SVG资源的应用场景。