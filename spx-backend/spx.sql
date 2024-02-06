/*
 Navicat Premium Data Transfer

 Source Server         : ali
 Source Server Type    : MySQL
 Source Server Version : 80300
 Source Host           : 116.62.66.126:3307
 Source Schema         : spx

 Target Server Type    : MySQL
 Target Server Version : 80300
 File Encoding         : 65001

 Date: 06/02/2024 14:40:20
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for asset
-- ----------------------------
DROP TABLE IF EXISTS `asset`;
CREATE TABLE `asset`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `author_id` int NULL DEFAULT NULL,
  `category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `is_public` tinyint NULL DEFAULT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `asset_type` int NULL DEFAULT NULL,
  `status` int NULL DEFAULT NULL,
  `c_time` datetime NULL DEFAULT NULL,
  `u_time` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 16 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '资源表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for codefile
-- ----------------------------
DROP TABLE IF EXISTS `codefile`;
CREATE TABLE `codefile`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `author_id` int NULL DEFAULT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `is_public` tinyint NULL DEFAULT NULL,
  `status` int NULL DEFAULT NULL,
  `c_time` datetime NULL DEFAULT NULL,
  `u_time` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

SET FOREIGN_KEY_CHECKS = 1;
