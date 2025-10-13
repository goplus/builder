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
