import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { EnvelopeIcon, UserIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const { register, isLoading, error } = useStore();
  const navigate = useNavigate();

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError('');
    } else if (!emailRegex.test(value)) {
      setEmailError('请输入有效的邮箱地址');
    } else {
      setEmailError('');
    }
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError('');
    } else if (value.length < 6) {
      setPasswordError('密码至少6位字符');
    } else {
      setPasswordError('');
    }
  };

  const validateUsername = (value: string) => {
    if (!value) {
      setUsernameError('');
    } else if (value.length < 2) {
      setUsernameError('用户名至少2位字符');
    } else {
      setUsernameError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (emailError || usernameError || passwordError || confirmError) {
      toast.error('请修正表单错误');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    try {
      await register(email, username, password);
      toast.success('注册成功');
      navigate('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || '注册失败');
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
          <div className="p-4 rounded-xl mb-6" style={{backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)'}}>
            <p style={{color: 'var(--color-danger)', fontWeight: 500}}>{error}</p>
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
                onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value); }}
                className="input pl-12 pr-4"
                placeholder="输入您的邮箱"
                style={{borderColor: emailError ? 'var(--color-danger)' : undefined}}
                required
              />
            </div>
            {emailError && (
              <p className="text-sm mt-1" style={{color: 'var(--color-danger)'}}>{emailError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text)'}}>
              用户名
            </label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{color: 'var(--color-text-subtle)' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); validateUsername(e.target.value); }}
                className="input pl-12"
                placeholder="选择您的用户名"
                style={{borderColor: usernameError ? 'var(--color-danger)' : undefined}}
                required
              />
            </div>
            {usernameError && (
              <p className="text-sm mt-1" style={{color: 'var(--color-danger)'}}>{usernameError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text)'}}>
              密码
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{color: 'var(--color-text-subtle)'}} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); validatePassword(e.target.value); }}
                className="input pl-12 pr-12"
                placeholder="创建密码（至少6位"
                style={{borderColor: passwordError ? 'var(--color-danger)' : undefined}}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{color: 'var(--color-text-muted)'}}
              >
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-sm mt-1" style={{color: 'var(--color-danger)'}}>{passwordError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text)'}}>
              确认密码
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{color: 'var(--color-text-subtle)'}} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(e.target.value !== password ? '两次密码不一致' : ''); }}
                className="input pl-12 pr-12"
                placeholder="再次输入密码"
                style={{borderColor: confirmError ? 'var(--color-danger)' : undefined}}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{color: 'var(--color-text-muted)'}}
              >
                {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            {confirmError && (
              <p className="text-sm mt-1" style={{color: 'var(--color-danger)'}}>{confirmError}</p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !!emailError || !!usernameError || !!passwordError || !!confirmError}
            className={`btn btn-primary w-full ${isLoading || emailError || usernameError || passwordError || confirmError ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? '注册中...' : '注册'}
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
