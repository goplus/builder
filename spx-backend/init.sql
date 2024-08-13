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

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE user_asset (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            owner VARCHAR(255) NULL DEFAULT NULL,
                            asset_id INT NOT NULL,
                            relation_type ENUM('liked', 'history', 'imported') NOT NULL,
                            relation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP() NULL,
                            UNIQUE KEY unique_relation (owner, asset_id, relation_type),
                            CONSTRAINT user_ibfk_1
                                FOREIGN KEY (asset_id) REFERENCES asset(id) ON DELETE CASCADE
);

CREATE INDEX asset_id_index
    ON user_asset (asset_id);



