import React, { useEffect, useState } from 'react';
import { Form, Input, Button, message, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, CloudOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { authService } from '../services/api';
import './index.less';

const STORAGE_KEY = 'admin_login_credentials';

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [visiblePassword, setVisiblePassword] = useState(false);

  useEffect(() => {
    setMounted(true);

    const token = localStorage.getItem('admin_token');
    if (token && mounted) {
      window.location.href = '/dashboard';
    }

    const savedCredentials = localStorage.getItem(STORAGE_KEY);
    if (savedCredentials) {
      try {
        const { username, password } = JSON.parse(savedCredentials);
        if (username && password) {
          form.setFieldsValue({ username, password });
          setRememberPassword(true);
        }
      } catch (error) {
        console.error('Failed to parse saved credentials:', error);
      }
    }
  }, [mounted, form]);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRememberPassword(e.target.checked);
  };

  const onFinish = async (values: any) => {
    try {
      setLoading(true);

      if (rememberPassword) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ username: values.username, password: values.password })
        );
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }

      await authService.login(values.username, values.password);
      message.success('登录成功');
      window.location.href = '/dashboard';
    } catch (error) {
      message.error('登录失败，请检查邮箱和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-bg">
        <div className="login-circle circle-1" />
        <div className="login-circle circle-2" />
        <div className="login-circle circle-3" />
      </div>
      <div className="login-content">
        <div className="login-header">
          <div className="login-logo">
            <CloudOutlined />
          </div>
          <h1 className="login-title">AI 图片生成平台</h1>
          <p className="login-subtitle">管理后台</p>
        </div>
        <div className="login-card">
          <h2 className="login-card-title">欢迎登录</h2>
          <Form
            form={form}
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入邮箱' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入邮箱"
              />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input
                type={visiblePassword ? 'text' : 'password'}
                prefix={<LockOutlined />}
                suffix={
                  <span
                    onClick={() => setVisiblePassword(!visiblePassword)}
                    style={{ cursor: 'pointer', padding: '0 4px' }}
                  >
                    {visiblePassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </span>
                }
                placeholder="请输入密码"
              />
            </Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Checkbox
                checked={rememberPassword}
                onChange={handleCheckboxChange}
              >
                记住密码
              </Checkbox>
            </div>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
              >
                登录
              </Button>
            </Form.Item>
          </Form>
        </div>
        <div className="login-footer">
          © 2024 AI Image Generation Platform
        </div>
      </div>
    </div>
  );
};

export default Login;
