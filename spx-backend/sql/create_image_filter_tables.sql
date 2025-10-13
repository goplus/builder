-- 图片推荐过滤功能相关数据库表结构
-- 基于实际代码实现生成

-- 1. 用户图片过滤配置表 (user_image_filter_config)
CREATE TABLE `user_image_filter_config` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` bigint NOT NULL COMMENT '用户ID',
    `max_filter_ratio` decimal(3,2) DEFAULT 0.80 COMMENT '最大过滤比例（0-1）',
    `session_enabled` tinyint(1) DEFAULT 1 COMMENT '会话级过滤开关（0=关闭，1=开启）',
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` timestamp NULL DEFAULT NULL COMMENT '软删除时间戳',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_id` (`user_id`),
    KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户图片过滤配置表';

-- 2. 用户图片推荐历史表 (user_image_recommendation_history)
CREATE TABLE `user_image_recommendation_history` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` bigint NOT NULL COMMENT '用户ID',
    `image_id` bigint NOT NULL COMMENT '图片ID',
    `query_id` varchar(36) NOT NULL COMMENT '查询ID',
    `session_id` varchar(36) DEFAULT NULL COMMENT '会话ID（用于会话级过滤）',
    `query` text COMMENT '用户原始查询',
    `source` varchar(20) NOT NULL COMMENT '图片来源（search/generated）',
    `similarity` decimal(5,3) COMMENT '相似度分数',
    `rank` int NOT NULL COMMENT '推荐结果中的排名',
    `selected` tinyint(1) DEFAULT 0 COMMENT '是否被用户选择（0=未选择，1=已选择）',
    `selected_at` timestamp NULL DEFAULT NULL COMMENT '选择时间',
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` timestamp NULL DEFAULT NULL COMMENT '软删除时间戳',
    PRIMARY KEY (`id`),
    KEY `idx_user_image` (`user_id`, `image_id`),
    KEY `idx_query_id` (`query_id`),
    KEY `idx_user_session` (`user_id`, `session_id`),
    KEY `idx_user_created` (`user_id`, `created_at`),
    KEY `idx_selected` (`selected`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户图片推荐历史表';

-- 3. 图片过滤指标表 (image_filter_metrics)
CREATE TABLE `image_filter_metrics` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` bigint NOT NULL COMMENT '用户ID',
    `query_id` varchar(36) NOT NULL COMMENT '查询ID',
    `total_candidates` int NOT NULL COMMENT '总候选数量',
    `filtered_count` int NOT NULL COMMENT '过滤数量',
    `filter_ratio` decimal(5,3) COMMENT '过滤比例',
    `degradation_level` int DEFAULT 0 COMMENT '降级等级（0=无降级，1-4=降级等级）',
    `degradation_strategy` varchar(100) COMMENT '降级策略',
    `final_result_count` int NOT NULL COMMENT '最终结果数量',
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` timestamp NULL DEFAULT NULL COMMENT '软删除时间戳',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_query_id` (`query_id`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图片过滤指标表';

-- 4. 插入默认配置示例（可选）
-- 为新用户创建默认过滤配置
INSERT INTO `user_image_filter_config` (`user_id`, `max_filter_ratio`, `session_enabled`)
VALUES (1, 0.80, 1)
ON DUPLICATE KEY UPDATE
    `max_filter_ratio` = VALUES(`max_filter_ratio`),
    `session_enabled` = VALUES(`session_enabled`);

-- 5. 索引优化说明
-- 已为常用查询路径添加复合索引：
-- - 用户推荐历史查询：idx_user_image, idx_user_session
-- - 查询ID查询：idx_query_id
-- - 时间范围查询：idx_created_at
-- - 软删除过滤：idx_deleted_at
-- - 用户选择状态查询：idx_selected