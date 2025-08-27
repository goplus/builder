# 生产环境部署指南

## 📁 启动脚本说明

项目提供了三种启动脚本，适用于不同的使用场景：

### 1. 开发环境启动
```bash
python run.py
```
- 使用Flask内置服务器
- 支持热重载和调试
- 适用于开发和调试

### 2. 简单生产环境启动
```bash
./start.sh
```
- 使用Gunicorn生产服务器
- 前台运行，适合容器部署
- 配置简单，快速启动

### 3. 完整服务管理
```bash
./service.sh start    # 启动服务
./service.sh stop     # 停止服务
./service.sh restart  # 重启服务
./service.sh status   # 查看状态
./service.sh health   # 健康检查
./service.sh logs     # 查看日志
```

## 🚀 生产环境部署步骤

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 设置环境变量（可选）
```bash
export FLASK_ENV=production
export HOST=0.0.0.0
export PORT=8090
```

### 3. 启动服务
```bash
# 简单启动（推荐）
./start.sh

# 或使用服务管理脚本
./service.sh start
```

### 4. 验证服务
```bash
curl http://localhost:8090/api/health
```

## ⚙️ 配置参数说明

### Gunicorn配置
| 参数 | 值 | 说明 |
|------|----|----|
| `--bind` | 0.0.0.0:8090 | 监听地址和端口 |
| `--workers` | 4 | 工作进程数量 |
| `--worker-class` | sync | 工作进程类型 |
| `--timeout` | 120 | 请求超时时间(秒) |
| `--keep-alive` | 2 | Keep-Alive连接时间 |
| `--max-requests` | 1000 | 每个进程最大请求数 |
| `--max-requests-jitter` | 100 | 请求数随机抖动 |
| `--preload` | - | 预加载应用代码 |

### 日志配置
- **访问日志**: `logs/access.log`
- **错误日志**: `logs/error.log`
- **PID文件**: `/tmp/gunicorn.pid`

## 📊 监控和维护

### 查看服务状态
```bash
./service.sh status
```

### 查看实时日志
```bash
# 错误日志
./service.sh logs error

# 访问日志
./service.sh logs access
```

### 健康检查
```bash
./service.sh health
```

### 性能监控
```bash
# 查看进程资源占用
ps aux | grep gunicorn

# 查看端口占用
netstat -tlnp | grep :8090
```

## 🔧 常见问题

### 1. 端口占用
```bash
# 查找占用端口的进程
lsof -i :8090

# 杀死进程
kill -9 <PID>
```

### 2. 权限问题
```bash
# 确保脚本有执行权限
chmod +x *.sh

# 确保日志目录可写
mkdir -p logs
chmod 755 logs
```

### 3. 服务启动失败
```bash
# 查看错误日志
tail -f logs/error.log

# 检查配置
python -c "from app import create_app; print('配置正常')"
```

## 🐳 Docker部署

如果使用Docker，可以基于现有的Dockerfile：

```bash
# 构建镜像
docker build -t image-search-api .

# 运行容器
docker run -d \
  --name image-search-api \
  -p 8090:8090 \
  -v $(pwd)/logs:/app/logs \
  image-search-api
```

## 📈 性能优化建议

### 1. 工作进程数量调整
```bash
# CPU密集型: workers = CPU核心数
# I/O密集型: workers = CPU核心数 * 2 + 1
```

### 2. 内存优化
- 启用`--preload`预加载应用
- 设置合适的`--max-requests`避免内存泄漏
- 监控内存使用情况

### 3. 网络优化
- 调整`--keep-alive`时间
- 配置合适的`--timeout`值
- 使用反向代理(Nginx)

## 🛡️ 安全配置

### 1. 环境变量
```bash
# 生产环境必须设置
export FLASK_ENV=production
export SECRET_KEY="your-secret-key"
```

### 2. 文件权限
```bash
# 限制配置文件权限
chmod 600 app/config/config.py

# 设置日志目录权限
chmod 755 logs
```

### 3. 反向代理
推荐在生产环境中使用Nginx作为反向代理:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📝 日志轮转

建议配置logrotate防止日志文件过大：

```bash
# 创建logrotate配置
sudo tee /etc/logrotate.d/image-search-api << EOF
/path/to/project/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF
```

## 🔄 升级部署

```bash
# 1. 备份当前版本
cp -r /path/to/project /path/to/project.backup

# 2. 更新代码
git pull origin main

# 3. 更新依赖
pip install -r requirements.txt

# 4. 重启服务
./service.sh restart

# 5. 验证服务
./service.sh health
```