#!/usr/bin/env python3
"""
管理后台API测试脚本
用法: python3 test_admin_apis.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """测试模块导入"""
    print("\n" + "="*60)
    print("测试1: 模块导入")
    print("="*60)
    
    try:
        from app.api.v1.endpoints.admin.admin_generations import router as gen_router
        print(f"✅ admin_generations 导入成功")
        print(f"   - 路由前缀: {gen_router.prefix}")
        print(f"   - 路由标签: {gen_router.tags}")
        
        routes = [r.path for r in gen_router.routes]
        print(f"   - 路由列表: {routes}")
    except Exception as e:
        print(f"❌ admin_generations 导入失败: {e}")
        return False

    try:
        from app.api.v1.endpoints.admin.admin_credits import router as credit_router
        print(f"✅ admin_credits 导入成功")
        print(f"   - 路由前缀: {credit_router.prefix}")
        print(f"   - 路由标签: {credit_router.tags}")
        
        routes = [r.path for r in credit_router.routes]
        print(f"   - 路由列表: {routes}")
    except Exception as e:
        print(f"❌ admin_credits 导入失败: {e}")
        return False

    try:
        from app.api.v1.endpoints.admin.admin_users import router as users_router
        print(f"✅ admin_users 导入成功")
    except Exception as e:
        print(f"❌ admin_users 导入失败: {e}")
        return False

    try:
        from app.api.v1.endpoints.admin.admin_orders import router as orders_router
        print(f"✅ admin_orders 导入成功")
    except Exception as e:
        print(f"❌ admin_orders 导入失败: {e}")
        return False

    try:
        from app.api.v1.endpoints.admin.admin_stats import router as stats_router
        print(f"✅ admin_stats 导入成功")
    except Exception as e:
        print(f"❌ admin_stats 导入失败: {e}")
        return False

    return True


def test_router_registration():
    """测试路由注册"""
    print("\n" + "="*60)
    print("测试2: 路由注册到主应用")
    print("="*60)
    
    try:
        from app.main import app
        
        print(f"✅ FastAPI应用创建成功")
        print(f"   - 应用标题: {app.title}")
        print(f"   - 应用版本: {app.version}")
        
        route_count = len(app.routes)
        print(f"   - 总路由数: {route_count}")
        
        admin_routes = [r for r in app.routes if '/admin' in r.path]
        print(f"   - 管理后台路由数: {len(admin_routes)}")
        
        print("\n   管理后台路由列表:")
        for route in sorted(admin_routes, key=lambda x: x.path):
            methods = getattr(route, 'methods', {'GET'})
            print(f"      {list(methods)[0]:6} {route.path}")
        
        return True
    except Exception as e:
        print(f"❌ 路由注册测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_api_endpoints():
    """测试API端点定义"""
    print("\n" + "="*60)
    print("测试3: API端点定义检查")
    print("="*60)
    
    from app.api.v1.endpoints.admin.admin_generations import (
        list_generations, get_generation, update_generation, 
        delete_generation, retry_generation
    )
    print("✅ admin_generations 端点:")
    print(f"   - list_generations: {list_generations.methods}")
    print(f"   - get_generation: {get_generation.methods}")
    print(f"   - update_generation: {update_generation.methods}")
    print(f"   - delete_generation: {delete_generation.methods}")
    print(f"   - retry_generation: {retry_generation.methods}")

    from app.api.v1.endpoints.admin.admin_credits import (
        list_user_credits, list_transactions, recharge_credits, 
        deduct_credits, get_user_credits
    )
    print("\n✅ admin_credits 端点:")
    print(f"   - list_user_credits: {list_user_credits.methods}")
    print(f"   - list_transactions: {list_transactions.methods}")
    print(f"   - recharge_credits: {recharge_credits.methods}")
    print(f"   - deduct_credits: {deduct_credits.methods}")
    print(f"   - get_user_credits: {get_user_credits.methods}")

    return True


def test_models():
    """测试数据模型"""
    print("\n" + "="*60)
    print("测试4: 数据模型检查")
    print("="*60)
    
    try:
        from app.models.user import User
        print(f"✅ User模型存在")
        
        from app.models.generation import Generation
        print(f"✅ Generation模型存在")
        
        from app.models.credit_transaction import CreditTransaction
        print(f"✅ CreditTransaction模型存在")
        
        from app.models.subscription import Order
        print(f"✅ Order模型存在")
        
        return True
    except Exception as e:
        print(f"❌ 模型检查失败: {e}")
        return False


def main():
    """主测试函数"""
    print("\n" + "="*60)
    print("🧪 管理后台API功能测试")
    print("="*60)
    
    results = []
    
    results.append(("模块导入", test_imports()))
    results.append(("路由注册", test_router_registration()))
    results.append(("API端点", test_api_endpoints()))
    results.append(("数据模型", test_models()))
    
    print("\n" + "="*60)
    print("📊 测试结果汇总")
    print("="*60)
    
    all_passed = True
    for name, passed in results:
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"   {name}: {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("🎉 所有测试通过！")
        print("\n后续步骤:")
        print("1. 启动Docker服务: docker-compose up -d")
        print("2. 测试API端点:")
        print("   - GET  /api/v1/admin/generations")
        print("   - GET  /api/v1/admin/credits")
        print("   - POST /api/v1/admin/credits/recharge")
    else:
        print("⚠️  部分测试失败，请检查错误信息")
    print("="*60 + "\n")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())