# Dataset Processor 安全配置指南

这个工具用于从GitHub等来源获取游戏素材数据集并导入到SPX后端数据库中。

## 🔒 安全配置

为了保护敏感信息，本工具使用环境变量来管理API密钥和数据库密码。

### 1. 设置环境变量

#### 方法一：使用 .env 文件（推荐用于本地开发）

1. 复制环境变量模板：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，填入你的真实配置：
   ```bash
   # GitHub API Configuration
   GITHUB_TOKEN=ghp_your_actual_github_token_here

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_USERNAME=root
   DB_PASSWORD=your_actual_database_password
   DB_DATABASE=spx_backend

   # Kaggle API Configuration (Optional)
   KAGGLE_USERNAME=your_kaggle_username
   KAGGLE_KEY=your_kaggle_api_key
   ```

#### 方法二：使用系统环境变量（推荐用于生产环境）

```bash
export GITHUB_TOKEN="ghp_your_actual_github_token_here"
export DB_PASSWORD="your_actual_database_password"
# ... 其他变量
```

### 2. 获取API密钥

#### GitHub Token
1. 访问 [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token (classic)"
3. 选择权限：`public_repo`（用于访问公开仓库）
4. 复制生成的token

#### Kaggle API（可选）
1. 访问 [Kaggle Account](https://www.kaggle.com/account)
2. 点击 "Create New API Token"
3. 下载 `kaggle.json` 文件
4. 从文件中获取 `username` 和 `key`

### 3. 配置验证

运行配置测试：
```bash
python config_loader.py
```

## 🚀 使用方法

1. **安装依赖**：
   ```bash
   pip install -r requirements.txt
   ```

2. **配置环境变量**（见上文）

3. **运行完整管道**：
   ```bash
   python run_pipeline.py
   ```

4. **或单独运行步骤**：
   ```bash
   python 1_fetch_datasets.py
   python 2_clean_data.py
   python 3_convert_format.py
   python 4_import_to_db.py
   ```

## 📁 文件说明

- `config.json` - 基础配置文件（不包含敏感信息）
- `.env.example` - 环境变量模板
- `.env` - 实际环境变量文件（已在.gitignore中）
- `config_loader.py` - 安全配置加载器
- `run_pipeline.py` - 主执行脚本

## 🔐 安全注意事项

1. **永远不要**将真实的API密钥提交到Git仓库
2. 确保 `.env` 文件已在 `.gitignore` 中
3. 在生产环境使用系统环境变量而不是 `.env` 文件
4. 定期更新API密钥
5. 使用最小权限原则（GitHub token只需要public_repo权限）

## 🆘 故障排除

### 常见错误

1. **"GitHub token未配置"**
   - 检查环境变量 `GITHUB_TOKEN` 是否设置
   - 确保token不是占位符文本

2. **"数据库连接失败"**
   - 检查数据库服务是否运行
   - 验证数据库配置信息
   - 确保数据库用户有足够权限

3. **"API rate limit exceeded"**
   - 配置有效的GitHub token
   - 增加 `rate_limit_delay` 值

### 配置验证

运行以下命令检查配置状态：
```bash
python config_loader.py
```

这将显示：
- GitHub token状态
- 数据库连接信息
- Kaggle配置状态
- 配置验证结果