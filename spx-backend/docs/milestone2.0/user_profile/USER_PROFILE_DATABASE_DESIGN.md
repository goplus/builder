# 简化版用户画像数据库设计

## 概述

基于SPX Builder现有架构，设计的用户画像系统数据库表，包含核心的用户画像表和行为记录表。


## 核心表结构

### 1. 扩展现有ai_resources表

```sql
-- 为现有ai_resources表添加个性化字段
ALTER TABLE ai_resources 
ADD COLUMN IF NOT EXISTS personalization_score DECIMAL(3,2) DEFAULT 0.50 
    CHECK (personalization_score >= 0 AND personalization_score <= 1),
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0.00 
    CHECK (avg_rating >= 0 AND avg_rating <= 5.0);

-- 添加性能索引
CREATE INDEX IF NOT EXISTS idx_ai_resources_personalization 
ON ai_resources(personalization_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_resources_usage 
ON ai_resources(usage_count DESC);
```

### 2. 用户画像主表

```sql
-- 用户画像表 (核心表)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 主题偏好 (9个主题的权重 0-1)
    theme_cartoon DECIMAL(3,2) DEFAULT 0.50 CHECK (theme_cartoon >= 0 AND theme_cartoon <= 1),
    theme_simple DECIMAL(3,2) DEFAULT 0.50 CHECK (theme_simple >= 0 AND theme_simple <= 1),
    theme_realistic DECIMAL(3,2) DEFAULT 0.50 CHECK (theme_realistic >= 0 AND theme_realistic <= 1),
    theme_pixel DECIMAL(3,2) DEFAULT 0.50 CHECK (theme_pixel >= 0 AND theme_pixel <= 1),
    theme_sticker DECIMAL(3,2) DEFAULT 0.50 CHECK (theme_sticker >= 0 AND theme_sticker <= 1),
    theme_cute DECIMAL(3,2) DEFAULT 0.50 CHECK (theme_cute >= 0 AND theme_cute <= 1),
    theme_sketch DECIMAL(3,2) DEFAULT 0.50 CHECK (theme_sketch >= 0 AND theme_sketch <= 1),
    theme_monochrome DECIMAL(3,2) DEFAULT 0.50 CHECK (theme_monochrome >= 0 AND theme_monochrome <= 1),
    theme_logo DECIMAL(3,2) DEFAULT 0.50 CHECK (theme_logo >= 0 AND theme_logo <= 1),
    
    -- Provider偏好
    provider_openai_score DECIMAL(3,2) DEFAULT 0.50,
    provider_recraft_score DECIMAL(3,2) DEFAULT 0.50,
    provider_svgio_score DECIMAL(3,2) DEFAULT 0.50,
    
    -- 用户分群 (简单字符串)
    user_group VARCHAR(50) DEFAULT 'general',
    
    -- 统计数据
    total_searches INTEGER DEFAULT 0,
    total_downloads INTEGER DEFAULT 0,
    total_generations INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 唯一约束
    UNIQUE(user_id)
);

-- 用户画像表索引
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_group ON user_profiles(user_group);
CREATE INDEX idx_user_profiles_updated ON user_profiles(updated_at DESC);

-- 自动更新时间戳触发器
CREATE OR REPLACE FUNCTION update_user_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_profile_timestamp
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profile_timestamp();
```

### 3. 用户行为记录表

```sql
-- 用户行为记录表 (简化版)
CREATE TABLE IF NOT EXISTS user_behaviors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 行为类型 (只保留核心类型)
    behavior_type VARCHAR(20) NOT NULL CHECK (behavior_type IN (
        'search', 'download', 'generate', 'rate'
    )),
    
    -- 行为内容 (简化的JSON)
    query_text TEXT, -- 搜索/生成的文本
    theme VARCHAR(20), -- 使用的主题
    provider VARCHAR(20), -- 使用的provider
    resource_id UUID REFERENCES ai_resources(id) ON DELETE SET NULL, -- 相关资源ID
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 评分 1-5
    
    -- 成功标识
    success BOOLEAN DEFAULT true,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 用户行为表索引
CREATE INDEX idx_user_behaviors_user_id ON user_behaviors(user_id, created_at DESC);
CREATE INDEX idx_user_behaviors_type ON user_behaviors(behavior_type, created_at DESC);
CREATE INDEX idx_user_behaviors_resource ON user_behaviors(resource_id) WHERE resource_id IS NOT NULL;

-- 自动清理90天前的行为数据
CREATE OR REPLACE FUNCTION cleanup_old_behaviors()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_behaviors 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```


## 核心功能实现

### 1. 用户画像更新函数

```sql
-- 根据用户行为更新画像的函数
CREATE OR REPLACE FUNCTION update_user_profile_from_behavior(
    p_user_id UUID,
    p_behavior_type VARCHAR(20),
    p_theme VARCHAR(20),
    p_provider VARCHAR(20),
    p_rating INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    theme_column VARCHAR(50);
    provider_column VARCHAR(50);
    learning_rate DECIMAL(3,2) := 0.1; -- 学习率
BEGIN
    -- 确保用户画像存在
    INSERT INTO user_profiles (user_id, user_group)
    VALUES (p_user_id, 'general')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- 更新主题偏好
    IF p_theme IS NOT NULL THEN
        theme_column := 'theme_' || p_theme;
        
        EXECUTE format('
            UPDATE user_profiles 
            SET %I = LEAST(1.0, %I + $1),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $2
        ', theme_column, theme_column) 
        USING learning_rate, p_user_id;
    END IF;
    
    -- 更新Provider偏好 (基于评分)
    IF p_provider IS NOT NULL AND p_rating IS NOT NULL THEN
        provider_column := 'provider_' || p_provider || '_score';
        
        EXECUTE format('
            UPDATE user_profiles 
            SET %I = (%I * 0.9) + ($1 * 0.1),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $2
        ', provider_column, provider_column) 
        USING p_rating / 5.0, p_user_id;
    END IF;
    
    -- 更新统计计数
    UPDATE user_profiles 
    SET 
        total_searches = CASE WHEN p_behavior_type = 'search' THEN total_searches + 1 ELSE total_searches END,
        total_downloads = CASE WHEN p_behavior_type = 'download' THEN total_downloads + 1 ELSE total_downloads END,
        total_generations = CASE WHEN p_behavior_type = 'generate' THEN total_generations + 1 ELSE total_generations END,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;
    
END;
$$ LANGUAGE plpgsql;
```

