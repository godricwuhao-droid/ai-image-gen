import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { 
  ShoppingBagIcon, 
  CreditCardIcon, 
  CheckCircleIcon, 
  ClockIcon,
  XCircleIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { paymentService, type Order } from '../services/api';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOrders(currentPage);
  }, [isAuthenticated, currentPage]);

  const fetchOrders = async (page: number) => {
    try {
      setLoading(true);
      const data = await paymentService.getMyOrders(page, pageSize);
      setOrders(data.orders);
      setTotalPages(Math.ceil(data.total / pageSize));
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircleIcon,
          color: 'var(--color-success)',
          bg: 'rgba(76, 175, 80, 0.1)',
          text: '已完成'
        };
      case 'pending':
        return {
          icon: ClockIcon,
          color: 'var(--color-warning)',
          bg: 'rgba(255, 152, 0, 0.1)',
          text: '待支付'
        };
      case 'failed':
        return {
          icon: XCircleIcon,
          color: 'var(--color-danger)',
          bg: 'rgba(244, 67, 54, 0.1)',
          text: '失败'
        };
      default:
        return {
          icon: ClockIcon,
          color: 'var(--color-text-subtle)',
          bg: 'var(--color-border-subtle)',
          text: status
        };
    }
  };

  const completedOrders = orders.filter(o => o.payment_status === 'completed');
  const totalCredits = completedOrders.reduce((sum, o) => sum + o.credits, 0);
  const totalSpent = completedOrders.reduce((sum, o) => sum + Number(o.amount), 0);

  if (loading && orders.length === 0) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 animate-spin" style={{borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)', borderWidth: '4px'}}></div>
          <p style={{color: 'var(--color-text-muted)'}}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="nav-bar">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="nav-logo-icon">AI</div>
              <span className="text-xl font-bold gradient-text">我的订单</span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link to="/gallery" className="nav-link">画廊</Link>
              <Link to="/templates" className="nav-link">模板</Link>
              <Link to="/pricing" className="nav-link">定价</Link>
              {isAuthenticated ? (
                <Link to="/profile" className="btn btn-primary">个人中心</Link>
              ) : (
                <Link to="/login" className="btn btn-primary">登录</Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'var(--color-accent-gradient)'}}>
              <ShoppingBagIcon className="w-6 h-6 text-white" />
            </div>
            <div className="stat-value">{orders.length}</div>
            <div className="stat-label">全部订单</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'}}>
              <ArrowTrendingUpIcon className="w-6 h-6 text-white" />
            </div>
            <div className="stat-value">{totalCredits.toLocaleString()}</div>
            <div className="stat-label">累计积分</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #FF9800 0%, #f57c00 100%)'}}>
              <CreditCardIcon className="w-6 h-6 text-white" />
            </div>
            <div className="stat-value">¥{totalSpent.toFixed(2)}</div>
            <div className="stat-label">累计消费</div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-16 h-16 rounded-full animate-spin" style={{borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)', borderWidth: '4px'}}></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 card-elevated p-12">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{background: 'var(--color-accent-light)'}}>
              <ShoppingBagIcon className="w-10 h-10" style={{color: 'var(--color-accent)'}} />
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{color: 'var(--color-text)'}}>暂无订单记录</h2>
            <p className="text-lg mb-8" style={{color: 'var(--color-text-muted)'}}>购买积分以开启AI图像创作之旅</p>
            <Link
              to="/pricing"
              className="btn btn-primary inline-block"
            >
              购买积分
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusInfo = getStatusInfo(order.payment_status);
              const StatusIcon = statusInfo.icon;
              
              return (
                <div key={order.id} className="card hover-lift">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background: statusInfo.bg}}>
                          <StatusIcon className="w-6 h-6" style={{color: statusInfo.color}} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold" style={{color: 'var(--color-text)'}}>
                              订单 #{order.id}
                            </h3>
                            <span 
                              className="px-3 py-1 rounded-full text-xs font-medium"
                              style={{
                                background: statusInfo.bg,
                                color: statusInfo.color
                              }}
                            >
                              {statusInfo.text}
                            </span>
                          </div>
                          <p className="text-sm" style={{color: 'var(--color-text-muted)'}}>
                            {new Date(order.created_at).toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t" style={{borderColor: 'var(--color-border)'}}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{color: 'var(--color-text-muted)'}}>订单金额</span>
                        <span className="text-lg font-bold" style={{color: 'var(--color-text)'}}>
                          ¥{Number(order.amount).toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{color: 'var(--color-text-muted)'}}>获得积分</span>
                        <span className="text-lg font-bold" style={{color: 'var(--color-accent)'}}>
                          +{order.credits}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-end">
                        {order.payment_status === 'pending' && (
                          <button className="btn btn-primary btn-sm">
                            立即支付
                          </button>
                        )}
                        {order.payment_status === 'completed' && (
                          <Link to="/" className="btn btn-secondary btn-sm">
                            开始创作
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary"
              style={{opacity: currentPage === 1 ? 0.5 : 1}}
            >
              上一页
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={currentPage === pageNum ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{minWidth: '44px'}}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary"
              style={{opacity: currentPage === totalPages ? 0.5 : 1}}
            >
              下一页
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
