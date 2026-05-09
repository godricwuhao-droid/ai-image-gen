# 支付功能实施方案

## 一、现状分析

### 1.1 已实现的功能

| 功能模块 | 后端 API | 前端页面 | 状态 |
|---------|---------|---------|------|
| **套餐列表** | `GET /api/v1/payment/packages` | `PricingPage.tsx` | ✅ 完整 |
| **创建订单** | `POST /api/v1/payment/checkout` | 确认弹窗 | ✅ 完整 |
| **演示支付** | `POST /api/v1/payment/confirm-demo` | 确认弹窗 | ✅ 完整 |
| **Stripe 支付** | `POST /api/v1/payment/checkout` + Webhook | - | ⚠️ 框架完成，未配置密钥 |
| **订单列表** | `GET /api/v1/payment/my-orders` | `OrdersPage.tsx` | ✅ 完整 |
| **订单详情** | `GET /api/v1/payment/order/{id}` | - | ✅ 完整 |
| **取消订单** | `POST /api/v1/payment/cancel-order` | - | ✅ 完整 |
| **积分流水** | `CreditTransaction` 模型 | - | ✅ 完整 |
| **支付成功页** | - | `PaymentSuccessPage.tsx` | ✅ 完整 |
| **管理后台订单管理** | `admin_orders.py` | `admin/src/pages/Orders/List.tsx` | ✅ 完整 |
| **管理后台积分管理** | `admin_credits.py` | - | ✅ 完整 |

### 1.2 数据库模型

| 模型 | 表名 | 用途 | 状态 |
|------|------|------|------|
| `Package` | `packages` | 积分套餐 | ✅ 已使用 |
| `Order` | `orders` | 订单记录 | ✅ 已使用 |
| `CreditTransaction` | `credit_transactions` | 积分流水 | ✅ 已使用 |
| `Subscription` | `subscriptions` | 订阅套餐 | ❌ 未使用 |

### 1.3 当前支付流程（演示模式）

```
用户访问定价页 → 选择套餐 → 弹出确认弹窗 → 点击"确认支付"
  ↓
POST /payment/confirm-demo
  ↓
更新订单状态为 completed
  ↓
增加用户积分 + 记录流水
  ↓
跳转到 /payment/success
```

### 1.4 存在的问题

| 问题 | 影响 | 优先级 |
|------|------|--------|
| **未配置 Stripe 密钥** | Stripe 支付无法使用，只能演示模式 | 🔴 高 |
| **无国内支付方式** | 国内用户无法支付 | 🔴 高 |
| **无退款功能** | 管理员可标记退款但无实际退款逻辑 | 🟡 中 |
| **订单无超时取消** | 待支付订单永久存在 | 🟡 中 |
| **订阅系统未实现** | 只有模型，无 API | 🟢 低 |
| **支付失败无通知** | 用户不知道支付失败 | 🟢 低 |

---

## 二、微信支付集成方案（推荐）

### 2.1 为什么选择微信支付

| 因素 | 说明 |
|------|------|
| **用户覆盖** | 国内用户覆盖率 >90% |
| **集成难度** | 提供完善的 API 和 SDK |
| **支付场景** | 支持 JSAPI（公众号）、Native（扫码）、APP、H5 |
| **费用** | 0.6% 手续费（标准费率） |

### 2.2 技术方案选型

**推荐：微信支付 Native（扫码支付）**

原因：
- 网站无需微信公众号认证
- 用户扫码即可支付，体验简单
- 支持 PC 和移动端

**备选：微信支付 JSAPI（公众号支付）**

需要：
- 注册微信公众号（服务号）
- 完成认证
- 用户关注公众号后支付

### 2.3 接入准备

#### 2.3.1 注册微信支付商户号

