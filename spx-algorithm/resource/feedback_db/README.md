# SPX Algorithm - 用户反馈数据库

这个目录包含了SPX算法模块的用户反馈数据库配置，用于存储用户行为数据以支持LTR重排序功能。

## 🏗️ 架构设计

### 数据库选型：MySQL 8.0
- **高可靠性**：成熟稳定的关系型数据库
- **丰富功能**：支持JSON字段、约束检查、触发器等
- **易于维护**：完善的管理工具和监控方案
- **性能优秀**：适合用户反馈数据的读写模式

### 表结构设计

#### 1. `user_feedback` - 用户反馈主表
```sql
用途：存储用户的搜索和选择行为数据
字段：query_id, query, pic_id_1-4, choose_id, feedback_date
特点：支持数据完整性约束，确保数据质量
```

#### 2. `ltr_training_data` - LTR训练数据表
```sql
用途：存储预处理后的pair-wise训练数据
字段：query_vector, pic_vectors, features, label
特点：JSON字段存储向量，提高查询效率
```

#### 3. `query_stats` - 查询统计表
```sql
用途：分析热门查询，优化搜索体验
字段：query_hash, query_count, last_query_time
特点：支持查询趋势分析和用户行为洞察
```

#### 4. `picture_stats` - 图片统计表
```sql
用途：分析图片点击率，识别优质内容
字段：pic_id, click_count, click_rate
特点：自动计算点击率，支持内容质量评估
```

## 🚀 快速启动

### 1. 启动数据库服务
```bash
cd resource/feedback_db
docker-compose up -d
```

### 2. 验证服务状态
```bash
# 检查容器状态
docker-compose ps

# 检查健康状态
docker-compose logs mysql
```

### 3. 连接数据库
```bash
# 方式1：使用Web管理界面
http://localhost:8080
Server: mysql
Username: spx_user
Password: spx_feedback_2024

# 方式2：命令行连接
mysql -h 127.0.0.1 -P 3306 -u spx_user -p spx_feedback
```

## 🔧 配置详情

### 服务端口
- **MySQL**: `3306`
- **Adminer管理界面**: `8080`

### 认证信息
- **Root用户**: `root` / `spx_feedback_root_2024`
- **应用用户**: `spx_user` / `spx_feedback_2024` 
- **应用专用用户**: `spx_app` / `spx_app_2024`

### 数据持久化
- 数据目录：Docker Volume `mysql_data`
- 配置文件：`./my.cnf`
- 初始化脚本：`./init.sql`

## 📊 测试数据

数据库启动后会自动插入测试数据：

```sql
-- 5条用户反馈记录
SELECT COUNT(*) FROM user_feedback;  -- 5

-- 4种不同查询类型
SELECT COUNT(*) FROM query_stats;    -- 4

-- 5张被选择过的图片
SELECT COUNT(*) FROM picture_stats;  -- 5
```

## 🔍 常用查询

### 查看反馈数据
```sql
-- 最近的反馈记录
SELECT * FROM user_feedback 
ORDER BY created_at DESC LIMIT 10;

-- 热门查询
SELECT query_text, query_count 
FROM query_stats 
ORDER BY query_count DESC;

-- 高点击率图片
SELECT pic_id, click_count, click_rate 
FROM picture_stats 
ORDER BY click_rate DESC;
```

### 分析用户行为
```sql
-- 按日统计反馈数量
SELECT DATE(feedback_date) as date, COUNT(*) as count
FROM user_feedback 
GROUP BY DATE(feedback_date)
ORDER BY date DESC;

-- 查询重复度分析
SELECT query, COUNT(*) as repeat_count
FROM user_feedback 
GROUP BY query 
HAVING repeat_count > 1;
```

## 🛠️ 维护操作

### 备份数据
```bash
# 导出所有数据
docker exec spx-feedback-mysql mysqldump -u root -pspx_feedback_root_2024 spx_feedback > backup.sql

# 导出结构和数据
docker exec spx-feedback-mysql mysqldump -u root -pspx_feedback_root_2024 --routines --triggers spx_feedback > full_backup.sql
```

### 恢复数据
```bash
# 恢复数据
docker exec -i spx-feedback-mysql mysql -u root -pspx_feedback_root_2024 spx_feedback < backup.sql
```

### 清理旧数据
```sql
-- 清理90天前的反馈数据
DELETE FROM user_feedback 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- 重置统计数据
TRUNCATE TABLE ltr_training_data;
```

## 🔧 故障排除

### 常见问题

1. **容器启动失败**
   ```bash
   # 查看详细日志
   docker-compose logs -f mysql
   
   # 检查端口占用
   netstat -tulpn | grep 3306
   ```

2. **连接被拒绝**
   ```bash
   # 检查服务健康状态
   docker-compose exec mysql mysqladmin ping -h localhost -u spx_user -pspx_feedback_2024
   ```

3. **数据不一致**
   ```sql
   -- 检查约束违反
   SELECT * FROM user_feedback 
   WHERE choose_id NOT IN (pic_id_1, pic_id_2, pic_id_3, pic_id_4);
   ```

### 性能监控
```sql
-- 查看慢查询
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- 检查表大小
SELECT 
    table_name, 
    ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
FROM information_schema.tables 
WHERE table_schema = 'spx_feedback';
```

## 🔌 应用集成

在应用代码中使用此数据库：

```python
# config/base.py
FEEDBACK_DATABASE_URL = "mysql+pymysql://spx_app:spx_app_2024@localhost:3306/spx_feedback?charset=utf8mb4"
```

这样设计确保了用户反馈数据的安全存储和高效访问，为LTR重排序提供了可靠的数据基础。