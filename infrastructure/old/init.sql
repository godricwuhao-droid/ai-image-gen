-- AI Image Generator Database Initialization Script
-- MySQL 8.0

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS ai_image_gen CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE ai_image_gen;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(64) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    is_superuser TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    daily_generation_count INT DEFAULT 0,
    last_generation_date DATETIME,
    total_generations INT DEFAULT 0,
    INDEX idx_email (email),
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Generations table
CREATE TABLE IF NOT EXISTS generations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    prompt TEXT NOT NULL,
    size VARCHAR(50) NOT NULL,
    quality VARCHAR(50) NOT NULL,
    n INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending',
    images JSON,
    cost_usd FLOAT DEFAULT 0.0,
    provider VARCHAR(50) DEFAULT 'openai',
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    real_name VARCHAR(64),
    status TINYINT(1) DEFAULT 1,
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Admin-Role relationship
CREATE TABLE IF NOT EXISTS admin_roles (
    admin_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (admin_id, role_id),
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(128) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    module VARCHAR(64),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Role-Permission relationship
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan VARCHAR(50) NOT NULL,
    credits INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    subscription_id BIGINT,
    amount FLOAT NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'pending',
    transaction_id VARCHAR(128),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Prompt Templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    category VARCHAR(64),
    prompt TEXT NOT NULL,
    tags JSON,
    usage_count INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    is_public TINYINT(1) DEFAULT 0,
    creator_id BIGINT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- System Configs table
CREATE TABLE IF NOT EXISTS system_configs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(128) NOT NULL UNIQUE,
    config_value TEXT,
    description VARCHAR(512),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert default admin (password: Admin@123456)
INSERT INTO admins (username, password_hash, email, real_name, status)
VALUES ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYWPMgVvQK3K', 'admin@example.com', 'Administrator', 1)
ON DUPLICATE KEY UPDATE username=username;

-- Insert default roles
INSERT INTO roles (name, display_name, description) VALUES
('super_admin', 'Super Administrator', 'Full system access'),
('admin', 'Administrator', 'Admin access'),
('operator', 'Operator', 'Limited admin access');

-- Insert default permissions
INSERT INTO permissions (code, name, module) VALUES
('users:view', 'View Users', 'users'),
('users:edit', 'Edit Users', 'users'),
('users:delete', 'Delete Users', 'users'),
('orders:view', 'View Orders', 'orders'),
('orders:refund', 'Refund Orders', 'orders'),
('credits:manage', 'Manage Credits', 'credits'),
('generations:view', 'View Generations', 'generations'),
('generations:moderate', 'Moderate Generations', 'generations'),
('templates:manage', 'Manage Templates', 'templates'),
('settings:manage', 'Manage Settings', 'settings');

-- Assign all permissions to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
ON DUPLICATE KEY UPDATE role_id=role_id;

-- Assign permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE code IN ('users:view', 'users:edit', 'orders:view', 'orders:refund', 'credits:manage', 'generations:view', 'generations:moderate', 'templates:manage')
ON DUPLICATE KEY UPDATE role_id=role_id;

-- Assign admin role to admin user
INSERT INTO admin_roles (admin_id, role_id)
SELECT id, 1 FROM admins WHERE username='admin'
ON DUPLICATE KEY UPDATE admin_id=admin_id;

-- Insert default system configs
INSERT INTO system_configs (config_key, config_value, description) VALUES
('site_name', 'AI Image Generator', 'Site name'),
('free_credits', '10', 'Free tier daily credits'),
('basic_plan_price', '29', 'Basic plan monthly price'),
('pro_plan_price', '99', 'Pro plan monthly price'),
('openai_enabled', 'true', 'Enable OpenAI provider'),
('openai_api_key', '', 'OpenAI API Key'),
('minio_endpoint', 'http://minio:9000', 'MinIO endpoint'),
('minio_bucket', 'ai-images', 'MinIO bucket name');

-- Insert default test user (password: Test@123456)
INSERT INTO users (email, username, hashed_password, credits, is_active)
VALUES ('test@example.com', 'testuser', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYWPMgVvQK3K', 100, 1)
ON DUPLICATE KEY UPDATE email=email;

SELECT 'Database initialization completed successfully!' AS status;