### 2. 获取用户推荐资源函数

```sql
-- 根据用户画像获取推荐资源
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    resource_id UUID,
    image_path TEXT,
    theme VARCHAR(20),
    personalization_score DECIMAL,
    recommendation_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_prefs AS (
        SELECT 
            theme_cartoon, theme_simple, theme_realistic, theme_pixel,
            theme_sticker, theme_cute, theme_sketch, theme_monochrome, theme_logo
        FROM user_profiles 
        WHERE user_id = p_user_id
    )
    SELECT 
        ar.id,
        ar.image_path,
        ar.theme,
        CASE ar.theme
            WHEN 'cartoon' THEN up.theme_cartoon
            WHEN 'simple' THEN up.theme_simple
            WHEN 'realistic' THEN up.theme_realistic
            WHEN 'pixel' THEN up.theme_pixel
            WHEN 'sticker' THEN up.theme_sticker
            WHEN 'cute' THEN up.theme_cute
            WHEN 'sketch' THEN up.theme_sketch
            WHEN 'monochrome' THEN up.theme_monochrome
            WHEN 'logo' THEN up.theme_logo
            ELSE 0.50
        END as calc_personalization_score,
        '基于您的' || ar.theme || '风格偏好推荐' as reason
    FROM ai_resources ar
    CROSS JOIN user_prefs up
    WHERE ar.theme IS NOT NULL
    ORDER BY calc_personalization_score DESC, ar.usage_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

### 3. 简化的视图

```sql
-- 用户画像简要视图
CREATE OR REPLACE VIEW user_profile_summary AS
SELECT 
    up.user_id,
    u.username,
    up.user_group,
    -- 最喜欢的主题
    CASE 
        WHEN theme_cartoon = GREATEST(theme_cartoon, theme_simple, theme_realistic, theme_pixel, theme_sticker, theme_cute, theme_sketch, theme_monochrome, theme_logo) THEN 'cartoon'
        WHEN theme_simple = GREATEST(theme_cartoon, theme_simple, theme_realistic, theme_pixel, theme_sticker, theme_cute, theme_sketch, theme_monochrome, theme_logo) THEN 'simple'
        WHEN theme_realistic = GREATEST(theme_cartoon, theme_simple, theme_realistic, theme_pixel, theme_sticker, theme_cute, theme_sketch, theme_monochrome, theme_logo) THEN 'realistic'
        WHEN theme_pixel = GREATEST(theme_cartoon, theme_simple, theme_realistic, theme_pixel, theme_sticker, theme_cute, theme_sketch, theme_monochrome, theme_logo) THEN 'pixel'
        WHEN theme_sticker = GREATEST(theme_cartoon, theme_simple, theme_realistic, theme_pixel, theme_sticker, theme_cute, theme_sketch, theme_monochrome, theme_logo) THEN 'sticker'
        WHEN theme_cute = GREATEST(theme_cartoon, theme_simple, theme_realistic, theme_pixel, theme_sticker, theme_cute, theme_sketch, theme_monochrome, theme_logo) THEN 'cute'
        WHEN theme_sketch = GREATEST(theme_cartoon, theme_simple, theme_realistic, theme_pixel, theme_sticker, theme_cute, theme_sketch, theme_monochrome, theme_logo) THEN 'sketch'
        WHEN theme_monochrome = GREATEST(theme_cartoon, theme_simple, theme_realistic, theme_pixel, theme_sticker, theme_cute, theme_sketch, theme_monochrome, theme_logo) THEN 'monochrome'
        ELSE 'logo'
    END AS favorite_theme,
    up.total_searches,
    up.total_downloads,
    up.total_generations,
    up.updated_at
FROM user_profiles up
JOIN users u ON up.user_id = u.id;
```

## 使用示例

### 1. 记录用户行为并更新画像

```sql
-- 用户搜索了"卡通猫"
INSERT INTO user_behaviors (user_id, behavior_type, query_text, theme, success)
VALUES ('user-uuid', 'search', '卡通猫', 'cartoon', true);

-- 更新用户画像
SELECT update_user_profile_from_behavior('user-uuid', 'search', 'cartoon', NULL, NULL);

-- 用户下载了一个资源并评分
INSERT INTO user_behaviors (user_id, behavior_type, resource_id, provider, rating)
VALUES ('user-uuid', 'download', 'resource-uuid', 'openai', 5);

-- 更新画像
SELECT update_user_profile_from_behavior('user-uuid', 'download', NULL, 'openai', 5);
```

### 2. 获取个性化推荐

```sql
-- 获取用户的个性化推荐
SELECT * FROM get_personalized_recommendations('user-uuid', 10);

-- 查看用户画像摘要
SELECT * FROM user_profile_summary WHERE user_id = 'user-uuid';
```
