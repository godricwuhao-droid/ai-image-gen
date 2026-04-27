# 用户账号说明

## 默认服务账号

### 1. MinIO 对象存储
- **用户名**: `minioadmin`
- **密码**: `minioadmin`
- **控制台地址**: http://localhost:9001

### 2. PostgreSQL 数据库
- **用户名**: `postgres`
- **密码**: `dev_password`
- **数据库名**: `ai_image_gen`
- **端口**: `5432`

### 3. Redis 缓存
- **端口**: `6379`
- **无需认证**

## 应用用户账号

### 创建管理员账号

由于系统没有预设的管理员账号，您需要：

#### 方法1: 通过Web界面注册

1. 访问 http://localhost
2. 点击"Sign Up"或"注册"
3. 填写邮箱、用户名、密码
4. 完成注册

#### 方法2: 通过API创建管理员

如果您需要创建具有管理员权限的账号，可以：

1. 先通过API注册普通用户
2. 然后手动升级为管理员

```bash
# 1. 注册普通用户
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "username": "admin",
    "password": "YourSecurePassword123!"
  }'

# 2. 获取Token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "YourSecurePassword123!"
  }'

# 3. 将用户升级为管理员（需要直接修改数据库）
docker exec -it ai_image_postgres psql -U postgres -d ai_image_gen -c \
  "UPDATE users SET is_superuser = true WHERE email = 'admin@example.com';"
```

## 推荐的初始设置步骤

### 1. 注册第一个管理员账号
访问 http://localhost/register 创建管理员账号

### 2. 验证账号
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-admin@example.com",
    "password": "your-password"
  }'
```

### 3. 检查账号信息
```bash
# 假设你获取到了token
TOKEN="your-token-here"
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## 安全建议

⚠️ **重要安全提醒**:
- ⚠️ 生产环境务必修改默认密码
- ⚠️ 使用强密码（包含大小写字母、数字、特殊字符）
- ⚠️ 不要在生产环境使用 `dev_password`
- ⚠️ 定期更换密码
- ⚠️ 保护好API Key和数据库密码

## 测试账号（仅供开发测试）

如果您只是想快速测试系统，可以使用以下测试命令创建一个测试账号：

```bash
# 创建测试账号
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "username": "testuser",
    "password": "test123456"
  }'
```

**注意**: 这个测试账号不具备管理员权限，仅用于功能测试。
