# AI Image Generator - 快速启动指南

## 项目概述

这是一个基于纯三方API的AI生图平台，无需GPU，直接调用OpenAI GPT Images 2.0进行图像生成。

## 项目结构

```
ai-image-gen/
├── frontend/           # React前端应用
│   ├── src/
│   │   ├── pages/      # 页面组件 (Home, Login, Register, Result, History)
│   │   ├── services/   # API服务
│   │   ├── store/      # Zustand状态管理
│   │   └── utils/      # 工具函数
│   └── package.json
├── backend/            # FastAPI后端
│   ├── app/
│   │   ├── api/        # API路由
│   │   ├── core/       # 核心配置
│   │   ├── models/     # 数据库模型
│   │   ├── schemas/    # Pydantic模式
│   │   ├── services/   # 业务逻辑
│   │   │   └── provider/  # 三方API适配层
│   │   └── tasks/      # Celery异步任务
│   └── requirements.txt
└── infrastructure/     # 基础设施配置
    └── docker-compose.yml
```

## 快速启动

### 1. 启动基础设施服务

```bash
cd ai-image-gen/infrastructure
docker compose up -d
```

等待服务启动完成。

### 2. 配置后端

```bash
cd ai-image-gen/backend
cp .env.example .env
# 编辑.env文件，填入你的OPENAI_API_KEY
```

### 3. 启动后端

```bash
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. 启动前端

```bash
cd ai-image-gen/frontend
npm install
npm run dev
```

## 访问地址

- 前端应用: http://localhost:5173
- 后端API: http://localhost:8000
- API文档: http://localhost:8000/docs
- MinIO控制台: http://localhost:9001

## 功能说明

### 已实现功能

✅ 用户注册和登录（JWT认证）
✅ 图像生成（调用OpenAI GPT Images 2.0）
✅ 多种尺寸和质量选项
✅ 风格预设（写实、油画、水彩、卡通、赛博朋克、水墨）
✅ 每日生成限制（免费用户10张/天）
✅ 生成历史记录
✅ 图片下载功能

### 核心API

#### 认证API
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `GET /api/v1/auth/me` - 获取当前用户信息

#### 图像生成API
- `POST /api/v1/generations` - 创建生成任务
- `GET /api/v1/generations/{id}` - 获取生成状态
- `GET /api/v1/generations` - 获取生成历史
- `DELETE /api/v1/generations/{id}` - 删除生成记录

## 技术特点

1. **纯三方API接入**: 不需要GPU，直接调用OpenAI API
2. **异步任务处理**: 使用Celery处理图像生成任务
3. **弹性扩展**: 按量付费，天然支持多供应商聚合
4. **完整用户系统**: JWT认证，额度管理

## 下一步

1. 完善支付系统集成
2. 添加更多风格预设
3. 实现图像编辑功能（局部重绘、扩展画布）
4. 接入更多三方供应商（Replicate FLUX、Ideogram等）
5. 开发画廊系统和社区功能
6. 开放API和SDK

## 注意事项

⚠️ 需要有效的OpenAI API Key才能使用
⚠️ 免费用户每日限制10张图像
⚠️ 图像生成可能需要10-30秒时间
⚠️ 请妥善保管API Key，不要泄露给他人
