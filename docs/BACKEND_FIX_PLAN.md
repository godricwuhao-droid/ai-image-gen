# Backend 代码审查与修复方案

## 审查概要

| 项目 | 说明 |
|------|------|
| 审查文件 | `/data/ai-image/ai-image-gen/backend/` |
| 容器编排 | `/data/ai-image/ai-image-gen/infrastructure/docker-compose.yml` |
| 审查时间 | 2026-05-01 |

---

## 一、问题清单

### 1. Celery 任务定义冲突 [严重]

**文件位置**:
- `app/api/v1/endpoints/image/image_to_image.py` (第 102-179 行)
- `app/tasks/celery_app.py` (第 30 行)

**问题描述**:

`celery_app.py` 在启动时执行:
```python
from app.api.v1.endpoints.image.image_to_image import process_image_edit
celery_app.autodiscover_tasks(["app.api.v1.endpoints.image"])
```

但 `image_to_image.py` 中同时存在两个任务定义:

1. `process_image_edit` - 在文件末尾定义为 `@celery_app.task(name="image_edit_task")`
2. `image_edit_task` - 通过装饰器显式命名

`autodiscover_tasks` 会导致任务被注册两次，造成不可预期的行为。

**修复方案**:

将 `image_to_image.py` 中的 Celery 任务拆分到独立文件:

```python
# app/tasks/image_edit_task.py
from app.tasks.celery_app import celery_app

@celery_app.task(name="image_edit_task")
def process_image_edit(generation_id: int, user_id: int, ...):
    # ... 实现逻辑
```

同时修改 `celery_app.py`:
```python
# 删除 autodiscover_tasks，改为显式导入
# from app.tasks.image_edit_task import process_image_edit
celery_app.autodiscover_tasks(["app.tasks"])
```

---

### 2. API 路由前缀冲突 [高]

**文件位置**:
- `app/api/v1/endpoints/image/image_edit.py` (第 12 行)
- `app/api/v1/endpoints/image/image_to_image.py` (第 14 行)

**问题描述**:

两个不同的 endpoint 文件使用相同的路由前缀:

```python
# image_edit.py
router = APIRouter(prefix="/image-edit", tags=["ImageEdit"])

# image_to_image.py
router = APIRouter(prefix="/image-edit", tags=["ImageEdit"])
```

当 `main.py` 同时注册这两个 router 时，第二个会覆盖第一个或导致路由冲突。

**修复方案**:

统一合并两个功能或重命名路由:

```python
# image_edit.py - 保持不变
router = APIRouter(prefix="/image-edit", tags=["ImageEdit"])

# image_to_image.py - 改为不同路径
router = APIRouter(prefix="/image-to-image", tags=["ImageToImage"])
```

---

### 3. 重复的 Provider 实现 [中]

**文件位置**:
- `app/services/provider/relay_provider.py` (第 288-414 行)
- `app/services/provider/image_edit_provider.py` (完整文件)

**问题描述**:

存在三个高度相似的图片编辑 Provider:

| Provider | 文件 | 用途 |
|----------|------|------|
| `RelayAPIProvider.image_edit()` | relay_provider.py | 中转站编辑接口 |
| `ImageToImageProvider` | relay_provider.py | 图片转图片 |
| `ImageEditProvider` | image_edit_provider.py | 独立编辑实现 |

它们的实现逻辑几乎相同，造成代码重复和维护困难。

**修复方案**:

保留 `RelayAPIProvider` 作为统一的编辑 Provider，删除其他重复实现:

```python
# app/services/provider/relay_provider.py
class RelayAPIProvider(BaseProvider):
    async def image_edit(self, req: ImageEditRequest) -> GenerateResponse:
        # 统一的编辑逻辑
        pass
    
    async def image_to_image(self, req: ImageEditRequest) -> GenerateResponse:
        # 图片转图片逻辑
        pass
```

---

### 4. SSE 事件 Key 不一致 [高]

**文件位置**:
- `app/tasks/generate_image.py` (第 161-166 行)
- `app/api/v1/endpoints/system/events.py` (第 40-58 行)

**问题描述**:

任务完成通知使用 `user_id`:
```python
# generate_image.py
notify_generation_complete(user_id=user_id, ...)
event_key = f"{user_id}_{generation_id}"
```

但 SSE 接收端使用硬编码 `0`:
```python
# events.py - SSE endpoint
event_key = f"0_{generation_id}"  # 硬编码 user_id=0
```

这导致前端无法正确接收生成完成事件。

**修复方案**:

修改 `events.py` 的 SSE endpoint，正确获取用户身份:

```python
@router.get("/generation/{generation_id}")
async def sse_generation_status(
    generation_id: int,
    token: str = None,  # 添加认证
):
    # 从 token 解析 user_id，而不是硬编码
    current_user = await get_user_from_token(token)
    event_key = f"{current_user.id}_{generation_id}"
    
    async def generate():
        # ... 其余逻辑
```

---

### 5. 积分计算错误 [中]

**文件位置**:
- `app/api/v1/endpoints/image/image_edit.py` (第 43 行)
- `app/tasks/generate_image.py` (第 16-48 行)

**问题描述**:

`image_edit.py` 的积分计算忽略了尺寸参数:

```python
# image_edit.py - 错误
credits_needed = calculate_credits_cost(quality, n)  # 缺少 size 参数
```

而 `generate_image.py` 中的函数签名需要所有参数:

```python
# generate_image.py
def calculate_credits_cost(quality: str, size: str, n: int = 1) -> int:
```

**修复方案**:

```python
# image_edit.py
credits_needed = calculate_credits_cost(quality, size, n)
```

---

### 6. 日志格式问题 [低]

