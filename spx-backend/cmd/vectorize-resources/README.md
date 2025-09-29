# Asset Vectorization Tool

用于将Asset表中的SVG资源向量化并存储到向量数据库的工具。

## 功能

- 批量处理Asset表中的SVG格式资源
- 从Kodo对象存储下载图片文件
- 调用算法服务生成向量数据
- 支持干跑模式测试
- 完整的进度跟踪和错误处理

## 使用方法

```bash
# 干跑模式 - 只显示会处理哪些资源，不实际向量化
./simple-run.sh -dry-run -verbose -batch=10

# 处理前100条记录
./simple-run.sh -verbose -batch=20 -end=100

# 处理指定范围的记录
./simple-run.sh -verbose -batch=50 -start=100 -end=200

# 处理所有SVG资源
./simple-run.sh -verbose -batch=50
```

## 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-batch` | 批处理大小 | 50 |
| `-start` | 起始ID | 0 |
| `-end` | 结束ID (0表示无限制) | 0 |
| `-dry-run` | 干跑模式，不实际向量化 | false |
| `-verbose` | 详细输出 | false |

## 环境要求

工具会自动从 `../../.env` 文件加载以下环境变量：

- `GOP_SPX_DSN` - 数据库连接字符串
- `ALGORITHM_ENDPOINT` - 算法服务端点
- `KODO_AK` / `KODO_SK` - Kodo访问凭证
- `KODO_BUCKET` / `KODO_BUCKET_REGION` - Kodo存储桶配置

## 输出示例

```
🚀 Asset Vectorization Tool
✅ Environment variables loaded:
📍 Database: root:root@tcp(xxx)...
📍 Algorithm: http://localhost:5000

🎯 Starting vectorization...
📊 Processing asset resources...
  Found 520 total assets to process
  [DRY RUN] Asset 1769: red-shirted man (found 4 images)
    - First image: kodo://goplus-builder-usercontent-test/files/xxx
  ✅ Asset 2412: Ani_Alice (vectorized with kodo://xxx)

🎉 Asset vectorization completed!
Results: Total: 520, Success: 450, Failed: 70, Duration: 2m30s
```

## 注意事项

- 工具只处理SVG格式的资源文件
- 确保算法服务正常运行在配置的端点
- 大批量处理时建议使用较小的batch size避免内存问题
- 使用干跑模式验证配置后再进行实际向量化