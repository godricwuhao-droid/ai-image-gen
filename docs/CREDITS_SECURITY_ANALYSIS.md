# 积分系统安全漏洞分析报告

> **文档更新时间**: 2026-04-27
> **状态**: ✅ 已完成所有优化

---

## 一、现状分析

### 1.1 积分扣除流程（优化后）

```
用户发起生成请求
    ↓
API层检查积分（generations.py）
    ↓
✅ 积分预扣（原子操作）
    ↓
创建Generation记录（status=pending）
    ↓
记录积分交易流水
    ↓
Celery异步处理
    ↓
生成成功：完成确认 ✅
生成失败：返还积分 ✅
```

### 1.2 积分充值流程（优化后）

```
用户选择套餐 → 创建Order（pending）
    ↓
Stripe支付 / Demo确认
    ↓
✅ Webhook签名验证（Stripe）
    ↓
✅ 幂等性检查（防止重复处理）
    ↓
更新Order状态 + 增加用户积分
    ↓
✅ 记录积分交易流水
```

---

## 二、安全漏洞和风险识别

### 🔴 高风险漏洞

#### 漏洞1：积分扣除时机错误（逻辑缺陷） - ✅ 已修复

**问题**: 积分在生成**成功后**才扣除，Celery崩溃时用户可白嫖

**解决方案**: 实施积分预扣机制

