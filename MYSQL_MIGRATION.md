# AI Image Generator - MySQL版本调整总结

## ✅ 已完成调整

### 1. 数据库变更
- **PostgreSQL → MySQL 8.0**
- 依赖更新：`asyncpg` → `aiomysql` + `pymysql`

### 2. ORM模型更新
- 所有表使用 `BigInteger` 替代 `Integer`（MySQL规范）
- 所有表使用 `server_default=func.now()` 替代PostgreSQL特有语法
- 支持UTF8MB4编码

### 3. 新增管理后台表结构
- `admins` - 管理员表
- `roles` - 角色表
- `permissions` - 权限表
- `admin_roles` - 管理员-角色关联表
- `role_permissions` - 角色-权限关联表
- `subscriptions` - 订阅表
- `orders` - 订单表
- `prompt_templates` - Prompt模板表
- `system_configs` - 系统配置表

### 4. 管理后台前端（Ant Design Pro）
- Dashboard数据看板
- 用户管理
- 订单管理
- 额度管理
- 内容审核
- Prompt模板管理
- 系统配置

### 5. Docker Compose配置
- MySQL 8.0容器配置
- 管理后台容器配置
- 环境变量更新

## 📁 项目结构

```
ai-image-gen/
├── frontend/          # 用户前端 (React)
├── admin/             # 管理后台 (Ant Design Pro) [新增]
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
├── backend/          # FastAPI后端
│   └── app/
│       └── models/    # [已更新为MySQL]
├── infrastructure/
│   └── docker-compose.yml  # [已更新为MySQL]
└── README.md
```

## 🚀 启动MySQL版本

### 1. 启动基础设施
```bash
cd /data/ai-image/ai-image-gen/infrastructure
docker-compose up -d
```

### 2. 等待MySQL就绪
```bash
# 等待MySQL健康检查通过
docker ps | grep mysql
```

### 3. 初始化数据库
```bash
# 创建数据库和表
docker exec -i ai_image_mysql mysql -uroot -proot_password < init.sql
```

### 4. 访问地址
- 用户前端: http://localhost
- 管理后台: http://localhost:8001
- API文档: http://localhost:8000/docs

## ⚠️ 注意事项

1. **MySQL连接字符串格式**：
   ```
   mysql+aiomysql://user:password@host:3306/database?charset=utf8mb4
   ```

2. **Docker网络**：所有容器使用 `app-network` 网络互通

3. **依赖安装**：确保 `aiomysql` 和 `pymysql` 已安装

## 📝 待完成

- [ ] 初始化SQL脚本（建表语句）
- [ ] 管理后台管理员账号创建
- [ ] 前端API集成
- [ ] 完整测试验证

## 🔧 管理命令

```bash
# 查看MySQL容器
docker ps | grep mysql

# 连接MySQL
docker exec -it ai_image_mysql mysql -uroot -proot_password

# 查看日志
docker logs ai_image_mysql
```
