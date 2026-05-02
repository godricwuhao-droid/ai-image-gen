import { Layout, Menu, Badge, Avatar, Dropdown } from 'antd';
import { useNavigate, useLocation, Outlet } from 'umi';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  PictureOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import React, { useState, useEffect } from 'react';
import './AppLayout.less';

const { Sider, Content, Header } = Layout;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

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
      <div className="loading-container">
        <div className="loading-spinner" />
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

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      handleLogout();
    }
  };

  const getUserInfo = () => {
    try {
      const userStr = localStorage.getItem('admin_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.name || user.email?.split('@')[0] || 'Admin';
      }
    } catch (e) {
      console.error('Failed to parse user info:', e);
    }
    return 'Admin';
  };

  return (
    <Layout className="admin-layout">
      <Sider
        className="admin-sider"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
        collapsedWidth={80}
      >
        <div className="admin-logo">
          <CloudOutlined className="admin-logo-icon" />
          {!collapsed && <span className="admin-logo-text">AI 管理后台</span>}
        </div>
        <Menu
          className="admin-menu"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={menuItems}
        />
      </Sider>
      <Layout className="admin-layout-main">
        <Header className="admin-header">
          <div className="admin-header-left">
            <h2 className="admin-page-title">
              {menuItems.find((item) => item.key === location.pathname)?.label || '仪表盘'}
            </h2>
          </div>
          <div className="admin-header-right">
            <Badge count={3} className="admin-notification">
              <BellOutlined />
            </Badge>
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              placement="bottomRight"
              arrow
            >
              <div className="admin-user-info">
                <Avatar
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    verticalAlign: 'middle',
                  }}
                >
                  {getUserInfo().charAt(0).toUpperCase()}
                </Avatar>
                <span className="admin-username">{getUserInfo()}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
