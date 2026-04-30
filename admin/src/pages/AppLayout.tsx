import { Layout, Menu, theme } from 'antd';
import { useNavigate, useLocation, Outlet } from 'umi';
import { 
  DashboardOutlined, 
  UserOutlined, 
  ShoppingCartOutlined, 
  DollarOutlined, 
  PictureOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import React, { useState, useEffect } from 'react';

const { Sider, Content, Header } = Layout;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const { token } = theme.useToken();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/login');
      return;
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#FAFAF8'
      }}>
        <div style={{ color: '#8B7355', fontSize: 16 }}>加载中...</div>
      </div>
    );
  }

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/users/list', icon: <UserOutlined />, label: '用户管理' },
    { key: '/orders/list', icon: <ShoppingCartOutlined />, label: '订单管理' },
    { key: '/credits/manage', icon: <DollarOutlined />, label: '积分管理' },
    { key: '/generations/list', icon: <PictureOutlined />, label: '生成记录' },
    { key: '/templates/list', icon: <FileTextOutlined />, label: '模板管理' },
    { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <Sider 
        collapsible 
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={220}
        style={{ 
          background: '#FFFFFF',
          borderRight: '1px solid #E8E6E1',
          boxShadow: '2px 0 8px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: '#8B7355', 
          fontSize: 18, 
          fontWeight: 600,
          borderBottom: '1px solid #E8E6E1',
          background: '#FAFAF8'
        }}>
          {collapsed ? 'AI' : '✨ AI管理后台'}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={menuItems}
          style={{ 
            background: '#FFFFFF',
            borderRight: 'none',
            fontSize: 14
          }}
          selectedColor="#8B7355"
        />
      </Sider>
      <Layout style={{ background: '#FAFAF8' }}>
        <Header style={{ 
          padding: '0 24px', 
          background: '#FFFFFF', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center',
          borderBottom: '1px solid #E8E6E1',
          height: 64
        }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12,
              cursor: 'pointer',
              color: '#6B6B6B',
              padding: '8px 16px',
              borderRadius: 8,
              transition: 'all 0.2s'
            }}
            onClick={handleLogout}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F5F5F5';
              e.currentTarget.style.color = '#8B7355';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#6B6B6B';
            }}
          >
            <LogoutOutlined />
            <span>退出登录</span>
          </div>
        </Header>
        <Content style={{ 
          margin: 24, 
          padding: 24, 
          background: '#FFFFFF', 
          minHeight: 280, 
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
