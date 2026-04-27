# Docker 部署最佳实践

**创建时间**: 2026-04-26  
**更新时间**: 2026-04-26  
**状态**: ✅ 已解决

---

## 一、问题现象

### 1.1 核心问题

代码更新后页面显示旧功能，清理缓存重新构建后问题仍存在

### 1.2 根本原因

Docker 构建缓存层级：
```
本地构建缓存 → Docker BuildKit 缓存 → 镜像层缓存 → 容器复用
```

**关键发现**：即使执行 `docker-compose up -d --build`，仍可能使用缓存的构建层级

### 1.3 彻底清理方案

```bash
# 停止容器
docker stop ai_image_frontend

# 删除容器
docker rm ai_image_frontend

# 删除旧镜像
docker rmi infrastructure-frontend:latest

# 清理所有构建缓存（清理 22GB+）
docker builder prune -af
docker image prune -af
docker system prune -af

# 重新构建（无缓存）
cd /data/ai-image/ai-image-gen/frontend
npm run build

# 部署
docker-compose -f /data/ai-image/ai-image-gen/infrastructure/docker-compose.yml up -d frontend
```

---

## 二、快速部署命令

### 2.1 标准部署流程

```bash
# 1. 停止旧容器
docker stop ai_image_frontend 2>/dev/null
docker rm ai_image_frontend 2>/dev/null

# 2. 清理构建缓存
docker builder prune -af 2>/dev/null

# 3. 重新构建
cd /data/ai-image/ai-image-gen/frontend
npm run build

# 4. 部署
cd /data/ai-image/ai-image-gen/infrastructure
docker-compose up -d frontend
```

### 2.2 验证部署

```bash
# 检查中文内容
docker exec ai_image_frontend sh -c 'grep -o "人像" /usr/share/nginx/html/assets/*.js | head -1'
docker exec ai_image_frontend sh -c 'grep -o "风景" /usr/share/nginx/html/assets/*.js | head -1'
docker exec ai_image_frontend sh -c 'grep -o "Prompt 模板库" /usr/share/nginx/html/assets/*.js | head -1'
```

---

## 三、一键部署脚本

```bash
#!/bin/bash
# deploy.sh - 前端部署脚本

set -e

cd /data/ai-image/ai-image-gen

echo "停止旧容器..."
docker stop ai_image_frontend 2>/dev/null || true
docker rm ai_image_frontend 2>/dev/null || true

echo "清理构建缓存..."
docker builder prune -af 2>/dev/null || true
docker image prune -af 2>/dev/null || true

echo "构建前端..."
cd frontend && npm run build

echo "部署..."
docker-compose -f infrastructure/docker-compose.yml up -d frontend

echo "验证..."
sleep 2
docker exec ai_image_frontend sh -c 'grep -q "风景" /usr/share/nginx/html/assets/*.js && echo "✅ 部署成功" || echo "❌ 部署失败"
```

---

## 四、关键命令速查

| 操作 | 命令 |
|------|-------|
| 停止容器 | `docker stop ai_image_frontend` |
| 删除容器 | `docker rm ai_image_frontend` |
| 清理缓存 | `docker builder prune -af` |
| 重新构建 | `npm run build && docker-compose up -d frontend` |
| 验证中文 | `docker exec ai_image_frontend sh -c 'grep "风景" /usr/share/nginx/html/assets/*.js` |

---

*文档版本: 1.1*  
*最后更新: 2026-04-26*