1. 访问 [微信支付商户平台](https://pay.weixin.qq.com)
2. 注册商户号
3. 完成实名认证
4. 获取以下信息：
   - `mch_id`（商户号）
   - `app_id`（公众号/APP ID，可选）
   - `api_key`（API 密钥，需在商户平台设置）
   - `api_cert`（API 证书，用于 V3 接口）

#### 2.3.2 配置环境变量

在 `infrastructure/.env` 添加：

```bash
# 微信支付配置
WECHAT_PAY_MCH_ID=your_merchant_id
WECHAT_PAY_API_KEY=your_api_key
WECHAT_PAY_APP_ID=your_app_id  # 可选，JSAPI 支付需要
WECHAT_PAY_NOTIFY_URL=https://image.onlygocloud.top/api/v1/payment/wechat-notify
WECHAT_PAY_CERT_SERIAL=your_cert_serial_number
WECHAT_PAY_PRIVATE_KEY_PATH=/path/to/apiclient_key.pem
```

### 2.4 后端实现

#### 2.4.1 安装依赖

```bash
pip install wechatpayv3 cryptography
```

添加到 `backend/requirements.txt`。

#### 2.4.2 新增微信支付服务

创建 `backend/app/services/wechat_pay.py`：

```python
import wechatpayv3
from wechatpayv3 import WeChatPay, notify
import os

class WechatPayService:
    def __init__(self):
        self.mch_id = os.getenv('WECHAT_PAY_MCH_ID')
        self.api_key = os.getenv('WECHAT_PAY_API_KEY')
        self.notify_url = os.getenv('WECHAT_PAY_NOTIFY_URL')
        
        # 初始化微信支付 V3
        if self.mch_id and self.api_key:
            self.pay = WeChatPay(
                mchid=self.mch_id,
                serial_no=os.getenv('WECHAT_PAY_CERT_SERIAL'),
                private_key=self._load_private_key(),
                appid=os.getenv('WECHAT_PAY_APP_ID', ''),
                notify_url=self.notify_url,
            )
    
    def _load_private_key(self):
        """加载 API 证书私钥"""
        with open(os.getenv('WECHAT_PAY_PRIVATE_KEY_PATH'), 'rb') as f:
            return f.read()
    
    def create_native_order(self, order_id: int, amount: float, description: str, user_id: int) -> dict:
        """创建 Native 扫码支付订单"""
        result = self.pay.native_pay(
            description=description,
            out_trade_no=f"AIIMG_{order_id}",
            amount={
                'total': int(amount * 100),  # 转换为分
                'currency': 'CNY'
            },
            payer={'openid': ''},
            notify_url=self.notify_url,
        )
        return {
            'code_url': result['code_url'],  # 二维码链接
            'payment_url': result.get('h5_url', ''),
        }
    
    def query_order(self, order_id: int) -> dict:
        """查询订单状态"""
        result = self.pay.query_by_out_trade_no(f"AIIMG_{order_id}")
        return result
    
    def refund(self, order_id: int, amount: float, refund_amount: float) -> dict:
        """申请退款"""
        result = self.pay.refund(
            out_trade_no=f"AIIMG_{order_id}",
            out_refund_no=f"REFUND_{order_id}",
            amount={
                'refund': int(refund_amount * 100),
                'total': int(amount * 100),
                'currency': 'CNY'
            }
        )
        return result
    
    def verify_notify(self, payload: bytes, timestamp: str, nonce: str, signature: str) -> dict:
        """验证支付回调签名"""
        return self.pay.parse_notification(payload, timestamp, nonce, signature)
```

#### 2.4.3 新增支付 API 端点

在 `backend/app/api/v1/endpoints/payment/payment.py` 添加：

```python
# 微信支付相关路由

@router.post("/wechat-pay", response_model=dict)
async def create_wechat_payment(
    request: CreateCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建微信支付订单"""
    # 1. 查询套餐
    pkg_result = await db.execute(
        select(Package).where(Package.id == request.package_id, Package.is_active == True)
    )
    package = pkg_result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="套餐不存在")
    
    # 2. 创建订单
    order = Order(
        user_id=current_user.id,
        package_id=package.id,
        amount=package.price,
        credits=package.credits,
        payment_method='wechat',
        payment_status='pending',
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    
    # 3. 创建微信支付订单
    wechat_service = WechatPayService()
    result = wechat_service.create_native_order(
        order_id=order.id,
        amount=package.price,
        description=f"{package.name} - {package.credits}积分",
        user_id=current_user.id,
    )
    
    return {
        "order_id": order.id,
        "code_url": result['code_url'],
        "amount": package.price,
        "credits": package.credits,
    }


@router.post("/wechat-notify")
async def wechat_payment_notify(request: Request):
    """微信支付回调"""
    payload = await request.body()
    
    wechat_service = WechatPayService()
    try:
        # 验证签名
        result = wechat_service.verify_notify(
            payload=payload,
            timestamp=request.headers.get('wechatpay-timestamp', ''),
            nonce=request.headers.get('wechatpay-nonce', ''),
            signature=request.headers.get('wechatpay-signature', ''),
        )
        
        # 处理支付成功
        if result.get('trade_state') == 'SUCCESS':
            out_trade_no = result['out_trade_no']  # AIIMG_{order_id}
            order_id = int(out_trade_no.replace('AIIMG_', ''))
            
            # 原子更新订单状态
            from sqlalchemy import update as sa_update
            update_result = await db.execute(
                sa_update(Order)
                .where(Order.id == order_id, Order.payment_status != 'completed')
                .values(payment_status='completed', transaction_id=result['transaction_id'])
            )
            
            if update_result.rowcount > 0:
                # 增加积分
                order = await db.get(Order, order_id)
                user = await db.get(User, order.user_id)
                user.credits = (user.credits or 0) + order.credits
                
                transaction = CreditTransaction(
                    user_id=user.id,
                    amount=order.credits,
                    balance_after=user.credits,
                    transaction_type="purchase",
                    reference_type="order",
                    reference_id=order.id,
                    description=f"微信支付获得积分: {order.credits}积分"
                )
                db.add(transaction)
                await db.commit()
        
        return {"code": "SUCCESS", "message": "成功"}
    except Exception as e:
        logger.error(f"Wechat notify error: {e}")
        return {"code": "FAIL", "message": str(e)}
```

### 2.5 前端实现

#### 2.5.1 新增二维码组件

创建 `frontend/src/components/QRCode.tsx`：

```tsx
import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeProps {
  text: string;
  size?: number;
}

export const QRCodeDisplay: React.FC<QRCodeProps> = ({ text, size = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, text, {
        width: size,
        margin: 2,
      });
    }
  }, [text, size]);
  
  return <canvas ref={canvasRef} />;
};
```

安装依赖：`npm install qrcode`

#### 2.5.2 修改定价页支付弹窗

在 `PricingPage.tsx` 的确认弹窗中添加微信支付选项：

```tsx
// 添加微信支付状态
const [paymentMethod, setPaymentMethod] = useState<'demo' | 'wechat'>('wechat');
const [qrCode, setQrCode] = useState('');
const [pollTimer, setPollTimer] = useState<any>(null);

// 微信支付处理
const handleWechatPay = async () => {
  if (!selectedPackage) return;
  
  setProcessing(true);
  try {
    const result = await paymentService.createWechatPay(selectedPackage.id);
    setQrCode(result.code_url);
    setPaymentMethod('wechat');
    
    // 轮询订单状态
    const timer = setInterval(async () => {
      const order = await paymentService.getOrder(result.order_id);
      if (order.payment_status === 'completed') {
        clearInterval(timer);
        setProcessing(false);
        await fetchUser();
        navigate('/payment/success');
      }
    }, 3000);
    setPollTimer(timer);
  } catch (error) {
    setProcessing(false);
    toast.error('创建支付订单失败');
  }
};
```

### 2.6 Nginx 配置

确保 Webhook 回调地址可访问：

```nginx
# 微信支付回调
location /api/v1/payment/wechat-notify {
    proxy_pass http://ai-image-backend:8000/api/v1/payment/wechat-notify;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## 三、支付宝集成方案（备选）

### 3.1 接入准备

1. 注册 [支付宝开放平台](https://open.alipay.com)
2. 创建应用
3. 获取 `app_id`、`private_key`、`alipay_public_key`

### 3.2 环境变量

```bash
ALIPAY_APP_ID=your_app_id
ALIPAY_PRIVATE_KEY=your_private_key
ALIPAY_PUBLIC_KEY=alipay_public_key
ALIPAY_NOTIFY_URL=https://image.onlygocloud.top/api/v1/payment/alipay-notify
```

### 3.3 后端实现

安装依赖：`pip install alipay-sdk-python`

创建 `backend/app/services/alipay_service.py`，实现类似微信支付的接口。

---

## 四、完善现有功能

### 4.1 退款功能

#### 4.1.1 后端 API

在 `payment.py` 添加退款接口：

```python
@router.post("/order/{order_id}/refund", response_model=dict)
async def refund_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """申请退款"""
    order = await db.get(Order, order_id)
    if not order or order.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if order.payment_status != 'completed':
        raise HTTPException(status_code=400, detail="订单未支付")
    
    # 检查是否在 7 天内
    from datetime import timedelta
    if datetime.now() - order.created_at > timedelta(days=7):
        raise HTTPException(status_code=400, detail="超过退款期限（7天）")
    
    # 执行退款
    if order.payment_method == 'wechat':
        wechat_service = WechatPayService()
        wechat_service.refund(order_id, order.amount, order.amount)
    elif order.payment_method == 'stripe':
        stripe_lib.Refund.create(payment_intent=order.stripe_payment_intent_id)
    
    # 更新订单状态
    order.payment_status = 'refunded'
    
    # 扣除积分
    user = await db.get(User, order.user_id)
    user.credits = max(0, (user.credits or 0) - order.credits)
    
    # 记录退款流水
    transaction = CreditTransaction(
        user_id=user.id,
        amount=-order.credits,
        balance_after=user.credits,
        transaction_type="refund",
        reference_type="order",
        reference_id=order.id,
        description=f"退款扣除积分: {order.credits}积分"
    )
    db.add(transaction)
    await db.commit()
    
    return {"success": True, "message": "退款成功"}
```

### 4.2 订单超时取消

#### 4.2.1 Celery 定时任务

创建 `backend/app/celery_tasks/payment_tasks.py`：

```python
from celery.schedules import crontab
from sqlalchemy import select, update
from ..core.celery_app import celery_app
from ..core.database import SessionLocal
from ..models.subscription import Order

@celery_app.task
def cancel_expired_orders():
    """取消超过 30 分钟的待支付订单"""
    from datetime import datetime, timedelta
    
    db = SessionLocal()
    try:
        expired_time = datetime.now() - timedelta(minutes=30)
        
        # 查询超时的待支付订单
        result = db.execute(
            select(Order).where(
                Order.payment_status == 'pending',
                Order.created_at < expired_time
            )
        )
        expired_orders = result.scalars().all()
        
        for order in expired_orders:
            order.payment_status = 'cancelled'
        
        db.commit()
        print(f"Cancelled {len(expired_orders)} expired orders")
    finally:
        db.close()

# 在 Celery beat schedule 中添加
celery_app.conf.beat_schedule = {
    'cancel-expired-orders-every-10-minutes': {
        'task': 'app.celery_tasks.payment_tasks.cancel_expired_orders',
        'schedule': crontab(minute='*/10'),
    },
}
```

### 4.3 配置 Stripe 环境变量

在 `infrastructure/.env` 添加：

```bash
STRIPE_API_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

在 `docker-compose.yml` 的 backend 和 celery-worker 服务添加：

```yaml
environment:
  - STRIPE_API_KEY=${STRIPE_API_KEY:-}
  - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-}
```

---

## 五、实施步骤

### 阶段一：基础配置（1-2 天）

| 步骤 | 内容 | 预计时间 |
|------|------|---------|
| 1 | 注册微信支付商户号 | 1 天（审核） |
| 2 | 配置环境变量 | 0.5 天 |
| 3 | 安装依赖 `wechatpayv3` | 0.5 天 |

### 阶段二：微信支付集成（2-3 天）

| 步骤 | 内容 | 预计时间 |
|------|------|---------|
| 1 | 实现 `WechatPayService` | 1 天 |
| 2 | 新增支付 API 端点 | 1 天 |
| 3 | 前端集成二维码支付 | 1 天 |
| 4 | 测试支付流程 | 0.5 天 |

### 阶段三：完善功能（1-2 天）

| 步骤 | 内容 | 预计时间 |
|------|------|---------|
| 1 | 实现退款功能 | 0.5 天 |
| 2 | 订单超时取消任务 | 0.5 天 |
| 3 | 配置 Stripe 密钥 | 0.5 天 |
| 4 | 端到端测试 | 0.5 天 |

### 阶段四：上线部署（1 天）

| 步骤 | 内容 | 预计时间 |
|------|------|---------|
| 1 | 构建并推送镜像 | 0.5 天 |
| 2 | 生产环境部署 | 0.5 天 |

---

## 六、安全注意事项

1. **API 密钥安全**：密钥存储在 `.env` 中，不提交到 Git
2. **回调签名验证**：必须验证微信支付回调签名，防止伪造请求
3. **原子更新**：使用 `WHERE payment_status != 'completed'` 防止重复充值
4. **金额校验**：回调时校验实际支付金额与订单金额是否一致
5. **退款权限**：用户退款需验证订单归属和退款期限

---

## 七、总结

| 项目 | 状态 |
|------|------|
| 套餐系统 | ✅ 已完成 |
| 订单系统 | ✅ 已完成 |
| 演示支付 | ✅ 已完成 |
| Stripe 支付 | ⚠️ 框架完成，需配置密钥 |
| 微信支付 | ❌ 待实现 |
| 支付宝 | ❌ 待实现 |
| 退款功能 | ❌ 待实现 |
| 订单超时 | ❌ 待实现 |

**推荐优先实施微信支付**，因为国内用户覆盖率高，集成成本相对较低。