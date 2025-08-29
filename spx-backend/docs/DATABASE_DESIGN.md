# 数据库表设计文档

## 概述

本文档描述了 SPX Backend 中新增的 AI 资源管理相关数据库表设计。这些表主要用于管理 AI 生成的资源（如 SVG 图像）及其标签分类系统。

## 表结构设计

### 1. AI 资源表 (aiResource)

**表名**: `aiResource`  
**描述**: 存储 AI 生成的资源信息，主要是 SVG 图像资源

| 字段名 | 数据类型 | 约束 | 描述 |
|--------|----------|------|------|
| id | bigint | PRIMARY KEY, AUTO_INCREMENT | 主键，资源唯一标识 |
| url | varchar | NOT NULL | 资源访问 URL |
| created_at | timestamp | NOT NULL | 创建时间 |
| updated_at | timestamp | NOT NULL | 更新时间 |
| deleted_at | timestamp | INDEX | 软删除时间戳 |

**特性**:
- 继承自基础 Model 结构，包含标准的时间戳字段和软删除支持
- 支持通过多对多关系与标签关联
- URL 字段存储资源的访问地址（可能是文件路径或云存储 URL）

### 2. 标签表 (label)

**表名**: `label`  
**描述**: 存储用于分类 AI 资源的标签信息

| 字段名 | 数据类型 | 约束 | 描述 |
|--------|----------|------|------|
| id | bigint | PRIMARY KEY, AUTO_INCREMENT | 主键，标签唯一标识 |
| labelName | varchar(50) | UNIQUE, NOT NULL | 标签名称，唯一约束 |
| created_at | timestamp | NOT NULL | 创建时间 |
| updated_at | timestamp | NOT NULL | 更新时间 |
| deleted_at | timestamp | INDEX | 软删除时间戳 |

**特性**:
- 标签名称具有唯一性约束，防止重复标签
- 限制标签名称长度为 50 字符
- 支持通过多对多关系与 AI 资源关联

### 3. 资源标签关联表 (resource_label)

**表名**: `resource_label`  
**描述**: AI 资源与标签的多对多关联表

| 字段名 | 数据类型 | 约束 | 描述 |
|--------|----------|------|------|
| id | bigint | PRIMARY KEY, AUTO_INCREMENT | 主键，关联记录唯一标识 |
| aiResourceId | bigint | NOT NULL, INDEX, FOREIGN KEY | 外键，引用 aiResource 表的 id |
| labelId | bigint | NOT NULL, INDEX, FOREIGN KEY | 外键，引用 label 表的 id |
| created_at | timestamp | NOT NULL | 创建时间 |
| updated_at | timestamp | NOT NULL | 更新时间 |
| deleted_at | timestamp | INDEX | 软删除时间戳 |

**外键关系**:
- `aiResourceId` → `aiResource.id`
- `labelId` → `label.id`

**索引设计**:
- `aiResourceId` 字段建立索引，优化基于资源查询标签的性能
- `labelId` 字段建立索引，优化基于标签查询资源的性能
- `deleted_at` 字段建立索引，支持软删除查询优化

## 关系模型

```
aiResource (1) ←→ (N) resource_label (N) ←→ (1) label
```

这是一个典型的多对多关系设计：
- 一个 AI 资源可以有多个标签
- 一个标签可以被多个 AI 资源使用
- 通过中间表 `resource_label` 实现多对多关联

## 数据库特性

### 软删除支持
所有表都支持软删除功能：
- 使用 `deleted_at` 字段标记删除状态
- 查询时自动过滤已删除记录
- 支持数据恢复

### 时间戳审计
每个表都包含完整的时间戳字段：
- `created_at`: 记录创建时间
- `updated_at`: 记录最后更新时间
- `deleted_at`: 软删除时间（为 NULL 表示未删除）

### 索引优化
- 主键自动建立聚簇索引
- 外键字段建立普通索引，优化关联查询
- `deleted_at` 字段建立索引，优化软删除查询
- 标签名称的唯一索引确保数据一致性

## 使用场景

### 1. AI 资源管理
- 存储 SVG 图像生成结果
- 记录资源的访问 URL
- 支持资源的软删除和恢复

### 2. 标签分类系统
- 为 AI 资源打标签进行分类
- 支持多维度标签组合
- 便于资源的检索和过滤

### 3. 查询优化
- 通过标签快速筛选相关资源
- 通过资源查看所有关联标签
- 支持复杂的标签组合查询

## 扩展性考虑

### 1. 字段扩展
- AI 资源表可以根据需要添加更多元数据字段（如尺寸、格式等）
- 标签表可以添加描述、颜色、图标等字段

### 2. 关系扩展
- 可以为关联表添加权重字段，支持标签重要性排序
- 可以添加标签层级关系，支持标签树形结构

### 3. 性能优化
- 根据查询模式可以添加复合索引
- 考虑分表策略应对大数据量场景

## 注意事项

1. **数据一致性**: 删除标签时需要考虑关联资源的处理策略
2. **性能监控**: 需要监控多对多查询的性能，必要时进行索引优化
3. **数据清理**: 定期清理软删除的数据，避免表空间过度膨胀
4. **权限控制**: 考虑用户权限，确保资源访问的安全性



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
