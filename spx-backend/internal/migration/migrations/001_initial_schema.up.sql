-- Initial database schema for spx-backend
-- This migration creates all the core tables required by the application

CREATE TABLE IF NOT EXISTS `user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3),
  `username` varchar(191),
  `display_name` longtext,
  `avatar` longtext,
  `description` longtext,
  `roles` text,
  `plan` tinyint unsigned,
  `follower_count` bigint,
  `following_count` bigint,
  `project_count` bigint,
  `public_project_count` bigint,
  `liked_project_count` bigint,
  `_deleted_at_is_null` bit(1) GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_username` (`username`,`_deleted_at_is_null`),
  KEY `idx_user_deleted_at` (`deleted_at`),
  KEY `idx_user_plan` (`plan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3),
  `owner_id` bigint,
  `remixed_from_release_id` bigint,
  `latest_release_id` bigint,
  `name` varchar(191),
  `version` bigint,
  `files` longblob,
  `visibility` tinyint unsigned,
  `description` longtext,
  `instructions` longtext,
  `thumbnail` longtext,
  `view_count` bigint,
  `like_count` bigint,
  `release_count` bigint,
  `remix_count` bigint,
  `_deleted_at_is_null` bit(1) GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_project_owner_id_name` (`owner_id`,`name`,`_deleted_at_is_null`),
  KEY `idx_project_deleted_at` (`deleted_at`),
  KEY `idx_project_remixed_from_release_id` (`remixed_from_release_id`),
  KEY `idx_project_latest_release_id` (`latest_release_id`),
  KEY `idx_project_visibility` (`visibility`),
  KEY `idx_project_view_count` (`view_count`),
  KEY `idx_project_like_count` (`like_count`),
  KEY `idx_project_release_count` (`release_count`),
  KEY `idx_project_remix_count` (`remix_count`),
  KEY `idx_project_owner_id` (`owner_id`),
  FULLTEXT KEY `idx_project_name` (`name`),
  CONSTRAINT `fk_project_owner` FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_release` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3),
  `project_id` bigint,
  `name` varchar(191),
  `description` longtext,
  `files` longblob,
  `thumbnail` longtext,
  `remix_count` bigint,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_project_release_project_id_name` (`project_id`,`name`),
  KEY `idx_project_release_deleted_at` (`deleted_at`),
  KEY `idx_project_release_remix_count` (`remix_count`),
  KEY `idx_project_release_project_id` (`project_id`),
  FULLTEXT KEY `idx_project_release_name` (`name`),
  CONSTRAINT `fk_project_release_project` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Check and add fk_project_remixed_from_release
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'project'
        AND CONSTRAINT_NAME = 'fk_project_remixed_from_release'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE `project` ADD CONSTRAINT `fk_project_remixed_from_release` FOREIGN KEY (`remixed_from_release_id`) REFERENCES `project_release` (`id`)',
    'SELECT "Foreign key fk_project_remixed_from_release already exists, skipping" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add fk_project_latest_release
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'project'
        AND CONSTRAINT_NAME = 'fk_project_latest_release'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE `project` ADD CONSTRAINT `fk_project_latest_release` FOREIGN KEY (`latest_release_id`) REFERENCES `project_release` (`id`)',
    'SELECT "Foreign key fk_project_latest_release already exists, skipping" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `asset` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3),
  `owner_id` bigint,
  `display_name` varchar(191),
  `type` tinyint unsigned,
  `category` varchar(191),
  `files` longblob,
  `files_hash` longtext,
  `visibility` tinyint unsigned,
  PRIMARY KEY (`id`),
  KEY `idx_asset_owner_id` (`owner_id`),
  KEY `idx_asset_deleted_at` (`deleted_at`),
  KEY `idx_asset_type` (`type`),
  KEY `idx_asset_category` (`category`),
  KEY `idx_asset_visibility` (`visibility`),
  FULLTEXT KEY `idx_asset_display_name` (`display_name`),
  CONSTRAINT `fk_asset_owner` FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `course` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3),
  `owner_id` bigint,
  `title` varchar(191),
  `thumbnail` longtext,
  `entrypoint` longtext,
  `references` longblob,
  `prompt` longtext,
  PRIMARY KEY (`id`),
  KEY `idx_course_owner_id` (`owner_id`),
  KEY `idx_course_deleted_at` (`deleted_at`),
  FULLTEXT KEY `idx_course_title` (`title`),
  CONSTRAINT `fk_course_owner` FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `course_series` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3),
  `owner_id` bigint,
  `title` varchar(191),
  `course_ids` longblob,
  `order` bigint,
  PRIMARY KEY (`id`),
  KEY `idx_course_series_owner_id` (`owner_id`),
  KEY `idx_course_series_deleted_at` (`deleted_at`),
  KEY `idx_course_series_order` (`order`),
  FULLTEXT KEY `idx_course_series_title` (`title`),
  CONSTRAINT `fk_course_series_owner` FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_relationship` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3),
  `user_id` bigint,
  `target_user_id` bigint,
  `followed_at` datetime(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_relationship_user_id_target_user_id` (`user_id`,`target_user_id`),
  KEY `idx_user_relationship_deleted_at` (`deleted_at`),
  KEY `idx_user_relationship_target_user_id` (`target_user_id`),
  KEY `idx_user_relationship_followed_at` (`followed_at`),
  KEY `idx_user_relationship_user_id` (`user_id`),
  CONSTRAINT `fk_user_relationship_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_user_relationship_target_user` FOREIGN KEY (`target_user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_project_relationship` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  `deleted_at` datetime(3),
  `user_id` bigint,
  `project_id` bigint,
  `view_count` bigint,
  `last_viewed_at` datetime(3),
  `liked_at` datetime(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_project_relationship_user_id_project_id` (`user_id`,`project_id`),
  KEY `idx_user_project_relationship_deleted_at` (`deleted_at`),
  KEY `idx_user_project_relationship_project_id` (`project_id`),
  KEY `idx_user_project_relationship_view_count` (`view_count`),
  KEY `idx_user_project_relationship_last_viewed_at` (`last_viewed_at`),
  KEY `idx_user_project_relationship_liked_at` (`liked_at`),
  KEY `idx_user_project_relationship_user_id` (`user_id`),
  CONSTRAINT `fk_user_project_relationship_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_user_project_relationship_project` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
