-- AI资源管理相关数据库表结构

-- 1. AI 资源表 (aiResource)
CREATE TABLE `aiResource` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键，资源唯一标识',
    `url` VARCHAR(255) NOT NULL COMMENT '资源访问 URL',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间戳',
    INDEX `idx_aiResource_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 生成资源表';

-- 2. 标签表 (label)
CREATE TABLE `label` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键，标签唯一标识',
    `labelName` VARCHAR(50) NOT NULL UNIQUE COMMENT '标签名称，唯一约束',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间戳',
    INDEX `idx_label_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标签表';

-- 3. 资源标签关联表 (resource_label)
CREATE TABLE `resource_label` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键，关联记录唯一标识',
    `aiResourceId` BIGINT NOT NULL COMMENT '外键，引用 aiResource 表的 id',
    `labelId` BIGINT NOT NULL COMMENT '外键，引用 label 表的 id',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间戳',
    INDEX `idx_resource_label_aiResourceId` (`aiResourceId`),
    INDEX `idx_resource_label_labelId` (`labelId`),
    INDEX `idx_resource_label_deleted_at` (`deleted_at`),
    CONSTRAINT `fk_resource_label_aiResourceId` FOREIGN KEY (`aiResourceId`) REFERENCES `aiResource` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_resource_label_labelId` FOREIGN KEY (`labelId`) REFERENCES `label` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 资源与标签关联表';

-- 4. 资源使用统计表 (resource_usage_stats)
CREATE TABLE `resource_usage_stats` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    `ai_resource_id` BIGINT NOT NULL UNIQUE COMMENT 'AI资源ID',
    `view_count` BIGINT DEFAULT 0 COMMENT '查看次数',
    `selection_count` BIGINT DEFAULT 0 COMMENT '选择次数',
    `last_used_at` TIMESTAMP NULL COMMENT '最后使用时间',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX `idx_resource_usage_stats_ai_resource_id` (`ai_resource_id`),
    CONSTRAINT `fk_resource_usage_stats_ai_resource_id` FOREIGN KEY (`ai_resource_id`) REFERENCES `aiResource` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资源使用统计表';

-- 插入测试数据示例
-- INSERT INTO `aiResource` (`url`) VALUES 
--   ('https://example.com/images/cat1.svg'),
--   ('https://example.com/images/dog1.svg'),
--   ('https://example.com/images/bird1.svg');

-- INSERT INTO `label` (`labelName`) VALUES 
--   ('cat'),
--   ('dog'), 
--   ('animal'),
--   ('cute'),
--   ('cartoon');

-- INSERT INTO `resource_label` (`aiResourceId`, `labelId`) VALUES
--   (1, 1), (1, 3), (1, 4),  -- cat1.svg: cat, animal, cute
--   (2, 2), (2, 3), (2, 5),  -- dog1.svg: dog, animal, cartoon  
--   (3, 3), (3, 5);          -- bird1.svg: animal, cartoon