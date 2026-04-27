import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import {
  CreditCardIcon,
  PhotoIcon,
  HeartIcon,
  SparklesIcon,
  ShoppingBagIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  CalendarIcon,
  ShieldCheckIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, fetchUser } = useStore();

  const daysSinceRegistration = useMemo(() => {
    if (!user?.created_at) return 0;
    const created = new Date(user.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }, [user?.created_at]);

  if (!isAuthenticated || !user) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{background: 'var(--color-accent-gradient)'}}>
            <UserIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4" style={{color: 'var(--color-text)'}}>请先登录</h2>
          <p className="text-lg mb-8" style={{color: 'var(--color-text-muted)'}}>登录后即可访问个人中心</p>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary btn-lg"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    toast.success('已退出登录');
    navigate('/');
  };

  const handleRefresh = async () => {
    try {
      await fetchUser();
      toast.success('数据已刷新');
    } catch {
      toast.error('刷新失败');
    }
  };

  const stats = [
    { 
      label: '积分余额', 
      value: user.credits || 0, 
      icon: SparklesIcon, 
      gradient: 'var(--color-accent-gradient)'
    },
    { 
      label: '总生成', 
      value: user.total_generations || 0, 
      icon: PhotoIcon, 
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)'
    },
    { 
      label: '收藏数', 
      value: 0, 
      icon: HeartIcon, 
      gradient: 'linear-gradient(135deg, #EF4444 0%, #EC4899 100%)'
    },
    { 
      label: '使用天数', 
      value: daysSinceRegistration, 
      icon: CalendarIcon, 
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #EAB308 100%)'
    },
  ];

  const menuItems = [
    { 
      icon: ShoppingBagIcon, 
      label: '我的订单', 
      description: '查看购买记录', 
      path: '/orders', 
      gradient: 'var(--color-accent-gradient)'
    },
    { 
      icon: CreditCardIcon, 
      label: '积分充值', 
      description: '购买积分套餐', 
      path: '/pricing', 
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)'
    },
    { 
      icon: HeartIcon, 
      label: '我的收藏', 
      description: '查看收藏的图片', 
      path: '/favorites', 
      gradient: 'linear-gradient(135deg, #EF4444 0%, #EC4899 100%)'
    },
    { 
      icon: PhotoIcon, 
      label: '生成历史', 
      description: '查看历史记录', 
      path: '/history', 
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)'
    },
  ];

  return (
    <div className="page-container">
      <header className="nav-bar">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="nav-logo-icon">AI</div>
              <span className="text-xl font-bold gradient-text">个人中心</span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link to="/gallery" className="nav-link">画廊</Link>
              <Link to="/templates" className="nav-link">模板</Link>
              <Link to="/pricing" className="nav-link">定价</Link>
              <button
                onClick={handleRefresh}
                className="nav-link"
                title="刷新数据"
              >
                <SparklesIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="nav-link group"
                title="退出登录"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 group-hover:text-red-500 transition-colors" style={{color: 'var(--color-text-subtle)'}} />
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-12 space-y-8">
        <div className="card-elevated p-8">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="relative flex-shrink-0">
              <div className="w-28 h-28 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg" style={{background: 'var(--color-accent-gradient)'}}>
                {user.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              {user.is_superuser && (
                <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full flex items-center justify-center shadow-lg" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'}}>
                  <ShieldCheckIcon className="w-7 h-7 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3 mb-3">
                <h2 className="text-3xl font-bold" style={{color: 'var(--color-text)'}}>{user.username}</h2>
                {user.is_superuser && (
                  <span className="badge" style={{background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)'}}>
                    VIP会员
                  </span>
                )}
              </div>
              <p className="mb-2" style={{color: 'var(--color-text-muted)'}}>{user.email}</p>
              <div className="flex items-center gap-4 justify-center lg:justify-start text-sm" style={{color: 'var(--color-text-subtle)'}}>
                <span>注册于 {new Date(user.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span>•</span>
                <span>ID: #{user.id}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {!user.is_superuser && (
                <button
                  onClick={() => navigate('/pricing')}
                  className="btn"
                  style={{background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)', color: 'white'}}
                >
                  <SparklesIcon className="w-5 h-5" />
                  升级会员
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="btn btn-primary"
              >
                <PlusCircleIcon className="w-5 h-5" />
                开始创作
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card hover-lift">
              <div className="stat-icon" style={{background: stat.gradient}}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <p className="stat-value">{stat.value}</p>
              <p className="stat-label">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card-elevated p-6">
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{color: 'var(--color-text)'}}>
              <SparklesIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
              功能菜单
            </h3>
            <div className="space-y-3">
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  to={item.path}
                  className="menu-item group"
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: item.gradient}}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold" style={{color: 'var(--color-text)'}}>{item.label}</h4>
                    <p className="text-sm" style={{color: 'var(--color-text-muted)'}}>{item.description}</p>
                  </div>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center transition-colors" style={{background: 'var(--color-accent-light)', color: 'var(--color-accent)'}}>
                    →
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <div className="card-elevated p-6">
              <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{color: 'var(--color-text)'}}>
                <UserIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                快捷操作
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <Link
                  to="/"
                  className="card p-4 text-center hover-lift group"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-110" style={{background: 'var(--color-accent-light)'}}>
                    <SparklesIcon className="w-6 h-6" style={{color: 'var(--color-accent)'}} />
                  </div>
                  <span className="text-sm font-medium" style={{color: 'var(--color-text)'}}>开始创作</span>
                </Link>
                <Link
                  to="/gallery"
                  className="card p-4 text-center hover-lift group"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-110" style={{background: 'rgba(59, 130, 246, 0.1)'}}>
                    <PhotoIcon className="w-6 h-6" style={{color: '#3B82F6'}} />
                  </div>
                  <span className="text-sm font-medium" style={{color: 'var(--color-text)'}}>浏览画廊</span>
                </Link>
                <Link
                  to="/templates"
                  className="card p-4 text-center hover-lift group"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-110" style={{background: 'rgba(236, 72, 153, 0.1)'}}>
                    <HeartIcon className="w-6 h-6" style={{color: '#EC4899'}} />
                  </div>
                  <span className="text-sm font-medium" style={{color: 'var(--color-text)'}}>查看模板</span>
                </Link>
              </div>
            </div>

            <div className="card-elevated p-6">
              <h3 className="text-lg font-bold mb-5 flex items-center gap-2" style={{color: 'var(--color-text)'}}>
                <ShieldCheckIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                账户信息
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3" style={{borderBottom: '1px solid var(--color-border)'}}>
                  <span style={{color: 'var(--color-text-muted)'}}>用户ID</span>
                  <span className="font-mono font-semibold" style={{color: 'var(--color-text)'}}>#{user.id}</span>
                </div>
                <div className="flex items-center justify-between py-3" style={{borderBottom: '1px solid var(--color-border)'}}>
                  <span style={{color: 'var(--color-text-muted)'}}>账户类型</span>
                  <span className={user.is_superuser ? 'badge' : 'badge badge-success'}>
                    {user.is_superuser ? 'VIP会员' : '普通用户'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span style={{color: 'var(--color-text-muted)'}}>账户状态</span>
                  <span className={user.is_active ? 'badge badge-success' : 'badge'} style={!user.is_active ? {color: 'var(--color-danger)', background: 'rgba(244, 67, 54, 0.1)', borderColor: 'rgba(244, 67, 54, 0.3)'} : {}}>
                    {user.is_active ? '正常' : '已禁用'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
