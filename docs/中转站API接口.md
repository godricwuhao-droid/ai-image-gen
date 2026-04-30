# Relay API 中转站接口文档

> 文档来源：[Relay API 官方文档](https://docs.jiekou.ai/llms.txt)
> 
> 本文档包含 GPT Image 2 文生图和图片编辑两个接口的详细说明。

---

## 目录

1. [GPT Image 2 文生图](#1-gpt-image-2-文生图)
2. [GPT Image 2 图片编辑](#2-gpt-image-2-图片编辑)

---

## 1. GPT Image 2 文生图

根据文本提示词生成图像，支持多种质量等级和尺寸配置。

### 接口信息

| 项目 | 说明 |
|:-----|:-----|
| 端点 | `POST /v1/images/generations` |
| 认证 | Bearer Token |
| Content-Type | `application/json` |

### 请求参数

#### 请求头

| 参数 | 类型 | 必填 | 说明 |
|:-----|:-----|:----:|:-----|
| Content-Type | string | 是 | 固定值：`application/json` |
| Authorization | string | 是 | 身份验证令牌，格式：`Bearer {{API_KEY}}` |

#### 请求体

| 参数 | 类型 | 默认值 | 必填 | 说明 |
|:-----|:-----|:------:|:----:|:-----|
| n | integer | 1 | 否 | 生成图片数量，实际返回可能少于请求数量 |
| size | string | 1024x1024 | 否 | 图片尺寸 |
| prompt | string | - | 是 | 文本提示词，支持中英文，最大 32000 字符 |
| quality | string | medium | 否 | 质量等级 |
| background | string | auto | 否 | 背景设置 |
| moderation | string | auto | 否 | 内容审核等级 |
| output_format | string | png | 否 | 输出文件格式 |
| output_compression | integer | - | 否 | 压缩等级（0-100），仅 JPEG 有效 |

#### size 可选值

| 尺寸 | 说明 |
|:-----|:-----|
| 1024x1024 | 正方形 |
| 1024x1536 | 竖版 |
| 1536x1024 | 横版 |
| 2048x2048 | 2K 正方形 |
| 2048x1152 | 2K 横版 |
| 3840x2160 | 4K 横版 |
| 2160x3840 | 4K 竖版 |

#### quality 可选值

| 等级 | 说明 |
|:-----|:-----|
| low | 速度最快，成本最低 |
| medium | 平衡速度与质量 |
| high | 质量最佳，速度最慢 |

#### background 可选值

| 值 | 说明 |
|:---|:-----|
| transparent | 透明背景（仅 PNG 支持） |
| opaque | 不透明背景 |
| auto | 自动检测 |

#### moderation 可选值

| 值 | 说明 |
|:---|:-----|
| low | 低审核等级 |
| auto | 自动审核 |

#### output_format 可选值

| 值 | 说明 |
|:---|:-----|
| png | PNG 格式 |
| jpeg | JPEG 格式 |

### 响应参数

| 参数 | 类型 | 说明 |
|:-----|:-----|:-----|
| images | array | 生成的图片 URL 数组 |

---

## 2. GPT Image 2 图片编辑

根据文本提示词编辑图片，支持遮罩修复、透明背景等功能。

### 接口信息

| 项目 | 说明 |
|:-----|:-----|
| 端点 | `POST /v1/images/edits` |
| 认证 | Bearer Token |
| Content-Type | `application/json` |

### 请求参数

#### 请求头

| 参数 | 类型 | 必填 | 说明 |
|:-----|:-----|:----:|:-----|
| Content-Type | string | 是 | 固定值：`application/json` |
| Authorization | string | 是 | 身份验证令牌，格式：`Bearer {{API_KEY}}` |

#### 请求体

| 参数 | 类型 | 默认值 | 必填 | 说明 |
|:-----|:-----|:------:|:----:|:-----|
| n | integer | 1 | 否 | 生成图片数量 |
| mask | string | - | 否 | 遮罩图片（PNG 格式，带 alpha 通道） |
| size | string | 1024x1024 | 否 | 生成图片尺寸 |
| image | string | - | 是 | 要编辑的图片（URL/base64/数组） |
| prompt | string | - | 是 | 文本提示词，最大 32000 字符 |
| quality | string | low | 否 | 质量等级 |
| background | string | auto | 否 | 背景设置 |
| output_format | string | png | 否 | 输出文件格式 |

#### image 支持格式

- PNG
- JPEG
- GIF
- WebP

#### size 可选值

| 尺寸 | 说明 |
|:-----|:-----|
| 1024x1024 | 正方形 |
| 1024x1536 | 竖版 |
| 1536x1024 | 横版 |
| 2048x2048 | 2K 正方形 |
| 2048x1152 | 2K 横版 |
| 3840x2160 | 4K 横版 |
| 2160x3840 | 4K 竖版 |

#### quality 可选值

| 等级 | 说明 |
|:-----|:-----|
| low | 速度最快，成本最低 |
| medium | 平衡速度与质量 |
| high | 质量最佳，速度最慢 |

#### background 可选值

| 值 | 说明 |
|:---|:-----|
| transparent | 透明背景 |
| opaque | 不透明背景 |
| auto | 自动检测 |

#### output_format 可选值

| 值 | 说明 |
|:---|:-----|
| png | PNG 格式 |
| jpeg | JPEG 格式 |

### 响应参数

| 参数 | 类型 | 说明 |
|:-----|:-----|:-----|
| images | array | 生成的图片 URL 数组 |

---

## 注意事项

1. **认证**：所有接口都需要在请求头中携带 `Authorization: Bearer {{API_KEY}}`
2. **频率限制**：请参考中转站的速率限制策略
3. **费用**：请参考[价格清单](./价格清单.md)
4. **内容审核**：请遵守中转站的使用政策，避免生成违规内容
5. **图片保存**：返回的 URL 可能有时效性，建议及时下载保存