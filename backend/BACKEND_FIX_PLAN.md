# Backend 代码审查与修复方案

## 审查概要

| 项目 | 说明 |
|------|------|
| 审查文件 | `/data/ai-image/ai-image-gen/backend/` |
| 容器编排 | `/data/ai-image/ai-image-gen/infrastructure/docker-compose.yml` |
| 前端对应 | `/data/ai-image/ai-image-gen/frontend/` |
| 审查时间 | 2026-05-01 |

---

## 一、已修复的问题 ✅

### 1. 图片编辑支持多张图片上传 ✅

**修改文件**:
- `app/api/v1/endpoints/image/image_edit.py`
- `app/services/provider/image_edit_provider.py`

**修改内容**:

| 位置 | 修改前 | 修改后 |
|------|--------|--------|
| image_edit.py | `image: UploadFile = File(...)` | `image: List[UploadFile] = File(...)` |
| image_edit.py | `calculate_credits_cost(quality, n)` | `calculate_credits_cost(quality, size, n)` |
| image_edit.py | `self.image_url = image_base64` | `self.image_url = images_base64` |
| image_edit_provider.py | 只支持 str | 支持 list 或 str |

---

### 2. 积分计算修复 ✅

**修改**: `calculate_credits_cost(quality, size, n)` - 添加 size 参数

---

### 3. SSE 事件 Key 不一致 ✅

**修改文件**: `app/api/v1/endpoints/system/events.py`

**修改内容**:
- 解析 token 获取真实 user_id
- event_key 使用正确的 `user_id_generation_id` 格式

```python
user_id = 0
if token:
    try:
        from ....core.security import decode_access_token
        payload = decode_access_token(token)
        if payload:
            user_id = int(payload.get("sub", 0))
    except Exception:
        pass
```

---

### 4. Celery 任务冲突 ✅

**修改文件**:
- `app/tasks/celery_app.py`
- `app/api/v1/endpoints/image/image_to_image.py`

**修改内容**:
- `celery_app.py`: `autodiscover_tasks(["app.api.v1.endpoints.image"])` → `autodiscover_tasks(["app.tasks"])`
- `image_to_image.py`: 路由前缀 `/image-edit` → `/image-to-image` (避免冲突)
- 修正 import 路径: `app.api.v1.endpoints.events` → `app.api.v1.endpoints.system.events`

---

### 5. MinIO 静默失败 ✅

**修改文件**: `app/tasks/generate_image.py`, `app/api/v1/endpoints/image/image_edit.py`

**修改内容**:
- `upload_from_url` 返回类型改为 `tuple[str, bool]`
- 记录上传失败计数
- 失败时记录详细日志

---

## 二、问题优先级

| 优先级 | 问题 | 状态 |
|--------|------|------|
| P0 | 多图片上传支持 | ✅ 已修复 |
| P0 | 积分计算 | ✅ 已修复 |
| P1 | SSE Key 不一致 | ✅ 已修复 |
| P2 | Celery 任务冲突 | ✅ 已修复 |
| P2 | MinIO 静默失败 | ✅ 已修复 |
| P3 | Provider 重复 | 已记录（不影响功能） |

---

## 三、前端实际使用情况

| 功能 | 前端入口 | 后端端点 | 状态 |
|------|---------|---------|------|
| 文生图 | HomePage.tsx (无图片) | `POST /api/v1/generations` | ✅ 正常 |
| 图生图(编辑) | HomePage.tsx (上传图片) | `POST /api/v1/image-edit/upload` | ✅ 已修复 |
| 图生图(新功能) | ImageToImagePage.tsx | `/api/v1/image-to-image` | 🔧 未启用 |

---

## 四、Docker Compose 配置

当前配置无需修改，`celery-worker` 和 `backend` 使用相同的 Dockerfile。

**可选建议** - 添加 Worker 健康检查:
```yaml
celery-worker:
  healthcheck:
    test: ["CMD", "celery", "-A", "app.tasks.celery_app", "inspect", "health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

---

## 五、修改文件汇总

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `app/api/v1/endpoints/image/image_edit.py` | 修改 | 多图片支持、积分计算 |
| `app/services/provider/image_edit_provider.py` | 修改 | 支持 list 格式 |
| `app/api/v1/endpoints/system/events.py` | 修改 | SSE Key 修正 |
| `app/tasks/celery_app.py` | 修改 | autodiscover_tasks 修正 |
| `app/api/v1/endpoints/image/image_to_image.py` | 修改 | 路由前缀修正 |
| `app/tasks/generate_image.py` | 修改 | MinIO 错误处理 |

---

## 六、验证建议

修复后请验证:
1. 上传单张图片 - 正常编辑
2. 上传多张图片 (2-10张) - 每张都应被处理
3. 不同尺寸的积分计算是否正确
4. SSE 通知是否正确送达前端
5. MinIO 上传失败时是否有正确日志记录