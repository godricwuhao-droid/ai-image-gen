import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { EnvelopeIcon, UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register, isLoading, error } = useStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    try {
      await register(email, username, password);
      toast.success('注册成功');
      navigate('/');
    } catch (error) {
      toast.error('注册失败');
    }
  };

  return (
    <div className="page-container flex items-center justify-center p-6">
      <div className="card-elevated max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="nav-logo-icon mx-auto mb-4 w-16 h-16 text-2xl">AI</div>
          <h1 className="text-3xl font-bold gradient-text mb-2">创建账户</h1>
          <p style={{color: 'var(--color-text-muted)'}}>立即加入我们</p>
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
              用户名
            </label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{color: 'var(--color-text-subtle)'}} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input pl-12"
                placeholder="选择您的用户名"
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
                placeholder="创建密码"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text)'}}>
              确认密码
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{color: 'var(--color-text-subtle)'}} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input pl-12"
                placeholder="再次输入密码"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading} 
            className={`btn btn-primary w-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? '创建中...' : '创建账户'}
          </button>
        </form>

        <p className="mt-6 text-center" style={{color: 'var(--color-text-muted)'}}>
          已有账户？{' '}
          <Link 
            to="/login" 
            className="font-medium hover:underline"
            style={{color: 'var(--color-accent)'}}
          >
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
};