**文件位置**:
- `app/tasks/celery_app.py` (第 2-10 行)

**问题描述**:

日志输出到容器 stdout，但没有结构化格式:

```python
handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
```

对于 base64 图片数据等长内容，日志会包含大量无用信息。

**修复方案**:

1. 对敏感数据进行脱敏:
```python
def sanitize_log(obj):
    if isinstance(obj, str) and len(obj) > 100:
        return obj[:50] + "..." + obj[-20:]
    return obj
```

2. 使用结构化日志 (JSON 格式):
```python
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "timestamp": record.created,
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage()
        })
```

---

### 7. MinIO 错误处理不完善 [中]

**文件位置**:
- `app/tasks/generate_image.py` (第 91-101 行)

**问题描述**:

图片下载失败后直接返回原始 URL，没有标记或处理:

```python
async with httpx.AsyncClient(timeout=60) as http_client:
    response = await http_client.get(url)
    if response.status_code != 200:
        logger.warning(f"Failed to download image: {response.status_code}, using original URL")
        return url  # 静默返回原始 URL
```

**修复方案**:

```python
if response.status_code != 200:
    logger.error(f"MinIO upload failed - download error: {response.status_code}")
    raise ValueError(f"Failed to download source image: {response.status_code}")

# 或者标记generation为部分成功状态
generation.images = [{"url": original_url, "upload_failed": True}]
```

---

### 8. 环境变量配置不一致 [中]

**文件位置**:
- `app/tasks/celery_app.py` (第 2 行)
- `app/services/provider/relay_provider.py` (第 101 行)

**问题描述**:

一些地方直接从 `os.getenv()` 读取配置，而不是使用统一的 `settings`:

```python
# relay_provider.py
self.BASE_URL = os.getenv("RELAY_API_BASE_URL", "https://api.jiekou.ai")

# 但 celery_app.py 在 settings 导入之前就配置了 logging
```

**修复方案**:

统一使用 `app.core.config.settings`:

```python
# relay_provider.py
from app.core.config import settings

class RelayAPIProvider:
    BASE_URL = settings.RELAY_API_BASE_URL
```

---

### 9. API Key 错误处理 [中]

**文件位置**:
- `app/api/v1/endpoints/image/generations.py` (第 162-170 行)

**问题描述**:

密钥检查逻辑复杂但不够健壮:

```python
openai_key = os.getenv("OPENAI_API_KEY", "")
relay_key = os.getenv("RELAY_API_KEY", "")

if not openai_key or openai_key == "sk-your-api-key-here":
    if not relay_key or relay_key == "sk-your-api-key-here":
        raise HTTPException(...)
```

硬编码的占位符字符串容易遗漏。

**修复方案**:

```python
from app.core.config import settings

def is_valid_api_key(key: str) -> bool:
    return bool(key and key not in ("", "sk-your-api-key-here", "your-api-key-here"))

if not is_valid_api_key(settings.OPENAI_API_KEY) and not is_valid_api_key(settings.RELAY_API_KEY):
    raise HTTPException(...)
```

---

### 10. 缺少重试机制 [低]

**文件位置**:
- `app/services/provider/relay_provider.py`
- `app/services/provider/image_edit_provider.py`

**问题描述**:

`OpenAIProvider` 使用了 tenacity 重试，但其他 Provider 没有:

```python
# openai_provider.py
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def generate(self, req: GenerateRequest) -> GenerateResponse:
    ...
```

**修复方案**:

对中转站 Provider 添加相同重试机制:

```python
from tenacity import retry, stop_after_attempt, wait_exponential

class RelayAPIProvider:
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate(self, req: GenerateRequest) -> GenerateResponse:
        ...
```

---

## 二、修复优先级

| 优先级 | 问题编号 | 问题名称 | 影响范围 |
|--------|----------|----------|----------|
| P0 | #4 | SSE 事件 Key 不一致 | 前端无法接收完成通知 |
| P0 | #1 | Celery 任务定义冲突 | Worker 启动失败或任务丢失 |
| P1 | #2 | API 路由前缀冲突 | 部分 API 无法访问 |
| P1 | #5 | 积分计算错误 | 用户被多扣或少扣积分 |
| P2 | #7 | MinIO 错误处理 | 图片存储失败静默 |
| P2 | #8 | 环境变量配置不一致 | 配置管理混乱 |
| P2 | #9 | API Key 错误处理 | 占位符检查遗漏 |
| P3 | #3 | 重复的 Provider 实现 | 代码维护困难 |
| P3 | #6 | 日志格式问题 | 日志可读性差 |
| P3 | #10 | 缺少重试机制 | 偶发失败无恢复 |

---

## 三、Docker Compose 配置建议

当前配置中 `celery-worker` 和 `backend` 使用相同的 Dockerfile，建议保持一致，但需要确保:

1. **日志输出**: 两者都已配置输出到 stdout，符合容器日志规范

2. **健康检查**: Backend 有健康检查，但 Celery Worker 缺少

建议添加 Worker 健康检查脚本:

```yaml
celery-worker:
  # ... existing config
  healthcheck:
    test: ["CMD", "celery", "-A", "app.tasks.celery_app", "inspect", "health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

3. **资源限制**: 建议为两个服务添加资源限制

---

## 四、总结

后端代码整体架构合理，采用了 FastAPI + Celery 的异步任务分离方案。主要问题集中在:

1. **任务注册冲突** - 需要统一 Celery 任务定义位置
2. **路由重复** - 需要合并或重命名冲突的 API 路径
3. **事件通知不一致** - SSE 的 key 匹配问题必须修复
4. **积分计算** - size 参数缺失会影响计费准确性

建议按优先级依次修复上述问题。