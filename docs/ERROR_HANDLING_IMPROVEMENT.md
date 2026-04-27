# 中转API错误处理优化方案

## 一、现状分析

### 1.1 当前问题

从celery日志中提取的实际错误响应：

```json
{
  "code": 400,
  "reason": "INVALID_REQUEST_BODY",
  "message": {
    "error": {
      "message": "Your request was rejected by the safety system.",
      "type": "image_generation_user_error",
      "code": "moderation_blocked"
    }
  },
  "metadata": {
    "details": {
      "message": "The system is currently experiencing high demand...",
      "type": "upstream_error",
      "code": "NoCapacity"
    }
  }
}
```

### 1.2 当前错误处理流程

```
中转API返回错误
    ↓
relay_provider.py 捕获异常
    ↓
抛出 ValueError(原始错误信息)
    ↓
generate_image.py 捕获异常
    ↓
generation.error_message = str(e)
    ↓
SSE推送 {"status": "failed", "error_message": "..."}
    ↓
前端显示
```

### 1.3 当前代码问题

**relay_provider.py (第98-100行)**：
```python
elif response.status_code != 200:
    raise ValueError(f"API error: {response.status_code} - {response.text}")
```

直接抛出原始响应JSON，用户无法理解。

---

## 二、中转站完整错误码

### 2.1 官方错误码（用户提供）

| 错误码 | 状态码 | 说明 | 用户提示 |
|--------|--------|------|---------|
| INVALID_API_KEY | 403 | 未提供 API Key | API密钥无效，请联系管理员 |
| MODEL_NOT_FOUND | 404 | 模型不存在 | 服务配置错误，请联系管理员 |
| FAILED_TO_AUTH | 401 | 认证失败 | 认证失败，请联系管理员 |
| NOT_ENOUGH_BALANCE | 403 | 余额不足 | 账户余额不足，请联系管理员 |
| INVALID_REQUEST_BODY | 400 | 请求体格式错误 | 请求格式有误，请重试 |
| RATE_LIMIT_EXCEEDED | 429 | 请求过快 | 请求过于频繁，请稍后再试 |
| TOKEN_LIMIT_EXCEEDED | 429 | Token数超限 | 内容过长，请缩短提示词后重试 |
| SERVICE_NOT_AVAILABLE | 503 | 服务不可用 | AI服务暂时不可用，请稍后再试 |
| ACCESS_DENY | 403 | 无权限访问 | 无权限访问，请联系管理员 |

### 2.2 上游服务错误码（从日志提取）

| 错误码 | 说明 | 用户提示 |
|--------|------|---------|
| moderation_blocked | 内容被安全审核拦截 | 您的内容包含敏感信息，请修改提示词后重试 |
| NoCapacity | 上游服务容量不足 | AI服务当前负载较高，请稍后再试 |

---

## 三、方案设计

### 3.1 核心改进

**将原始错误码转换为用户友好的中文提示**

### 3.2 详细实现

#### 步骤1：定义错误映射

```python
# 在 relay_provider.py 中添加

# 中转站官方错误码映射
RELAY_ERROR_MAP = {
    "INVALID_API_KEY": "API密钥无效，请联系管理员",
    "MODEL_NOT_FOUND": "服务配置错误，请联系管理员",
    "FAILED_TO_AUTH": "认证失败，请联系管理员",
    "NOT_ENOUGH_BALANCE": "账户余额不足，请联系管理员",
    "INVALID_REQUEST_BODY": "请求格式有误，请重试",
    "RATE_LIMIT_EXCEEDED": "请求过于频繁，请稍后再试",
    "TOKEN_LIMIT_EXCEEDED": "内容过长，请缩短提示词后重试",
    "SERVICE_NOT_AVAILABLE": "AI服务暂时不可用，请稍后再试",
    "ACCESS_DENY": "无权限访问，请联系管理员",
}

# 上游服务错误码映射
UPSTREAM_ERROR_MAP = {
    "moderation_blocked": "您的内容包含敏感信息，请修改提示词后重试",
    "NoCapacity": "AI服务当前负载较高，请稍后再试",
}

# HTTP状态码默认映射
HTTP_STATUS_MAP = {
    400: "请求参数有误，请重试",
    401: "认证失败，请联系管理员",
    403: "账户权限受限，请联系管理员",
    404: "服务配置错误，请联系管理员",
    429: "请求过于频繁，请稍后再试",
    500: "服务端暂时不可用，请稍后再试",
    502: "服务暂时不可用，请稍后再试",
    503: "服务暂时不可用，请稍后再试",
    504: "服务响应超时，请稍后再试",
}
```

#### 步骤2：创建错误解析函数

