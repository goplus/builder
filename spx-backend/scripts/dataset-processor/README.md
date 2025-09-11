# SPX Backend Dataset Processor

这是一个专为SPX后端设计的游戏素材数据集处理工具，用于从GitHub的Awesome Game Datasets获取、清洗和导入游戏素材数据。

## 🎯 功能特点

- 🔍 **智能数据获取**: 从GitHub自动获取Awesome Game Datasets
- 🧹 **数据清洗**: 过滤出适合SPX平台的轻量化素材
- 🔄 **格式转换**: 转换为GameAsset模型格式
- 📊 **批量导入**: 高效导入MySQL数据库
- 📈 **质量报告**: 生成详细的处理报告

## 📁 文件结构

```
dataset-processor/
├── 1_fetch_datasets.py    # 步骤1: 获取数据集
├── 2_clean_data.py        # 步骤2: 清洗和筛选
├── 3_convert_format.py    # 步骤3: 格式转换
├── 4_import_to_db.py      # 步骤4: 导入数据库
├── run_pipeline.py        # 主执行脚本
├── config.json            # 配置文件
├── requirements.txt       # Python依赖
├── README.md              # 本文档
├── data/                  # 数据存储目录
│   ├── raw/              # 原始数据
│   └── cleaned/          # 清洗后数据
└── output/               # 输出文件
    ├── game_assets.json  # JSON格式数据
    ├── game_assets.sql   # SQL插入语句
    └── *.md              # 处理报告
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd scripts/dataset-processor
pip install -r requirements.txt
```

### 2. 配置设置

编辑 `config.json` 文件:

```json
{
  "github": {
    "token": "你的GitHub token (可选)",
    "awesome_datasets_repo": "leomauro/awesome-game-datasets",
    "rate_limit_delay": 1
  },
  "database": {
    "host": "localhost",
    "port": 3306,
    "username": "root",
    "password": "你的数据库密码",
    "database": "spx_backend",
    "table": "game_assets"
  }
}
```

### 3. 运行处理管道

```bash
# 运行主脚本，选择执行步骤
python run_pipeline.py

# 或者直接运行完整管道
python run_pipeline.py
# 然后选择选项 5 (运行完整管道)
```

## 📋 详细步骤

### 步骤1: 获取数据集 🔍

```bash
python 1_fetch_datasets.py
```

- 从GitHub获取Awesome Game Datasets仓库信息
- 解析README中的数据集链接
- 下载适合SPX平台的数据集
- 提取游戏素材名称

**输出**: `data/raw/raw_asset_data.json`

### 步骤2: 清洗数据 🧹

```bash
python 2_clean_data.py
```

- 基础名称清洗（去除特殊字符、HTML标签）
- SPX平台适配性检查
- 去除重复项和低质量数据
- 添加置信度评分和分类标签

**输出**: `data/cleaned/cleaned_assets.json`

### 步骤3: 格式转换 🔄

```bash
python 3_convert_format.py
```

- 转换为GameAsset模型格式
- 生成多种输出格式（JSON、SQL、CSV）
- 数据质量验证
- 生成转换报告

**输出**: 
- `output/game_assets.json` - 数据库导入用
- `output/game_assets.sql` - SQL插入语句
- `output/sample_game_assets.go` - Go代码样本

### 步骤4: 导入数据库 📊

```bash
python 4_import_to_db.py
```

- 连接MySQL数据库
- 创建/检查表结构
- 批量导入数据
- 创建优化索引
- 生成导入报告

**输出**: `output/import_report.md`

## ⚙️ 配置选项

### GitHub配置
- `token`: GitHub API token（可选，但推荐）
- `rate_limit_delay`: API请求间隔（秒）

### 数据过滤
- `spx_keywords`: SPX平台相关关键词
- `exclude_keywords`: 排除关键词
- `min_name_length`: 最小名称长度
- `max_name_length`: 最大名称长度

### 数据库配置
- 标准MySQL连接参数
- `table`: 目标表名

### 输出配置
- `batch_size`: 批量处理大小
- `max_assets`: 最大素材数量
- `formats`: 输出格式列表

## 🔧 故障排除

### 常见问题

1. **GitHub API限制**
   - 配置GitHub token以获得更高的API限制
   - 增加 `rate_limit_delay` 值

2. **数据库连接失败**
   - 检查MySQL服务是否运行
   - 验证数据库连接参数
   - 确保数据库存在

3. **数据质量问题**
   - 调整 `spx_keywords` 和 `exclude_keywords`
   - 修改置信度阈值
   - 检查数据清洗规则

4. **内存不足**
   - 减少 `max_assets` 数量
   - 降低 `batch_size`
   - 分批处理数据

### 日志查看

所有步骤都会输出详细的进度信息，包括：
- 📥 数据加载进度
- 🧹 清洗统计
- ✅ 成功/失败计数
- 📊 质量报告

## 📊 输出说明

### JSON格式 (`game_assets.json`)
```json
[
  {
    "id": 1,
    "name": "Pixel Hero Character",
    "created_at": "2025-01-09T12:00:00Z",
    "updated_at": "2025-01-09T12:00:00Z",
    "deleted_at": null
  }
]
```

### SQL格式 (`game_assets.sql`)
包含完整的表创建和数据插入语句，可直接在MySQL中执行。

### Go样本 (`sample_game_assets.go`)
包含前50个高质量素材的Go代码，可替换现有样本数据。

## 🔗 API集成

处理完成后，游戏素材数据将可通过SPX后端的自动补全API使用：

```
GET /game-assets/complete?prefix=pixel&limit=5
```

返回：
```json
{
  "suggestions": [
    "Pixel Hero Character",
    "Pixel Art Background",
    "Pixelated UI Button"
  ]
}
```

## 📈 性能优化

1. **数据库索引**: 自动创建名称前缀索引用于快速查询
2. **批量处理**: 使用批量插入提高导入效率
3. **内存管理**: 分批处理避免内存溢出
4. **API限制**: 智能速率限制避免被GitHub限制

## 🤝 贡献

如需改进或扩展功能，请：
1. 修改配置文件调整过滤规则
2. 添加新的数据源到步骤1
3. 改进数据清洗算法在步骤2
4. 扩展输出格式在步骤3

---

💡 **提示**: 首次运行建议使用快速模式（选项6），跳过数据获取步骤，使用现有的示例数据进行测试。