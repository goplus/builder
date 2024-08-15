SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for asset
-- ----------------------------
DROP TABLE IF EXISTS `asset`;
CREATE TABLE `asset`  (
                          `id` int NOT NULL AUTO_INCREMENT,
                          `c_time` datetime NULL DEFAULT NULL,
                          `u_time` datetime NULL DEFAULT NULL,
                          `display_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
                          `owner` varchar(255) NULL DEFAULT NULL,
                          `category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
                          `asset_type` int NULL DEFAULT NULL,
                          `files` json NULL,
                          `files_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
                          `preview` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
                          `click_count` int NULL DEFAULT 0,
                          `is_public` tinyint NULL DEFAULT NULL,
                          `status` int NULL DEFAULT NULL,
                          PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for project
-- ----------------------------
DROP TABLE IF EXISTS `project`;
CREATE TABLE `project`  (
                            `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
                            `c_time` datetime NULL DEFAULT NULL,
                            `u_time` datetime NULL DEFAULT NULL,
                            `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
                            `owner` varchar(255) NULL DEFAULT NULL,
                            `version` int NOT NULL DEFAULT 1,
                            `files` json NULL,
                            `is_public` tinyint NULL DEFAULT NULL,
                            `status` int NULL DEFAULT NULL,
                            PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for llm chat
-- ----------------------------
DROP TABLE IF EXISTS `llm_chat`;
CREATE TABLE `llm_chat` (
                            `id` varchar(255) NOT NULL ,
                            `current_chat_length` int NOT NULL DEFAULT 1,
                            `c_time` datetime NULL DEFAULT NULL,
                            `messages` json NOT NULL ,
                            `owner` varchar(255) NOT NULL,
                            PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

SET FOREIGN_KEY_CHECKS = 1;
