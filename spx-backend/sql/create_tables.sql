-- AI资源管理相关数据库表结构

-- 1. 游戏素材表 (game_assets)
CREATE TABLE `game_assets` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键，素材唯一标识',
    `name` VARCHAR(255) NOT NULL COMMENT '素材名称，用于补全',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间戳',
    INDEX `idx_game_assets_name` (`name`),
    INDEX `idx_game_assets_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='游戏素材表';

-- 2. AI 资源表 (aiResource)
CREATE TABLE `aiResource` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键，资源唯一标识',
    `url` VARCHAR(255) NOT NULL COMMENT '资源访问 URL',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间戳',
    INDEX `idx_aiResource_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 生成资源表';

-- 3. 用户图片过滤配置表 (user_image_filter_config)
CREATE TABLE `user_image_filter_config` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` bigint NOT NULL COMMENT '用户ID',
    `filter_window_days` int DEFAULT 30 COMMENT '过滤窗口期（天）',
    `max_filter_ratio` decimal(3,2) DEFAULT 0.80 COMMENT '最大过滤比例（0-1）',
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户图片过滤配置表';

-- 4. 图片过滤指标表 (image_filter_metrics)
CREATE TABLE `image_filter_metrics` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` bigint NOT NULL COMMENT '用户ID',
    `query_id` varchar(36) NOT NULL COMMENT '查询ID',
    `total_candidates` int NOT NULL COMMENT '总候选数量',
    `filtered_count` int NOT NULL COMMENT '过滤数量',
    `filter_ratio` decimal(5,3) COMMENT '过滤比例',
    `degradation_level` int DEFAULT 0 COMMENT '降级等级',
    `degradation_strategy` varchar(100) COMMENT '降级策略',
    `final_result_count` int NOT NULL COMMENT '最终结果数量',
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` timestamp NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_query_id` (`query_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图片过滤指标表';
