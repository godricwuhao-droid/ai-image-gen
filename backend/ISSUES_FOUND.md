# 图片生成与编辑功能 - 问题清单

## 审查时间
2026-05-01

---

## 发现的问题汇总

### 🔴 严重问题 (P0)

#### 1. 图片生成积分计算缺少 size 参数

**文件**: `app/api/v1/endpoints/image/generations.py:212`

**问题**: 
```python
# 错误代码
credits_needed = calculate_credits_cost(request.quality, request.n)
# 缺少 size 参数！
```

**影响**: 所有图片生成都按默认尺寸计算积分，导致 4K 图片和 1024x1024 图片价格相同。

**修复**:
```python
credits_needed = calculate_credits_cost(request.quality, request.size, request.n)
```

---

#### 2. 图片生成退款积分计算缺少 size 参数

**文件**: `app/api/v1/endpoints/image/generations.py:306`

**问题**:
```python
# 错误代码
credits_cost = calculate_credits_cost(generation.quality, generation.n)
```

**修复**:
```python
credits_cost = calculate_credits_cost(generation.quality, generation.size, generation.n)
```

---

#### 3. 图片编辑任务缺少积分返还逻辑

**文件**: `app/api/v1/endpoints/image/image_to_image.py`

**问题**: 
- API 端点预扣了积分 (第 81-82 行)
- 但 Celery 任务失败时**没有返还积分**的逻辑！
- 对比 `process_generation` 有完整的返还逻辑

**影响**: 图片编辑失败时，用户积分被扣除但不会返还。

**修复**: 在 `process_image_edit` 的异常处理中添加积分返还逻辑。

---

### 🟠 高优先级问题 (P1)

#### 4. 图片编辑 API 积分计算缺少 n 参数

**文件**: `app/api/v1/endpoints/image/image_to_image.py:50`

**问题**:
```python
credits_needed = calculate_credits_cost(quality, size)  # 缺少 n 参数
```

**修复**:
```python
credits_needed = calculate_credits_cost(quality, size, 1)
```

---

#### 5. 图片编辑任务预扣积分后又重复扣除

**文件**: `app/api/v1/endpoints/image/image_to_image.py`

**问题**: 
- API 端点预扣了积分 (第 81-82 行)
- Celery 任务完成时又扣除了一次 (第 158-160 行)

**影响**: 用户被扣除双倍积分！

**修复**: 删除 Celery 任务中的重复扣除逻辑，或删除 API 端点的预扣逻辑。

---

#### 6. SSE 通知 import 路径错误

**文件**: `app/tasks/generate_image.py:255, 290`

**问题**:
```python
# 错误
from app.api.v1.endpoints.events import notify_generation_complete

# 正确
from app.api.v1.endpoints.system.events import notify_generation_complete
```

**影响**: SSE 通知功能完全失效！

---

### 🟡 中等问题 (P2)

#### 7. ImageEditProvider 只处理第一张图片

**文件**: `app/services/provider/image_edit_provider.py:48`

**问题**:
```python
image_data = request.image_url
if isinstance(image_data, list):
    image_data = image_data[0] if image_data else ""  # 只取第一张！
```

**影响**: 前端上传多张图片时，只有第一张被处理。

**修复**: 如果中转站支持多图，应该传递整个列表；如果不支持，应该循环调用。

---

#### 8. ImageToImageProvider 硬编码输出格式

**文件**: `app/services/provider/relay_provider.py:360`

**问题**:
```python
payload = {
    ...
    "output_format": "png"  # 硬编码，忽略用户选择
}
```

**修复**:
```python
"output_format": getattr(req, 'output_format', 'png')
```

---

#### 9. ImageToImageProvider 错误处理不友好

**文件**: `app/services/provider/relay_provider.py:387-390`

**问题**: 没有使用 `parse_error_response` 来转换错误消息为用户友好格式。

**修复**: 参考 `RelayAPIProvider.generate()` 的实现。

---

#### 10. ImageToImageProvider 响应解析不完整

**文件**: `app/services/provider/relay_provider.py:395-403`

**问题**: 只处理 `images` 字段，没有处理 `data` 字段（RelayAPIProvider 有处理）。

**修复**:
```python
images = []
if "data" in data:
    for item in data["data"]:
        if "url" in item:
            images.append({...})
elif "images" in data:
    for url in data["images"]:
        ...
```

---

### 🟢 低优先级问题 (P3)

#### 11. 日志可能包含敏感数据

**问题**: 某些日志输出包含 base64 图片数据或长 URL。

**建议**: 对敏感数据进行截断或脱敏处理。

---

## 问题优先级汇总

| 优先级 | 问题 | 影响 | 文件 |
|--------|------|------|------|
| P0 | 积分计算缺 size | 计费不准 | generations.py |
| P0 | 退款缺 size | 退款不准 | generations.py |
| P0 | 编辑无退款逻辑 | 用户损失积分 | image_to_image.py |
| P1 | 编辑积分缺 n | 计费不准 | image_to_image.py |
| P1 | 编辑重复扣积分 | 用户双倍扣费 | image_to_image.py |
| P1 | SSE import 错误 | 通知失效 | generate_image.py |
| P2 | Provider 只处理首图 | 多图失效 | image_edit_provider.py |
| P2 | 硬编码输出格式 | 忽略用户选择 | relay_provider.py |
| P2 | 错误处理不友好 | 用户看到原始错误 | relay_provider.py |
| P2 | 响应解析不完整 | 某些 API 响应无法处理 | relay_provider.py |

---

## 修复建议顺序

1. **立即修复**: P0 问题 - 影响核心功能和资金
2. **本周修复**: P1 问题 - 影响用户体验和正确性
3. **计划修复**: P2 问题 - 功能和体验优化