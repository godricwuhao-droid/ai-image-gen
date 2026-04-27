# 中转API接口文档

**更新时间**: 2026-04-25
**API服务商**: 接口AI (jiekou.ai)

***

## 一、文生图 API (GPT Image 2 Text to Image)

### 1.1 基本信息

| 项目           | 内容                                                   |
| ------------ | ---------------------------------------------------- |
| 接口地址         | `https://api.jiekou.ai/v3/gpt-image-2-text-to-image` |
| 请求方法         | POST                                                 |
| 认证方式         | Bearer Token                                         |
| Content-Type | application/json                                     |

### 1.2 请求头

```http
Content-Type: application/json
Authorization: Bearer {API_KEY}
```

### 1.3 请求参数

| 参数名                 | 类型      | 必填 | 默认值         | 说明          | 可选值                                           |
| ------------------- | ------- | -- | ----------- | ----------- | --------------------------------------------- |
| prompt              | string  | ✅  | -           | 文本提示词       | 中英文，最大32000字符                                 |
| n                   | integer | ❌  | 1           | 生成数量        | 1-10                                          |
| size                | string  | ❌  | "1024x1024" | 图片尺寸        | "1024x1024", "1024x1536", "1536x1024", "auto" |
| quality             | string  | ❌  | "medium"    | 图片质量        | "low", "medium", "high"                       |
| background          | string  | ❌  | "auto"      | 背景设置        | "transparent", "opaque", "auto"               |
| moderation          | string  | ❌  | "auto"      | 内容审核        | "low", "auto"                                 |
| output\_format      | string  | ❌  | "png"       | 输出格式        | "png", "jpeg"                                 |
| output\_compression | integer | ❌  | 100         | 压缩等级(仅jpeg) | 0-100                                         |

### 1.4 请求示例

```json
{
  "prompt": "cyberpunk city, neon signs, rain effect, street food stall, detailed characters, cinematic",
  "n": 1,
  "size": "1024x1024",
  "quality": "medium",
  "background": "auto",
  "moderation": "auto",
  "output_format": "png"
}
```

### 1.5 响应格式

```json
{
  "background": "opaque",
  "output_format": "png",
  "quality": "medium",
  "size": "1024x1024",
  "images": [
    "https://faas-output-image-xxx.cos.ap-singapore.myqcloud.com/prod/fusion-xxx?q-sign-algorithm=sha1&q-ak=xxx&q-sign-time=xxx&q-key-time=xxx&q-header-list=host&q-url-param-list=&q-signature=xxx"
  ]
}
```

### 1.6 质量等级说明

| 等级     | 速度 | 成本 | 适用场景     |
| ------ | -- | -- | -------- |
| low    | 最快 | 最低 | 预览、草稿    |
| medium | 平衡 | 平衡 | **默认推荐** |
| high   | 最慢 | 最高 | 最终成品     |

### 1.7 尺寸说明

| 尺寸        | 宽高比  | 说明      |
| --------- | ---- | ------- |
| 1024x1024 | 1:1  | 正方形(默认) |
| 1024x1536 | 2:3  | 竖版      |
| 1536x1024 | 3:2  | 横版      |
| auto      | 模型决定 | 自动选择    |

***

## 二、图片编辑 API (GPT Image 2 Edit)

### 2.1 基本信息

| 项目           | 内容                                          |
| ------------ | ------------------------------------------- |
| 接口地址         | `https://api.jiekou.ai/v3/gpt-image-2-edit` |
| 请求方法         | POST                                        |
| 认证方式         | Bearer Token                                |
| Content-Type | application/json                            |

### 2.2 请求头

```http
Content-Type: application/json
Authorization: Bearer {API_KEY}
```

### 2.3 请求参数

