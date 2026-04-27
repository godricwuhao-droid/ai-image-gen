import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('登录成功');
      navigate('/');
    } catch (error) {
      toast.error('登录失败');
    }
  };

  return (
    <div className="page-container flex items-center justify-center p-6">
      <div className="card-elevated max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="nav-logo-icon mx-auto mb-4 w-16 h-16 text-2xl">AI</div>
          <h1 className="text-3xl font-bold gradient-text mb-2">欢迎回来</h1>
          <p style={{color: 'var(--color-text-muted)'}}>登录以继续创作</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl mb-6" style={{backgroundColor: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)'}}>
            <p style={{color: 'var(--color-danger)'}}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text)'}}>
              邮箱
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{color: 'var(--color-text-subtle)'}} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-12"
                placeholder="输入您的邮箱"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text)'}}>
              密码
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{color: 'var(--color-text-subtle)'}} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-12"
                placeholder="输入您的密码"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading} 
            className={`btn btn-primary w-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="mt-6 text-center" style={{color: 'var(--color-text-muted)'}}>
          还没有账户？{' '}
          <Link 
            to="/register" 
            className="font-medium hover:underline"
            style={{color: 'var(--color-accent)'}}
          >
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
};
