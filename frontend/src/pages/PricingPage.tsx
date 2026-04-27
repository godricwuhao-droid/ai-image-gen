import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { CheckIcon, SparklesIcon, ShieldCheckIcon, XMarkIcon, ExclamationTriangleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { paymentService } from '../services/api';
import type { Package } from '../services/api';

const FAQ_ITEMS = [
  {
    question: '积分如何计算？',
    answer: '每次图片生成消耗积分。快速模式每张消耗 1 积分，标准质量每张消耗 10 积分，高清品质每张消耗 40 积分。',
  },
  {
    question: '积分会过期吗？',
    answer: '积分永久有效，没有过期时间。',
  },
  {
    question: '可以退款吗？',
    answer: '购买后 7 天内可申请全额退款。',
  },
];

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, fetchUser } = useStore();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const data = await paymentService.getPackages();
        setPackages(data);
      } catch (error) {
        console.error('Failed to fetch packages:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const handlePackageSelect = (pkg: Package) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setSelectedPackage(pkg);
    setShowConfirmModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPackage) return;
    
    setProcessing(true);
    try {
      const result = await paymentService.completeDemo(selectedPackage.id);
      await fetchUser();
      setShowConfirmModal(false);
      navigate('/payment/success', { 
        state: { credits: result.credits_added, newBalance: result.new_balance } 
      });
    } catch (error: any) {
      console.error('Payment failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelPayment = () => {
    setShowConfirmModal(false);
    setSelectedPackage(null);
  };

  const getPlanIcon = (index: number) => {
    if (index === 0) return <SparklesIcon className="w-8 h-8" />;
    if (index === packages.length - 1) return <ShieldCheckIcon className="w-8 h-8" />;
    return <SparklesIcon className="w-8 h-8" />;
  };

  return (
    <div className="page-container">
      <header className="nav-bar">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="nav-logo">
              <div className="nav-logo-icon">AI</div>
              <span className="text-xl font-bold gradient-text">图像生成器</span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link to="/gallery" className="nav-link">画廊</Link>
              <Link to="/templates" className="nav-link">模板</Link>
              <Link to="/pricing" className="nav-link nav-link-active">定价</Link>
              {isAuthenticated ? (
                <Link to="/profile" className="btn btn-primary">个人中心</Link>
              ) : (
                <Link to="/login" className="btn btn-primary">登录</Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <section className="page-header">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="page-header-title">
            <span className="gradient-text">选择适合您的套餐</span>
          </h1>
          <p className="page-header-subtitle">
            按需购买积分包，无最低消费，积分永久有效
          </p>
          {user && (
            <div className="mt-6 inline-flex items-center gap-2 card-elevated px-5 py-3 shadow-md">
              <SparklesIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
              <span style={{color: 'var(--color-text)'}}>
                当前积分: <strong className="gradient-text">{user.credits || 0}</strong>
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)'}}></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages.map((pkg, index) => (
              <div
                key={pkg.id}
                className={index === 1 ? 'pricing-card pricing-card-featured' : 'pricing-card'}
              >
                {index === 1 && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-medium text-white gradient-bg shadow-lg">
                    最受欢迎
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-5">
                  <div className="stat-icon gradient-bg text-white">
                    {getPlanIcon(index)}
                  </div>
                  <h3 className="text-xl font-bold" style={{color: 'var(--color-text)'}}>{pkg.name}</h3>
                </div>

                <div className="mb-5">
                  <span className="text-4xl font-bold" style={{color: 'var(--color-text)'}}>${pkg.price}</span>
                </div>

                <p className="mb-6" style={{color: 'var(--color-text-muted)'}}>
                  {pkg.description || `${pkg.credits} 积分`}
                </p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2" style={{color: 'var(--color-text)'}}>
                    <CheckIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                    <span>{pkg.credits} 积分</span>
                  </div>
                  <div className="flex items-center gap-2" style={{color: 'var(--color-text)'}}>
                    <CheckIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                    <span>永久有效</span>
                  </div>
                </div>

                <button
                  onClick={() => handlePackageSelect(pkg)}
                  className={index === 1 ? 'btn btn-primary w-full' : 'btn btn-secondary w-full'}
                >
                  立即购买
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center mb-8" style={{color: 'var(--color-text)'}}>
          常见问题
        </h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index} className="accordion-item">
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="accordion-trigger"
              >
                <span className="font-medium">{item.question}</span>
                <ChevronDownIcon 
                  className={`w-5 h-5 transition-transform ${expandedFaq === index ? 'rotate-180' : ''}`}
                  style={{color: 'var(--color-text-muted)'}}
                />
              </button>
              {expandedFaq === index && (
                <div className="accordion-content">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {showConfirmModal && selectedPackage && (
        <div className="modal-overlay" onClick={handleCancelPayment}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="gradient-bg p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">确认购买</h3>
                <button onClick={handleCancelPayment} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                  <XMarkIcon className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="card p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span style={{color: 'var(--color-text-muted)'}}>套餐名称</span>
                  <span className="font-medium" style={{color: 'var(--color-text)'}}>{selectedPackage.name}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span style={{color: 'var(--color-text-muted)'}}>获得积分</span>
                  <span className="font-medium gradient-text">{selectedPackage.credits} 积分</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{color: 'var(--color-text-muted)'}}>支付金额</span>
                  <span className="text-2xl font-bold" style={{color: 'var(--color-text)'}}>${selectedPackage.price}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl mb-6" style={{backgroundColor: 'rgba(255, 152, 0, 0.1)', border: '1px solid rgba(255, 152, 0, 0.3)'}}>
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 mt-0.5" style={{color: 'var(--color-warning)'}} />
                  <p className="text-sm" style={{color: 'var(--color-warning)'}}>
                    这是一个演示环境，购买将直接到账。真实环境会跳转到支付网关。
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleCancelPayment}
                  disabled={processing}
                  className="btn btn-secondary flex-1"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={processing}
                  className={`btn btn-primary flex-1 ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {processing ? '处理中...' : '确认支付'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
