import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../services/api';

const TURNSTILE_SITE_KEY = '0x4AAAAAADIql4cCTMzXnJcJ';

declare global {
  interface Window {
    turnstile: any;
  }
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const { login, isLoading, error } = useStore();
  const navigate = useNavigate();

  // 加载 Cloudflare Turnstile SDK
  useEffect(() => {
    if (document.querySelector('script[src*="challenges.cloudflare.com"]')) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  // 初始化 Turnstile widget
  useEffect(() => {
    const init = () => {
      if (window.turnstile && turnstileRef.current && !turnstileRef.current.querySelector('.cf-turnstile')) {
        window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'light',
          callback: (token: string) => setTurnstileToken(token),
          'error-callback': () => toast.error('人机验证失败，请重试'),
          'expiry-callback': () => {
            setTurnstileToken('');
            if (window.turnstile) {
              window.turnstile.reset();
            }
          },
        });
      }
    };
    const timer = setInterval(() => {
      if (window.turnstile) {
        clearInterval(timer);
        init();
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // 清理 Turnstile
  useEffect(() => {
    return () => {
      if (window.turnstile && turnstileRef.current) {
        const widgetId = window.turnstile.getWidget(turnstileRef.current);
        if (widgetId !== undefined) {
          window.turnstile.remove(widgetId);
        }
      }
    };
  }, []);

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

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (emailError || !email) {
      toast.error('请输入有效的邮箱和密码');
      return;
    }

    if (!turnstileToken) {
      toast.error('请完成人机验证');
      return;
    }

    try {
      // 后端验证 Turnstile token
      await api.post('/auth/verify-turnstile', { token: turnstileToken });
      // 执行登录
      await login(email, password);
      toast.success('登录成功');
      navigate('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || '登录失败');
      // 重置 Turnstile
      if (window.turnstile) {
        window.turnstile.reset();
        setTurnstileToken('');
      }
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
                onChange={handleEmailChange}
                className="input pl-12 pr-4"
                placeholder="输入您的邮箱"
                style={{borderColor: emailError ? 'var(--color-danger)' : undefined}}
                required
              />
            </div>
            {emailError && (
              <p className="text-sm mt-1" style={{color: 'var(--color-danger)'}}>
                {emailError}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium" style={{color: 'var(--color-text)'}}>
                密码
              </label>
              <Link
                to="/forgot-password"
                className="text-sm hover:underline"
                style={{color: 'var(--color-accent)'}}
              >
                忘记密码？
              </Link>
            </div>
            <div className="relative">
              <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{color: 'var(--color-text-subtle)'}} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-12 pr-12"
                placeholder="输入您的密码"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                style={{color: 'var(--color-text-muted)'}}
              >
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Cloudflare Turnstile 人机验证 */}
          <div className="flex justify-center">
            <div ref={turnstileRef} />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-purple-600"
              />
              <span className="text-sm" style={{color: 'var(--color-text-muted)'}}>
                7天内自动登录
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || !!emailError}
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
