# AI Image Generator - 数据库初始化完成

## ✅ MySQL数据库初始化完成

### 📊 数据库信息

- **数据库类型**: MySQL 8.0
- **数据库名**: ai_image_gen
- **字符集**: utf8mb4
- **排序规则**: utf8mb4_general_ci

### 📋 已创建的表

| 表名 | 说明 | 记录数 |
|------|------|--------|
| users | 用户表 | 0 |
| generations | 图像生成记录表 | 0 |
| admins | 管理员表 | 1 |
| roles | 角色表 | 3 |
| permissions | 权限表 | 10 |
| admin_roles | 管理员-角色关联表 | 1 |
| role_permissions | 角色-权限关联表 | 8 |
| subscriptions | 订阅表 | 0 |
| orders | 订单表 | 0 |
| prompt_templates | Prompt模板表 | 0 |
| system_configs | 系统配置表 | 8 |

### 🔐 默认账号

#### MySQL数据库账号
- **Root用户**: root / root_password
- **应用用户**: ai_image_user / dev_password

#### 管理后台账号
- **用户名**: admin
- **邮箱**: admin@example.com
- **密码**: Admin@123456
- **角色**: Super Administrator

### 🚀 下一步

1. 启动所有容器
```bash
cd /data/ai-image/ai-image-gen/infrastructure
docker-compose up -d
```

2. 访问服务
- 前端: http://localhost
- 管理后台: http://localhost:8001
- API文档: http://localhost:8000/docs

### ⚠️ 注意事项

1. **密码安全**: 生产环境务必修改默认密码
2. **API Key**: 需要配置OpenAI API Key才能使用图像生成功能
3. **网络配置**: 确保Docker网络配置正确
4. **数据备份**: 定期备份MySQL数据

### 📞 支持

如有问题，请查看：
- Docker日志: `docker logs ai_image_mysql`
- 初始化日志: `/data/ai-image/ai-image-gen/infrastructure/init.sql`
- 项目文档: `/data/ai-image/ai-image-gen/README.md`
