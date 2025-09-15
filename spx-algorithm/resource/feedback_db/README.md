# 用户反馈数据库

用于存储用户搜索行为和反馈数据，支持LTR重排序功能的MySQL数据库。

## 快速启动

```bash
# 启动数据库服务
cd resource/feedback_db
docker-compose up -d

# 验证服务状态
docker-compose ps
```

## 访问数据库

**Web管理界面**: http://localhost:8080
- Server: `mysql`
- Username: `spx_user` 
- Password: `spx_feedback_2024`

**命令行连接**:
```bash
mysql -h 127.0.0.1 -P 3307 -u spx_user -p spx_feedback
```

## 配置信息

- **MySQL端口**: 3307 (外部访问端口)
- **管理界面端口**: 8080
- **数据库**: `spx_feedback`
- **主要表**: `user_feedback` (存储用户反馈数据)

## 应用集成

在应用代码中的数据库配置:
```python
MYSQL_HOST = "localhost"
MYSQL_PORT = 3307
MYSQL_USER = "spx_user"
MYSQL_PASSWORD = "spx_feedback_2024"
MYSQL_DATABASE = "spx_feedback"
```