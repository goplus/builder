# 图像向量数据库

基于open-clip的图像向量化和相似度搜索系统，复用了现有的图像向量化方式。

## 功能特性

- **图像向量化**: 使用open-clip模型将图像编码为高维向量
- **高效搜索**: 基于Faiss的向量相似度搜索
- **文本搜索**: 支持通过文本描述搜索相关图像
- **批量处理**: 支持批量添加和索引图像
- **元数据管理**: 保存图像文件信息和自定义元数据
- **重复检测**: 自动检测相似或重复的图像

## 核心组件

### 1. VectorDatabase 类
- 核心向量数据库实现
- 图像编码和向量存储
- 相似度搜索功能

### 2. VectorDBManager 类
- 高级管理接口
- 目录批量索引
- 重复图片检测
- 元数据导出

## 安装依赖

```bash
pip install -r requirements_vector_db.txt
```

主要依赖:
- torch: 深度学习框架
- open-clip-torch: CLIP模型
- faiss-cpu/faiss-gpu: 向量搜索引擎
- Pillow: 图像处理
- numpy: 数值计算

## 快速开始

### 基本使用

```python
from vector_database import VectorDatabase

# 初始化数据库
db = VectorDatabase(db_path='my_vector_db')

# 添加单张图片
image_id = db.add_image('path/to/image.jpg', 
                       metadata={'category': 'animals', 'tags': ['cute', 'dog']})

# 文本搜索
results = db.search_by_text('cute dog', k=5)
for result in results:
    print(f"{result['image_path']}: {result['similarity']:.3f}")

# 图片相似搜索
similar = db.search_by_image('query_image.jpg', k=5)
```

### 使用管理工具

```python
from vector_db_utils import VectorDBManager

# 创建管理器
manager = VectorDBManager(db_path='my_vector_db')

# 索引整个目录
stats = manager.index_directory('images_folder/')
print(f"索引了 {stats['indexed']} 张图片")

# 搜索
results = manager.search_by_description('beautiful landscape', k=10)
```

### 运行演示

```bash
python demo_vector_db.py
```

## 技术实现

### 向量化方法
- 使用ViT-B-32模型(默认)提取图像特征
- 特征向量维度: 512
- L2归一化处理
- 支持本地文件和网络URL

### 存储结构
```
vector_db/
├── index.faiss      # Faiss向量索引文件
└── metadata.pkl     # 图像元数据和配置
```

### 相似度计算
- 使用内积(Inner Product)计算向量相似度
- Faiss IndexFlatIP索引类型
- 实时搜索，无需预计算

## API 参考

### VectorDatabase

#### 初始化
```python
VectorDatabase(
    model_name='ViT-B-32',           # CLIP模型名称
    pretrained='laion2b_s34b_b79k',  # 预训练权重
    db_path='vector_db',             # 数据库存储路径
    dimension=512                    # 向量维度
)
```

#### 主要方法
- `add_image(image_path, metadata)`: 添加单张图片
- `add_images_batch(image_paths, metadatas)`: 批量添加图片
- `search_by_text(query_text, k)`: 文本搜索
- `search_by_image(query_image_path, k)`: 图片搜索
- `get_stats()`: 获取数据库统计信息

### VectorDBManager

#### 高级功能
- `index_directory(directory_path)`: 索引目录
- `find_duplicates(similarity_threshold)`: 查找重复图片
- `export_metadata(output_file)`: 导出元数据

## 性能优化

### GPU加速
```python
# 自动检测并使用GPU
db = VectorDatabase()  # 自动使用CUDA如果可用
```

### 批量处理
```python
# 批量添加比逐个添加更高效
image_paths = ['img1.jpg', 'img2.jpg', ...]
db.add_images_batch(image_paths)
```

### 内存优化
- 模型加载后复用
- 向量计算使用float32精度
- 支持大规模图片集合

## 注意事项

1. **模型下载**: 首次运行会下载CLIP模型(约1GB)
2. **内存使用**: 大量图片需要足够内存存储向量
3. **删除限制**: Faiss不支持直接删除，需要重建索引
4. **文件路径**: 确保图片路径在添加后不会改变

## 扩展功能

### 自定义模型
```python
# 使用不同的CLIP模型
db = VectorDatabase(
    model_name='ViT-L-14',
    pretrained='openai'
)
```

### 高级搜索
```python
# 组合搜索结果
text_results = db.search_by_text('query', k=20)
image_results = db.search_by_image('query.jpg', k=20)
# 合并和排序结果...
```

## 故障排除

### 常见问题
1. **Faiss安装失败**: 尝试使用conda安装
2. **CUDA内存不足**: 减少批量大小或使用CPU
3. **图片加载失败**: 检查文件格式和路径

### 日志调试
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```