```python
import json

def parse_error_response(response_text: str, status_code: int) -> str:
    """解析错误响应，返回用户友好的提示"""
    
    # 尝试解析JSON
    try:
        data = json.loads(response_text)
    except json.JSONDecodeError:
        return HTTP_STATUS_MAP.get(status_code, "服务暂时不可用，请稍后再试")
    
    # 提取错误码
    error_code = None
    inner_message = None
    
    # 格式: {"code": 400, "reason": "INVALID_REQUEST_BODY", "message": {...}}
    error_code = data.get("reason") or data.get("code")
    if "message" in data and isinstance(data["message"], dict):
        inner_error = data["message"].get("error", {})
        inner_code = inner_error.get("code")
        inner_message = inner_error.get("message")
        
        # 检查metadata中的错误码
        if not inner_code:
            metadata = data.get("metadata", {})
            details = metadata.get("details", {})
            if isinstance(details, dict):
                inner_code = details.get("code")
        
        # 如果没有外层错误码，尝试使用内层错误码
        if not error_code and inner_code:
            error_code = inner_code
    
    # 检查中转站官方错误码
    if error_code and error_code in RELAY_ERROR_MAP:
        return RELAY_ERROR_MAP[error_code]
    
    # 检查上游服务错误码
    if error_code and error_code in UPSTREAM_ERROR_MAP:
        return UPSTREAM_ERROR_MAP[error_code]
    
    # 根据HTTP状态码返回提示
    return HTTP_STATUS_MAP.get(status_code, "生成失败，请稍后再试")
```

#### 步骤3：修改异常处理

```python
# 修改前
elif response.status_code != 200:
    raise ValueError(f"API error: {response.status_code} - {response.text}")

# 修改后
elif response.status_code != 200:
    user_message = parse_error_response(response.text, response.status_code)
    logger.error(f"[RelayAPI] 生成失败: {user_message} (原始: {response.text[:200]})")
    raise ValueError(user_message)
```

---

## 四、前端展示优化

### 4.1 错误类型判断

```typescript
interface ParsedError {
  error_type: 'user_error' | 'server_error' | 'config_error';
  message: string;
  showRetry: boolean;
}

function parseErrorMessage(errorMessage: string): ParsedError {
  // 用户内容问题
  if (errorMessage.includes('敏感信息') || 
      errorMessage.includes('审核') ||
      errorMessage.includes('修改提示词')) {
    return { 
      error_type: 'user_error', 
      message: errorMessage,
      showRetry: true 
    };
  }
  
  // 服务暂时不可用
  if (errorMessage.includes('负载较高') || 
      errorMessage.includes('暂时不可用') ||
      errorMessage.includes('超时') ||
      errorMessage.includes('频繁')) {
    return { 
      error_type: 'server_error', 
      message: errorMessage,
      showRetry: true 
    };
  }
  
  // 配置问题
  if (errorMessage.includes('管理员') || 
      errorMessage.includes('余额') ||
      errorMessage.includes('无权限')) {
    return { 
      error_type: 'config_error', 
      message: errorMessage,
      showRetry: false 
    };
  }
  
  return { 
    error_type: 'server_error', 
    message: errorMessage,
    showRetry: true 
  };
}
```

### 4.2 展示效果

| 错误类型 | 提示颜色 | 建议操作 |
|---------|---------|---------|
| 用户内容问题 | 红色 | 修改提示词 + 可重试 |
| 服务暂时不可用 | 黄色 | 稍后重试 |
| 配置问题 | 灰色 | 联系管理员 |

---

## 五、文件修改清单

| 文件 | 修改内容 |
|------|---------|
| `backend/app/services/provider/relay_provider.py` | 添加错误映射表和解析函数 |
| `frontend/src/pages/HomePage.tsx` | 优化错误展示UI |

---

## 六、错误码完整对照表

| 原始错误码 | 用户看到的中文提示 | 错误类型 | 是否可重试 |
|-----------|------------------|---------|-----------|
| INVALID_API_KEY | API密钥无效，请联系管理员 | 配置问题 | 否 |
| MODEL_NOT_FOUND | 服务配置错误，请联系管理员 | 配置问题 | 否 |
| FAILED_TO_AUTH | 认证失败，请联系管理员 | 配置问题 | 否 |
| NOT_ENOUGH_BALANCE | 账户余额不足，请联系管理员 | 配置问题 | 否 |
| INVALID_REQUEST_BODY | 请求格式有误，请重试 | 用户问题 | 可 |
| RATE_LIMIT_EXCEEDED | 请求过于频繁，请稍后再试 | 服务问题 | 可 |
| TOKEN_LIMIT_EXCEEDED | 内容过长，请缩短提示词后重试 | 用户问题 | 可 |
| SERVICE_NOT_AVAILABLE | AI服务暂时不可用，请稍后再试 | 服务问题 | 可 |
| ACCESS_DENY | 无权限访问，请联系管理员 | 配置问题 | 否 |
| moderation_blocked | 您的内容包含敏感信息，请修改提示词后重试 | 用户问题 | 可 |
| NoCapacity | AI服务当前负载较高，请稍后再试 | 服务问题 | 可 |

---

请确认方案后，我将开始实施。
