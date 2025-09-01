-- Rollback initial database schema for spx-backend
-- This migration drops all tables in reverse dependency order

DROP TABLE IF EXISTS `user_project_relationship`;
DROP TABLE IF EXISTS `user_relationship`;
DROP TABLE IF EXISTS `course_series`;
DROP TABLE IF EXISTS `course`;
DROP TABLE IF EXISTS `asset`;

-- Check and drop fk_project_latest_release
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'project'
        AND CONSTRAINT_NAME = 'fk_project_latest_release'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@constraint_exists > 0,
    'ALTER TABLE `project` DROP FOREIGN KEY `fk_project_latest_release`',
    'SELECT "Foreign key fk_project_latest_release does not exist, skipping" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and drop fk_project_remixed_from_release
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'project'
        AND CONSTRAINT_NAME = 'fk_project_remixed_from_release'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@constraint_exists > 0,
    'ALTER TABLE `project` DROP FOREIGN KEY `fk_project_remixed_from_release`',
    'SELECT "Foreign key fk_project_remixed_from_release does not exist, skipping" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP TABLE IF EXISTS `project_release`;
DROP TABLE IF EXISTS `project`;
DROP TABLE IF EXISTS `user`;
