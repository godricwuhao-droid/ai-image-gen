import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin, Alert, Typography, Button } from 'antd';
import {
  UserOutlined,
  PictureOutlined,
  DollarOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  ShoppingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { statsService } from '../services/api';
import './Dashboard.less';

const { Title } = Typography;

interface DashboardStats {
  total_users: number;
  total_generations: number;
  total_orders: number;
  completed_orders: number;
  total_revenue: number;
  pending_generations: number;
  processing_generations: number;
  completed_generations: number;
  failed_generations: number;
  monthly_new_users: number;
  growth_rate: number;
}

const defaultStats: DashboardStats = {
  total_users: 0,
  total_generations: 0,
  total_orders: 0,
  completed_orders: 0,
  total_revenue: 0,
  pending_generations: 0,
  processing_generations: 0,
  completed_generations: 0,
  failed_generations: 0,
  monthly_new_users: 0,
  growth_rate: 0,
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await statsService.getDashboard();
      setStats({
        total_users: data.total_users || 0,
        total_generations: data.total_generations || 0,
        total_orders: data.total_orders || 0,
        completed_orders: data.completed_orders || 0,
        total_revenue: data.total_revenue || 0,
        pending_generations: data.pending_generations || 0,
        processing_generations: data.processing_generations || 0,
        completed_generations: data.completed_generations || 0,
        failed_generations: data.failed_generations || 0,
        monthly_new_users: data.monthly_new_users || 0,
        growth_rate: data.growth_rate || 0,
      });
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
      setError(err.message || '获取统计数据失败，请确保后端服务正常运行');
      setStats(defaultStats);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <Title level={3} style={{ margin: 0, color: '#1a1a2e' }}>
            数据概览
          </Title>
          <p className="dashboard-subtitle">欢迎回来，这是今日的数据概览</p>
        </div>
        <Button type="primary" icon={<ReloadOutlined />}>
          刷新数据
        </Button>
      </div>

      {error && (
        <Alert
          message="数据加载失败"
          description={error}
          type="warning"
          showIcon
          className="dashboard-alert"
        />
      )}

      <div className="dashboard-stats">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card-primary" hoverable>
              <div className="stat-card-content">
                <div className="stat-icon">
                  <UserOutlined />
                </div>
                <div className="stat-info">
                  <Statistic
                    title="用户总数"
                    value={stats.total_users}
                    precision={0}
                  />
                </div>
              </div>
              <div className="stat-trend">
                <RiseOutlined />
                <span>+12% 较上月</span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card-success" hoverable>
              <div className="stat-card-content">
                <div className="stat-icon">
                  <PictureOutlined />
                </div>
                <div className="stat-info">
                  <Statistic
                    title="生成图片数"
                    value={stats.total_generations}
                    precision={0}
                  />
                </div>
              </div>
              <div className="stat-trend">
                <RiseOutlined />
                <span>+8% 较上月</span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card-warning" hoverable>
              <div className="stat-card-content">
                <div className="stat-icon">
                  <DollarOutlined />
                </div>
                <div className="stat-info">
                  <Statistic
                    title="总收入"
                    value={stats.total_revenue}
                    precision={2}
                    prefix="$"
                  />
                </div>
              </div>
              <div className="stat-trend">
                <RiseOutlined />
                <span>+15% 较上月</span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card stat-card-info" hoverable>
              <div className="stat-card-content">
                <div className="stat-icon">
                  <ShoppingOutlined />
                </div>
                <div className="stat-info">
                  <Statistic
                    title="总订单数"
                    value={stats.total_orders}
                    precision={0}
                  />
                </div>
              </div>
              <div className="stat-trend">
                <RiseOutlined />
                <span>+5% 较上月</span>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <div className="dashboard-section">
        <Title level={4} className="section-title">
          生成统计
        </Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="detail-card" hoverable>
              <div className="detail-card-icon success">
                <CheckCircleOutlined />
              </div>
              <div className="detail-card-content">
                <p className="detail-card-label">成功生成</p>
                <h3 className="detail-card-value">{stats.completed_generations}</h3>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="detail-card" hoverable>
              <div className="detail-card-icon warning">
                <ClockCircleOutlined />
              </div>
              <div className="detail-card-content">
                <p className="detail-card-label">待处理</p>
                <h3 className="detail-card-value">
                  {stats.pending_generations + stats.processing_generations}
                </h3>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="detail-card" hoverable>
              <div className="detail-card-icon error">
                <CloseCircleOutlined />
              </div>
              <div className="detail-card-content">
                <p className="detail-card-label">失败生成</p>
                <h3 className="detail-card-value">{stats.failed_generations}</h3>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="detail-card" hoverable>
              <div className="detail-card-icon info">
                <TeamOutlined />
              </div>
              <div className="detail-card-content">
                <p className="detail-card-label">本月新用户</p>
                <h3 className="detail-card-value">{stats.monthly_new_users}</h3>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <div className="dashboard-section">
        <Title level={4} className="section-title">
          订单统计
        </Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Card className="order-card" hoverable>
              <Row gutter={16} align="middle">
                <Col>
                  <div className="order-card-icon success">
                    <CheckCircleOutlined />
                  </div>
                </Col>
                <Col flex={1}>
                  <p className="order-card-label">已完成订单</p>
                  <h3 className="order-card-value">{stats.completed_orders}</h3>
                </Col>
              </Row>
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card className="order-card" hoverable>
              <Row gutter={16} align="middle">
                <Col>
                  <div className="order-card-icon primary">
                    <RiseOutlined />
                  </div>
                </Col>
                <Col flex={1}>
                  <p className="order-card-label">本月增长</p>
                  <h3 className="order-card-value">
                    {stats.growth_rate > 0 ? '+' : ''}
                    {stats.growth_rate}%
                  </h3>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Dashboard;
