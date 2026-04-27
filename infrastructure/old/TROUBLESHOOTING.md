# 前端访问故障排除指南

## ✅ 当前状态检查

### 1. 容器状态
```bash
docker ps | grep frontend
```
**预期**: 显示 ai_image_frontend 容器正在运行

### 2. 服务状态
```bash
curl -I http://localhost/
```
**预期**: HTTP/1.1 200 OK

### 3. 日志检查
```bash
docker logs ai_image_frontend --tail 20
```
**预期**: 显示 nginx 正常运行，无错误

## 🚨 常见问题及解决方案

### 问题1: 浏览器显示 "连接被重置" 或 "无法访问"

**可能原因**:
- 端口80被占用
- 防火墙阻止
- Docker网络问题

**解决方案**:
```bash
# 检查端口占用
netstat -tulpn | grep :80

# 检查防火墙
sudo ufw status

# 重启Docker网络
docker network rm infrastructure_app-network
docker-compose -f docker-compose.all.yml down
docker-compose -f docker-compose.all.yml up -d
```

### 问题2: 页面空白或加载失败

**可能原因**:
- JavaScript文件加载失败
- API代理配置问题

**解决方案**:
```bash
# 测试静态资源访问
curl -s "http://localhost/assets/index-BM7bFB9I.js" | head -3

# 检查Nginx配置
docker exec ai_image_frontend cat /etc/nginx/conf.d/default.conf

# 重启前端容器
docker-compose -f docker-compose.all.yml restart frontend
```

### 问题3: API请求失败 (CORS错误)

**可能原因**:
- 后端服务未运行
- 网络连接问题

**解决方案**:
```bash
# 检查后端状态
docker ps | grep backend

# 测试后端API
curl http://localhost:8000/health

# 查看后端日志
docker logs ai_image_backend --tail 20
```

### 问题4: 页面样式异常

**可能原因**:
- CSS文件未加载
- 浏览器缓存

**解决方案**:
```bash
# 强制刷新浏览器 (Ctrl+Shift+R 或 Cmd+Shift+R)

# 清除浏览器缓存

# 测试CSS加载
curl -s "http://localhost/assets/index-z8QMbiEa.css" | head -5
```

## 🔧 诊断命令

### 完整诊断脚本
```bash
#!/bin/bash
echo "=== AI Image Generator Frontend Diagnostics ==="
echo ""

echo "1. Container Status:"
docker ps | grep -E "frontend|backend" || echo "No containers found"

echo ""
echo "2. Frontend Logs (Last 10 lines):"
docker logs ai_image_frontend --tail 10 2>&1

echo ""
echo "3. Backend Health Check:"
curl -s http://localhost:8000/health || echo "Backend not responding"

echo ""
echo "4. Frontend HTTP Check:"
curl -I http://localhost/ 2>&1 | head -5

echo ""
echo "5. Static Asset Check:"
curl -s "http://localhost/assets/index-BM7bFB9I.js" | head -1 || echo "Static assets not accessible"

echo ""
echo "6. Test Page:"
curl -s http://localhost/test.html | head -3
```

## 📞 如果问题仍然存在

1. 运行上述诊断命令
2. 保存所有输出
3. 检查浏览器控制台错误 (F12)
4. 查看完整的容器日志

## 🌐 测试页面

已创建测试页面，可用于验证前端服务:
- **URL**: http://localhost/test.html
- **功能**: 显示服务状态和基本信息

如果测试页面也无法访问，说明有更严重的问题，请检查Docker守护进程状态。
