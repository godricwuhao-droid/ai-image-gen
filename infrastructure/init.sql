-- ============================================
-- AI Image Generator - 数据库初始化 SQL
-- 数据库: ai_image_gen
-- 引擎: MySQL 8.0
-- 字符集: utf8mb4
-- ============================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `ai_image_gen` 
    DEFAULT CHARACTER SET utf8mb4 
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE `ai_image_gen`;

-- ============================================
-- 1. 用户表
-- ============================================
CREATE TABLE `users` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL,
    `username` VARCHAR(64) NOT NULL,
    `hashed_password` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `is_superuser` BOOLEAN DEFAULT FALSE,
    `credits` INT DEFAULT 0,
    `daily_generation_count` INT DEFAULT 0,
    `last_generation_date` DATETIME DEFAULT NULL,
    `total_generations` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_email` (`email`),
    UNIQUE KEY `uk_username` (`username`),
    INDEX `idx_email` (`email`),
    INDEX `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. 管理员相关表
-- ============================================
CREATE TABLE `admins` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(64) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) DEFAULT NULL,
    `real_name` VARCHAR(64) DEFAULT NULL,
    `status` BOOLEAN DEFAULT TRUE,
    `last_login_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(64) NOT NULL,
    `display_name` VARCHAR(128) NOT NULL,
    `description` VARCHAR(512) DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `permissions` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(128) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `module` VARCHAR(64) DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `admin_roles` (
    `admin_id` BIGINT NOT NULL,
    `role_id` BIGINT NOT NULL,
    PRIMARY KEY (`admin_id`, `role_id`),
    FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_permissions` (
    `role_id` BIGINT NOT NULL,
    `permission_id` BIGINT NOT NULL,
    PRIMARY KEY (`role_id`, `permission_id`),
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. 图片生成记录表
-- ============================================
CREATE TABLE `generations` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `prompt` TEXT NOT NULL,
    `size` VARCHAR(50) NOT NULL,
    `quality` VARCHAR(50) NOT NULL,
    `n` INT DEFAULT 1,
    `status` VARCHAR(50) DEFAULT 'pending',
    `images` JSON DEFAULT NULL,
    `cost_usd` FLOAT DEFAULT 0.0,
    `credits_cost` INT DEFAULT 0,
    `provider` VARCHAR(50) DEFAULT 'openai',
    `error_message` TEXT DEFAULT NULL,
    `is_public` BOOLEAN DEFAULT FALSE,
    `refunded` BOOLEAN DEFAULT FALSE,
    `likes_count` INT DEFAULT 0,
    `views_count` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. 积分交易记录表
-- ============================================
CREATE TABLE `credit_transactions` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `amount` INT NOT NULL,
    `balance_after` INT NOT NULL,
    `transaction_type` VARCHAR(50) NOT NULL,
    `reference_type` VARCHAR(50) DEFAULT NULL,
    `reference_id` BIGINT DEFAULT NULL,
    `description` TEXT DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_transaction_type` (`transaction_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. 收藏和点赞表
-- ============================================
CREATE TABLE `favorites` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `generation_id` BIGINT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_generation_id` (`generation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `likes` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `generation_id` BIGINT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_generation_id` (`generation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `like_records` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `generation_id` BIGINT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`),
    UNIQUE KEY `unique_user_generation_like` (`user_id`, `generation_id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_generation_id` (`generation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. 模板表
-- ============================================
CREATE TABLE `templates` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT DEFAULT NULL,
    `name` VARCHAR(100) NOT NULL,
    `prompt` TEXT NOT NULL,
    `category` VARCHAR(50) DEFAULT 'general',
    `description` TEXT DEFAULT NULL,
    `is_public` BOOLEAN DEFAULT FALSE,
    `usage_count` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_category` (`category`),
    INDEX `idx_is_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `prompt_templates` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(128) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `category` VARCHAR(64) DEFAULT NULL,
    `prompt` TEXT NOT NULL,
    `tags` JSON DEFAULT NULL,
    `usage_count` INT DEFAULT 0,
    `is_active` BOOLEAN DEFAULT TRUE,
    `is_public` BOOLEAN DEFAULT FALSE,
    `creator_id` BIGINT DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. 系统配置表
-- ============================================
CREATE TABLE `system_configs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(128) NOT NULL,
    `value` TEXT DEFAULT NULL,
    `description` VARCHAR(512) DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. 套餐和订单表
-- ============================================
CREATE TABLE `packages` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `credits` INT NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `description` VARCHAR(500) DEFAULT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subscriptions` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `plan` VARCHAR(50) NOT NULL,
    `credits` INT DEFAULT 0,
    `status` VARCHAR(50) DEFAULT 'active',
    `start_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `end_date` DATETIME DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `orders` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `subscription_id` BIGINT DEFAULT NULL,
    `package_id` BIGINT DEFAULT NULL,
    `amount` FLOAT NOT NULL,
    `credits` INT DEFAULT 0,
    `payment_method` VARCHAR(50) DEFAULT NULL,
    `payment_status` VARCHAR(50) DEFAULT 'pending',
    `transaction_id` VARCHAR(128) DEFAULT NULL,
    `stripe_session_id` VARCHAR(255) DEFAULT NULL,
    `stripe_payment_intent_id` VARCHAR(255) DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_payment_status` (`payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 初始化数据
-- ============================================

-- 1. 初始化角色
INSERT INTO `roles` (`name`, `display_name`, `description`) VALUES
('super_admin', '超级管理员', '拥有所有权限的超级管理员'),
('admin', '管理员', '普通管理员'),
('moderator', '审核员', '内容审核人员');

-- 2. 初始化权限
INSERT INTO `permissions` (`code`, `name`, `module`) VALUES
('user:list', '用户列表', '用户管理'),
('user:edit', '编辑用户', '用户管理'),
('user:delete', '删除用户', '用户管理'),
('generation:list', '生成记录列表', '生成管理'),
('generation:edit', '编辑生成记录', '生成管理'),
('generation:delete', '删除生成记录', '生成管理'),
('generation:refund', '退款', '生成管理'),
('template:list', '模板列表', '模板管理'),
('template:edit', '编辑模板', '模板管理'),
('template:delete', '删除模板', '模板管理'),
('config:view', '查看配置', '系统配置'),
('config:edit', '编辑配置', '系统配置'),
('order:list', '订单列表', '订单管理'),
('credit:manage', '积分管理', '积分管理');

-- 3. 超级管理员拥有所有权限
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r, `permissions` p WHERE r.name = 'super_admin';

-- 4. 管理员拥有部分权限
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r, `permissions` p 
WHERE r.name = 'admin' AND p.code IN ('user:list', 'user:edit', 'generation:list', 'generation:edit', 'template:list', 'template:edit', 'config:view', 'order:list');

-- 5. 创建默认管理员账号 (密码: admin123，生产环境请立即修改密码)
-- 注意：登录接口实际查 users 表，不是 admins 表
INSERT INTO `users` (`email`, `username`, `hashed_password`, `is_active`, `is_superuser`, `credits`) 
VALUES ('admin@example.com', 'admin', '$2b$12$SHtwW/4K1SYRvhGG3bul3enDv2VyCqPZvv42BUWnwiwvH2pK/f6AS', TRUE, TRUE, 0);

-- 6. 给默认管理员分配超级管理员角色 (admins 表用于 RBAC 权限管理)
INSERT INTO `admins` (`username`, `password_hash`, `email`, `real_name`, `status`) VALUES
('admin', '$2b$12$SHtwW/4K1SYRvhGG3bul3enDv2VyCqPZvv42BUWnwiwvH2pK/f6AS', 'admin@example.com', '系统管理员', TRUE);

-- 7. 给默认管理员分配超级管理员角色
INSERT INTO `admin_roles` (`admin_id`, `role_id`)
SELECT a.id, r.id FROM `admins` a, `roles` r WHERE a.username = 'admin' AND r.name = 'super_admin';

-- 8. 初始化系统配置
INSERT INTO `system_configs` (`key`, `value`, `description`) VALUES
('site_name', 'AI Image Generator', '站点名称'),
('default_size', '1024x1024', '默认图片尺寸'),
('default_quality', 'low', '默认图片质量'),
('default_n', '1', '默认生成数量'),
('daily_free_generations', '1', '每日免费生成次数'),
('max_prompt_length', '4000', '最大Prompt长度'),
('openai_api_key', '', 'OpenAI API Key'),
('relay_api_key', '', 'Relay API Key'),
('relay_api_base_url', 'https://api.jiekou.ai/v3', 'Relay API Base URL'),
-- 价格配置 - low质量
('price_low_1024x1024', '0.0060', '价格: low质量 1024x1024 (USD)'),
('price_low_1024x1536', '0.0050', '价格: low质量 1024x1536 (USD)'),
('price_low_1536x1024', '0.0050', '价格: low质量 1536x1024 (USD)'),
('price_low_2048x2048', '0.0119', '价格: low质量 2048x2048 (USD)'),
('price_low_2048x1152', '0.0047', '价格: low质量 2048x1152 (USD)'),
('price_low_3840x2160', '0.0111', '价格: low质量 3840x2160 (USD)'),
('price_low_2160x3840', '0.0111', '价格: low质量 2160x3840 (USD)'),
-- 价格配置 - medium质量
('price_medium_1024x1024', '0.0530', '价格: medium质量 1024x1024 (USD)'),
('price_medium_1024x1536', '0.0410', '价格: medium质量 1024x1536 (USD)'),
('price_medium_1536x1024', '0.0410', '价格: medium质量 1536x1024 (USD)'),
('price_medium_2048x2048', '0.1070', '价格: medium质量 2048x2048 (USD)'),
('price_medium_2048x1152', '0.0424', '价格: medium质量 2048x1152 (USD)'),
('price_medium_3840x2160', '0.1001', '价格: medium质量 3840x2160 (USD)'),
('price_medium_2160x3840', '0.1001', '价格: medium质量 2160x3840 (USD)'),
-- 价格配置 - high质量
('price_high_1024x1024', '0.2110', '价格: high质量 1024x1024 (USD)'),
('price_high_1024x1536', '0.1650', '价格: high质量 1024x1536 (USD)'),
('price_high_1536x1024', '0.1650', '价格: high质量 1536x1024 (USD)'),
('price_high_2048x2048', '0.4282', '价格: high质量 2048x2048 (USD)'),
('price_high_2048x1152', '0.1695', '价格: high质量 2048x1152 (USD)'),
('price_high_3840x2160', '0.4003', '价格: high质量 3840x2160 (USD)'),
('price_high_2160x3840', '0.4003', '价格: high质量 2160x3840 (USD)'),
-- 积分消耗配置 - low质量
('credits_low_1024x1024', '2', '积分: low质量 1024x1024'),
('credits_low_1024x1536', '2', '积分: low质量 1024x1536'),
('credits_low_1536x1024', '2', '积分: low质量 1536x1024'),
('credits_low_2048x2048', '4', '积分: low质量 2048x2048'),
('credits_low_2048x1152', '2', '积分: low质量 2048x1152'),
('credits_low_3840x2160', '2', '积分: low质量 3840x2160'),
('credits_low_2160x3840', '2', '积分: low质量 2160x3840'),
-- 积分消耗配置 - medium质量
('credits_medium_1024x1024', '10', '积分: medium质量 1024x1024'),
('credits_medium_1024x1536', '8', '积分: medium质量 1024x1536'),
('credits_medium_1536x1024', '8', '积分: medium质量 1536x1024'),
('credits_medium_2048x2048', '20', '积分: medium质量 2048x2048'),
('credits_medium_2048x1152', '8', '积分: medium质量 2048x1152'),
('credits_medium_3840x2160', '19', '积分: medium质量 3840x2160'),
('credits_medium_2160x3840', '19', '积分: medium质量 2160x3840'),
-- 积分消耗配置 - high质量
('credits_high_1024x1024', '40', '积分: high质量 1024x1024'),
('credits_high_1024x1536', '32', '积分: high质量 1024x1536'),
('credits_high_1536x1024', '32', '积分: high质量 1536x1024'),
('credits_high_2048x2048', '81', '积分: high质量 2048x2048'),
('credits_high_2048x1152', '32', '积分: high质量 2048x1152'),
('credits_high_3840x2160', '76', '积分: high质量 3840x2160'),
('credits_high_2160x3840', '76', '积分: high质量 2160x3840');

-- ============================================
-- 完成提示
-- ============================================
SELECT '数据库初始化完成！' AS message;
