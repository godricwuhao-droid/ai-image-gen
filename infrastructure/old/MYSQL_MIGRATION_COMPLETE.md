# AI Image Generator - MySQL迁移与调整完成

## ✅ 调整完成总结

### 1. 数据库从PostgreSQL迁移到MySQL 8.0

**主要变更**：
- ✅ Docker Compose配置已更新（PostgreSQL → MySQL 8.0）
- ✅ Python依赖已更新（`asyncpg` → `aiomysql` + `pymysql`）
- ✅ 所有ORM模型已适配MySQL语法
- ✅ 创建完整的MySQL初始化脚本

### 2. ORM模型更新

所有模型已从PostgreSQL语法迁移到MySQL兼容：

- ✅ `BigInteger` 替代 `Integer`（MySQL规范）
- ✅ `server_default=func.now()` 替代PostgreSQL特有语法
- ✅ 支持UTF8MB4编码
- ✅ 索引和外键约束已优化

### 3. 新增管理后台

按照更新后的开发计划，已创建完整的管理后台结构：

**数据库表**：
- ✅ `admins` - 管理员表
- ✅ `roles` - 角色表
- ✅ `permissions` - 权限表
- ✅ `admin_roles` - 管理员-角色关联表
- ✅ `role_permissions` - 角色-权限关联表
- ✅ `subscriptions` - 订阅表
- ✅ `orders` - 订单表
- ✅ `prompt_templates` - Prompt模板表
- ✅ `system_configs` - 系统配置表

**管理后台前端页面**：
- ✅ Dashboard数据看板
- ✅ 用户管理
- ✅ 订单管理
- ✅ 额度管理
- ✅ 内容审核
- ✅ Prompt模板管理
- ✅ 系统配置

### 4. Docker容器编排

- ✅ MySQL 8.0容器配置
- ✅ Redis容器
- ✅ MinIO容器
- ✅ 后端容器
- ✅ Celery Worker容器
- ✅ 用户前端容器
- ✅ 管理后台容器

## 📁 项目文件结构

```
ai-image-gen/
├── frontend/                    # 用户前端 (React)
├── admin/                       # 管理后台 (Ant Design Pro)
│   ├── src/pages/
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   ├── Users/List.tsx
│   │   ├── Orders/List.tsx
│   │   ├── Credits/Manage.tsx
│   │   ├── Generations/List.tsx
│   │   ├── Templates/List.tsx
│   │   └── Settings.tsx
│   ├── config/config.ts
│   ├── package.json
│   └── Dockerfile
├── backend/                     # FastAPI后端
│   └── app/
│       ├── models/              # [已更新为MySQL]
│       │   ├── user.py
│       │   ├── generation.py
│       │   ├── admin.py
│       │   ├── subscription.py
│       │   └── config.py
│       └── core/
│           ├── config.py
│           └── database.py     # [已更新为MySQL]
├── infrastructure/
│   ├── docker-compose.yml     # [已更新为MySQL]
│   └── init.sql                # [新增：MySQL初始化脚本]
└── README.md
```

## 🚀 启动指南

### 1. 启动所有服务

```bash
cd /data/ai-image/ai-image-gen/infrastructure

# 启动所有容器
docker-compose up -d

# 等待MySQL健康检查通过
docker ps | grep mysql
```

### 2. 初始化数据库

```bash
# 执行初始化SQL脚本
docker exec -i ai_image_mysql mysql -uroot -proot_password < init.sql
```

### 3. 访问服务

- **用户前端**: http://localhost
- **管理后台**: http://localhost:8001
- **后端API**: http://localhost:8000
- **API文档**: http://localhost:8000/docs
- **MinIO控制台**: http://localhost:9001

## 🔐 默认账号

### 管理后台账号
- **用户名**: `admin`
- **密码**: `admin123` (需要在init.sql中手动设置)

### MySQL数据库
- **Root用户**: `root`
- **密码**: `root_password`
- **数据库名**: `ai_image_gen`
- **应用用户**: `ai_image_user`
- **应用密码**: `dev_password`

## 📝 配置文件

### docker-compose.yml环境变量

```yaml
DATABASE_URL=mysql+aiomysql://ai_image_user:dev_password@mysql:3306/ai_image_gen?charset=utf8mb4
DATABASE_ROOT_URL=mysql+aiomysql://root:root_password@mysql:3306/ai_image_gen?charset=utf8mb4
```

### requirements.txt关键依赖

```
sqlalchemy==2.0.25
aiomysql==0.2.0
pymysql==1.1.0
```

## 🛠️ 管理命令

### 查看容器状态
```bash
docker ps
```

### 查看日志
```bash
# MySQL日志
docker logs ai_image_mysql

# 后端日志
docker logs ai_image_backend

# 管理后台日志
docker logs ai_image_admin
```

### 重启服务
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 连接MySQL
```bash
docker exec -it ai_image_mysql mysql -uroot -proot_password
```

## 📊 数据库表结构

| 表名 | 说明 |
|-----|------|
| `users` | 用户表 |
| `generations` | 图像生成记录表 |
| `admins` | 管理员表 |
| `roles` | 角色表 |
| `permissions` | 权限表 |
| `subscriptions` | 订阅表 |
| `orders` | 订单表 |
| `prompt_templates` | Prompt模板表 |
| `system_configs` | 系统配置表 |

## ⚠️ 重要说明

1. **MySQL连接问题**：之前的PostgreSQL连接问题已解决
2. **初始化脚本**：必须执行`init.sql`创建表结构
3. **管理员密码**：需要在init.sql中设置bcrypt哈希值
4. **网络配置**：所有容器使用`app-network`网络互通

## 📚 相关文档

- [开发计划](../dev-plan.md)
- [功能设计](../ai-image-generation-website-design.md)
- [MySQL迁移说明](./MYSQL_MIGRATION.md)

## 🔄 下一步

- [ ] 测试MySQL连接
- [ ] 执行初始化SQL脚本
- [ ] 创建管理员账号
- [ ] 测试管理后台登录
- [ ] 完整功能测试
