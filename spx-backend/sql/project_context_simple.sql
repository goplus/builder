-- 简化版项目上下文表
-- Simplified Project Context Table

CREATE TABLE `project_context` (
    `project_id` BIGINT PRIMARY KEY COMMENT '项目ID，主键',
    `name` VARCHAR(255) NOT NULL COMMENT '项目名称',
    `description` TEXT COMMENT '项目描述',
    `related_words` JSON COMMENT 'LLM生成的关联词列表，JSON数组格式',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    -- 索引
    INDEX `idx_project_context_created_at` (`created_at`)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目上下文表 - 存储LLM生成的关联词';

-- 插入测试数据示例
INSERT INTO `project_context` (
    `project_id`, 
    `name`, 
    `description`, 
    `related_words`
) VALUES 
(
    1, 
    '太空探险游戏',
    '玩家驾驶飞船探索外星球',
    '["宇宙飞船", "外星人", "星球", "陨石", "太空站", "宇航员", "星空", "火箭", "科幻", "探索"]'
),
(
    2, 
    '儿童数学学习',
    '帮助小朋友学习基础数学的教育应用',
    '["数字", "小朋友", "计算器", "教室", "书本", "铅笔", "卡通", "彩色", "学习", "游戏化"]'
);

-- 查询示例
-- 获取项目的关联词
SELECT project_id, name, related_words 
FROM project_context 
WHERE project_id = 1;

-- 查看所有项目上下文
SELECT 
    project_id,
    name,
    JSON_LENGTH(related_words) as word_count,
    created_at
FROM project_context
ORDER BY created_at DESC;
