#!/bin/bash

echo "==================================="
echo "  AI Image Generator - 用户创建脚本"
echo "==================================="
echo ""

# 检查参数
if [ "$#" -ne 3 ]; then
    echo "用法: $0 <邮箱> <用户名> <密码>"
    echo ""
    echo "示例:"
    echo "  $0 admin@example.com adminuser SecurePass123!"
    echo ""
    echo "提示: 创建管理员账号后，需要手动修改数据库:"
    echo "  docker exec -it ai_image_postgres psql -U postgres -d ai_image_gen -c \"UPDATE users SET is_superuser = true WHERE email = '<邮箱>';\""
    exit 1
fi

EMAIL=$1
USERNAME=$2
PASSWORD=$3

echo "正在创建用户..."
echo "邮箱: $EMAIL"
echo "用户名: $USERNAME"
echo ""

# 创建用户
RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"username\": \"$USERNAME\",
    \"password\": \"$PASSWORD\"
  }")

echo "服务器响应:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# 检查是否成功
if echo "$RESPONSE" | grep -q "id"; then
    echo ""
    echo "✅ 用户创建成功！"
    echo ""
    echo "登录信息:"
    echo "  邮箱: $EMAIL"
    echo "  密码: $PASSWORD"
    echo ""
    echo "提示: 该用户目前是普通用户，如需管理员权限，执行:"
    echo "  docker exec -it ai_image_postgres psql -U postgres -d ai_image_gen -c \"UPDATE users SET is_superuser = true WHERE email = '$EMAIL';\""
else
    echo ""
    echo "❌ 用户创建失败，可能邮箱或用户名已存在"
fi