**实施状态**: ✅ 已完成
- **文件**: [generations.py](file:///data/ai-image/ai-image-gen/backend/app/api/v1/endpoints/generations.py)
- **修改内容**:
  - 在创建generation时立即使用原子操作扣除积分
  - 使用 `update(User).where(User.credits >= credits_needed)` 确保并发安全
  - 生成成功后不再重复扣除积分

---

#### 漏洞2：Webhook签名验证缺失 - ✅ 已修复

**问题**: 未验证Stripe webhook回调真实性

**解决方案**: 添加Webhook签名验证

**实施状态**: ✅ 已完成
- **文件**: [payment.py](file:///data/ai-image/ai-image-gen/backend/app/api/v1/endpoints/payment.py)
- **修改内容**:
  - 添加 `stripe-signature` header检查
  - 使用 `stripe_lib.Webhook.construct_event()` 验签
  - 检查 `stripe_webhook_secret` 配置
  - 添加详细日志记录

---

#### 漏洞3：积分扣除前未预留/锁定 - ✅ 已修复

**问题**: 并发请求可能导致积分超扣

**解决方案**: 使用原子操作预扣积分

**实施状态**: ✅ 已完成
- **文件**: [generations.py](file:///data/ai-image/ai-image-gen/backend/app/api/v1/endpoints/generations.py)
- **修改内容**:
  - 使用 `update(User).where(User.credits >= credits_needed)` 原子操作
  - 检查 `result.rowcount` 确保更新成功
  - 事务内完成积分扣除和generation创建

---

#### 漏洞4：积分返还可重复触发 - ✅ 已修复

**问题**: `refunded`标志可能在commit失败时状态不一致

**解决方案**: 使用原子操作返还，添加幂等性检查

**实施状态**: ✅ 已完成
- **文件**: [generate_image.py](file:///data/ai-image/ai-image-gen/backend/app/tasks/generate_image.py)
- **修改内容**:
  - 返还前检查 `generation.refunded` 状态
  - 使用原子操作 `update(User)` 返还积分
  - 返还后立即设置 `generation.refunded = True`
  - 添加详细日志记录

---

### 🟡 中等风险

#### 风险5：管理员权限滥用 - ✅ 已优化

**问题**: 管理员可给自己无限加积分

**解决方案**: 添加操作审计日志

**实施状态**: ✅ 已完成
- **文件**: [credits.py](file:///data/ai-image/ai-image-gen/backend/app/api/v1/endpoints/credits.py)
- **修改内容**:
  - 所有管理员操作使用 `WARNING` 日志级别
  - 记录操作者、被操作用户、积分数量
  - 记录积分交易流水

---

#### 风险6：每日免费额度绕过 - ⚠️ 待处理

**问题**: 用户可注册多个账号绕过免费额度

**当前状态**: 暂未实施（需要IP/设备限制）

**建议方案**: 
- 添加IP频率限制
- 添加设备指纹识别
- 绑定手机号验证

---

### 🟢 低风险

#### 风险7：积分计算不一致 - ✅ 已修复

**问题**: API层和Celery层计算的credits_cost可能不一致

**解决方案**: 统一使用generation.credits_cost

**实施状态**: ✅ 已完成
- **文件**: [generate_image.py](file:///data/ai-image/ai-image-gen/backend/app/tasks/generate_image.py)
- **修改内容**:
  - Celery优先使用 `generation.credits_cost`
  - 只有当为None时才重新计算

---

## 三、积分交易流水系统 - ✅ 已完成

### 3.1 数据库表结构

**新建文件**: [credit_transaction.py](file:///data/ai-image/ai-image-gen/backend/app/models/credit_transaction.py)

```python
class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(BigInt, primary_key=True)
    user_id = Column(BigInt, index=True)
    amount = Column(Integer)  # 正数=增加，负数=扣除
    balance_after = Column(Integer)  # 变动后余额
    transaction_type = Column(String)  # generation_deduct, generation_refund, purchase, admin_add, admin_deduct
    reference_type = Column(String)  # generation, order, manual
    reference_id = Column(BigInt)  # generation_id 或 order_id
    description = Column(Text)
    created_at = Column(DateTime, index=True)
```

### 3.2 交易类型

| 交易类型 | 说明 | 记录位置 |
|---------|------|---------|
| `generation_deduct` | 图片生成预扣积分 | [generations.py](file:///data/ai-image/ai-image-gen/backend/app/api/v1/endpoints/generations.py) |
| `generation_refund` | 图片生成失败返还积分 | [generate_image.py](file:///data/ai-image/ai-image-gen/backend/app/tasks/generate_image.py) |
| `purchase` | 购买套餐获得积分 | [payment.py](file:///data/ai-image/ai-image-gen/backend/app/api/v1/endpoints/payment.py) |
| `admin_add` | 管理员手动增加积分 | [credits.py](file:///data/ai-image/ai-image-gen/backend/app/api/v1/endpoints/credits.py) |
| `admin_deduct` | 管理员手动扣除积分 | [credits.py](file:///data/ai-image/ai-image-gen/backend/app/api/v1/endpoints/credits.py) |

### 3.3 数据库迁移

**新建文件**: [add_credit_transactions.sql](file:///data/ai-image/ai-image-gen/infrastructure/migrations/add_credit_transactions.sql)

```sql
CREATE TABLE IF NOT EXISTS credit_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    amount INT NOT NULL,
    balance_after INT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_reference (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**执行命令**:
```bash
cd /data/ai-image/ai-image-gen/infrastructure
docker-compose exec -T mysql mysql -uroot -proot_password ai_image_gen < migrations/add_credit_transactions.sql
```

---

## 四、优先级和完成状态

| 优先级 | 方案 | 状态 | 修改文件 |
|-------|------|------|---------|
| P0 | Webhook签名验证 | ✅ 已完成 | [payment.py](file:///data/ai-image/ai-image-gen/backend/app/api/v1/endpoints/payment.py) |
| P0 | 积分预扣机制 | ✅ 已完成 | [generations.py](file:///data/ai-image/ai-image-gen/backend/app/api/v1/endpoints/generations.py) |
| P1 | 积分交易流水 | ✅ 已完成 | [credit_transaction.py](file:///data/ai-image/ai-image-gen/backend/app/models/credit_transaction.py), [generations.py](file:///data/ai-image/ai-image-gen/backend/app/api/v1/endpoints/generations.py), [generate_image.py](file:///data/ai-image/ai-image-gen/backend/app/tasks/generate_image.py), [payment.py](file:///data/ai-image/ai-image-gen/backend/app/api/v1/endpoints/payment.py), [credits.py](file:///data/ai-image/ai-image-gen/backend/app/api/v1/endpoints/credits.py) |
| P1 | 返还幂等性保证 | ✅ 已完成 | [generate_image.py](file:///data/ai-image/ai-image-gen/backend/app/tasks/generate_image.py) |
| P2 | 任务状态追踪 | ✅ 已完成 | 通过日志和refunded字段实现 |
| P3 | 管理员操作审计 | ✅ 已完成 | [credits.py](file:///data/ai-image/ai-image-gen/backend/app/api/v1/endpoints/credits.py) |
| - | IP/设备限制 | ⚠️ 待处理 | - |

---

## 五、测试验证

### 5.1 构建测试
```bash
cd /data/ai-image/ai-image-gen/infrastructure
docker-compose build backend celery-worker
```

### 5.2 启动测试
```bash
docker-compose up -d backend celery-worker
```

### 5.3 API测试
```bash
# 登录测试
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "godricwuhao@gmail.com", "password": "123456"}'

# 预期结果: 返回token
```

---

## 六、部署步骤

1. **构建新镜像**
```bash
docker-compose build backend celery-worker
```

2. **部署服务**
```bash
docker-compose up -d backend celery-worker
```

3. **执行数据库迁移**
```bash
docker-compose exec -T mysql mysql -uroot -proot_password ai_image_gen < migrations/add_credit_transactions.sql
```

4. **验证服务**
```bash
# 检查后端日志
docker-compose logs --tail=30 backend

# 测试API
curl -X POST "http://localhost:8000/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email": "godricwuhao@gmail.com", "password": "123456"}'
```

---

## 七、总结

### 已修复的安全漏洞

1. ✅ **积分扣除时机错误** - 改为预扣机制
2. ✅ **Webhook签名验证缺失** - 添加签名验证
3. ✅ **积分并发超扣** - 使用原子操作
4. ✅ **积分返还重复触发** - 添加幂等性检查
5. ✅ **管理员操作无审计** - 添加日志记录

### 新增功能

1. ✅ **积分交易流水** - 完整的积分变动审计日志
2. ✅ **交易类型分类** - 支持多种交易类型
3. ✅ **余额快照** - 每笔交易记录变动后余额

### 待优化项

1. ⚠️ **IP/设备限制** - 防止多账号薅羊毛
2. ⚠️ **短信验证** - 增强账户安全性
