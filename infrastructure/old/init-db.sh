#!/bin/bash

echo "==================================="
echo "  数据库初始化脚本"
echo "==================================="
echo ""

# 检查PostgreSQL是否就绪
echo "1. 检查数据库连接..."
docker exec ai_image_postgres pg_isready -U postgres
if [ $? -eq 0 ]; then
    echo "✅ 数据库连接正常"
else
    echo "❌ 数据库连接失败"
    exit 1
fi

echo ""
echo "2. 创建数据库表..."

# 创建表结构
docker exec ai_image_postgres psql -U postgres -d ai_image_gen << 'EOF'
-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    username VARCHAR NOT NULL UNIQUE,
    hashed_password VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    daily_generation_count INTEGER DEFAULT 0,
    last_generation_date TIMESTAMP WITH TIME ZONE,
    total_generations INTEGER DEFAULT 0
);

-- 创建生成记录表
CREATE TABLE IF NOT EXISTS generations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    prompt TEXT NOT NULL,
    size VARCHAR NOT NULL,
    quality VARCHAR NOT NULL,
    n INTEGER DEFAULT 1,
    status VARCHAR DEFAULT 'pending',
    images JSONB,
    cost_usd FLOAT DEFAULT 0.0,
    provider VARCHAR DEFAULT 'openai',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);

-- 显示表创建结果
SELECT 'Users table created' AS status;
SELECT 'Generations table created' AS status;
EOF

if [ $? -eq 0 ]; then
    echo "✅ 数据库表创建成功"
else
    echo "❌ 数据库表创建失败"
    exit 1
fi

echo ""
echo "3. 创建管理员账号..."

# 创建管理员用户（密码: Admin@123456）
docker exec ai_image_postgres psql -U postgres -d ai_image_gen << 'EOF'
-- 插入管理员用户（密码: Admin@123456）
INSERT INTO users (email, username, hashed_password, is_superuser)
VALUES ('admin@example.com', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYWPMgVvQK3K', true)
ON CONFLICT (email) DO UPDATE SET is_superuser = true;
EOF

if [ $? -eq 0 ]; then
    echo "✅ 管理员账号创建成功"
else
    echo "❌ 管理员账号创建失败（可能已存在）"
fi

echo ""
echo "4. 验证创建..."

docker exec ai_image_postgres psql -U postgres -d ai_image_gen -c "SELECT id, email, username, is_superuser FROM users;"

echo ""
echo "==================================="
echo "  数据库初始化完成！"
echo "==================================="
echo ""
echo "管理员账号信息:"
echo "  邮箱: admin@example.com"
echo "  用户名: admin"
echo "  密码: Admin@123456"
echo ""
echo "⚠️  建议首次登录后立即修改密码"