| 参数名            | 类型      | 必填 | 默认值         | 说明           | 可选值                                   |
| -------------- | ------- | -- | ----------- | ------------ | ------------------------------------- |
| prompt         | string  | ✅  | -           | 编辑描述         | 中英文，最大32000字符                         |
| image          | string  | ✅  | -           | 图片URL/base64 | PNG/JPEG/GIF/WebP                     |
| mask           | string  | ❌  | -           | 遮罩图片URL      | 完全透明区域表示编辑位置                          |
| n              | integer | ❌  | 1           | 生成数量         | 1-10                                  |
| size           | string  | ❌  | "1024x1024" | 图片尺寸         | "1024x1024", "1024x1536", "1536x1024" |
| quality        | string  | ❌  | "low"       | 图片质量         | "low", "medium", "high"               |
| background     | string  | ❌  | "auto"      | 背景设置         | "transparent", "opaque", "auto"       |
| output\_format | string  | ❌  | "png"       | 输出格式         | "png", "jpeg"                         |

### 2.4 请求示例

```json
{
  "prompt": "change the sky to sunset",
  "image": "https://example.com/input-image.jpg",
  "n": 1,
  "size": "1024x1024",
  "quality": "medium",
  "output_format": "png"
}
```

### 2.5 响应格式

```json
{
  "images": [
    "https://faas-output-image-xxx.cos.ap-singapore.myqcloud.com/prod/fusion-xxx"
  ]
}
```

***

## 三、参数映射说明

### 3.1 前端到中转API参数映射

| 前端参数     | 中转API参数 | 说明              |
| -------- | ------- | --------------- |
| standard | medium  | 前端标准质量→中转medium |
| hd       | high    | 前端高清→中转high     |
| low      | low     | 保持不变            |

### 3.2 质量映射表

```
前端 quality     →  中转API quality
─────────────────────────────
standard       →  medium
hd             →  high
low            →  low
medium         →  medium
high           →  high
```

### 3.3 尺寸映射表

```
前端 size        →  中转API size
─────────────────────────────
1024x1024     →  1024x1024
1024x1536     →  1024x1536
1536x1024     →  1536x1024
```

***

## 四、错误码说明

| HTTP状态码 | 错误码                   | 说明        |
| ------- | --------------------- | --------- |
| 400     | VALIDATION\_ERROR     | 参数验证失败    |
| 401     | INVALID\_API\_KEY     | API Key无效 |
| 403     | FORBIDDEN             | 无权限       |
| 429     | RATE\_LIMIT\_EXCEEDED | 请求过于频繁    |
| 500     | INTERNAL\_ERROR       | 服务器内部错误   |
| 503     | SERVICE\_UNAVAILABLE  | 服务不可用     |

***

## 五、使用建议

### 5.1 超时设置

- 文生图API耗时较长，建议设置超时时间为 **120秒**
- 图片编辑API耗时更长，建议设置超时时间为 **180秒**

### 5.2 重试策略

- 建议使用指数退避重试，最多3次
- 初始等待时间2秒，最大等待30秒

### 5.3 图片保存

- API返回的图片URL带有签名，有效期有限
- 建议立即下载到本地存储(MinIO/S3)
- 保存后的URL由自己控制

### 5.4 错误处理示例

```python
try:
    response = await client.post(url, json=payload, timeout=120)
except httpx.TimeoutException:
    logger.error("Request timeout")
    raise ValueError("图片生成超时，请稍后重试")
except httpx.HTTPStatusError as e:
    if e.response.status_code == 429:
        raise ValueError("请求过于频繁，请稍后重试")
    raise ValueError(f"API错误: {e.response.status_code}")
```

***

## 六、测试命令

### 6.1 文生图测试

```bash
curl -X POST 'https://api.jiekou.ai/v3/gpt-image-2-text-to-image' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_YOUR_API_KEY" \
  -d '{
    "prompt": "a cute cat",
    "n": 1,
    "size": "1024x1024",
    "quality": "medium",
    "output_format": "png"
  }'
```

### 6.2 图片编辑测试

```bash
curl -X POST 'https://api.jiekou.ai/v3/gpt-image-2-edit' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_YOUR_API_KEY" \
  -d '{
    "prompt": "change background to sunset",
    "image": "https://example.com/image.jpg",
    "n": 1,
    "size": "1024x1024",
    "quality": "medium",
    "output_format": "png"
  }'
```

***

*文档版本: V1.0*
*最后更新: 2026-04-25*
