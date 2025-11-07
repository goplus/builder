ALTER TABLE `course_series` ADD COLUMN `thumbnail` longtext AFTER `title`;
ALTER TABLE `course_series` ADD COLUMN `description` longtext AFTER `thumbnail`;
