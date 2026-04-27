## ✅ MySQL数据库初始化完成

### 数据库信息
- **类型**: MySQL 8.0
- **数据库**: ai_image_gen
- **字符集**: utf8mb4

### 已创建9个表
- users
- generations
- admins
- roles
- permissions
- admin_roles
- role_permissions
- subscriptions
- orders
- prompt_templates
- system_configs

### 默认管理员账号
- **用户名**: admin
- **密码**: Admin@123456
- **邮箱**: admin@example.com

### 下一步
```bash
# 启动所有容器
cd /data/ai-image/ai-image-gen/infrastructure
docker-compose up -d

# 访问地址
# 前端: http://localhost
# 管理后台: http://localhost:8001
# API文档: http://localhost:8000/docs
```
