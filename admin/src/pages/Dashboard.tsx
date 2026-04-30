import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin, Empty, Alert } from 'antd';
import { UserOutlined, PictureOutlined, DollarOutlined, RiseOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { statsService } from '../services/api';

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
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 24px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24, color: '#2C2C2C' }}>数据概览</h1>
      
      {error && (
        <Alert
          message="数据加载失败"
          description={error}
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="用户总数"
              value={stats.total_users}
              prefix={<UserOutlined style={{ color: '#8B7355' }} />}
              valueStyle={{ color: '#2C2C2C' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="生成图片数"
              value={stats.total_generations}
              prefix={<PictureOutlined style={{ color: '#8B7355' }} />}
              valueStyle={{ color: '#2C2C2C' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="总收入"
              value={stats.total_revenue}
              prefix={<DollarOutlined style={{ color: '#8B7355' }} />}
              suffix="USD"
              precision={2}
              valueStyle={{ color: '#2C2C2C' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="本月增长"
              value={stats.growth_rate}
              prefix={<RiseOutlined style={{ color: stats.growth_rate > 0 ? '#4CAF50' : '#F44336' }} />}
              suffix="%"
              valueStyle={{ color: stats.growth_rate > 0 ? '#4CAF50' : '#F44336' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="本月新用户"
              value={stats.monthly_new_users}
              prefix={<UserOutlined style={{ color: '#8B7355' }} />}
              valueStyle={{ color: '#2C2C2C' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="总订单数"
              value={stats.total_orders}
              prefix={<DollarOutlined style={{ color: '#8B7355' }} />}
              valueStyle={{ color: '#2C2C2C' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="已完成订单"
              value={stats.completed_orders}
              prefix={<CheckCircleOutlined style={{ color: '#4CAF50' }} />}
              valueStyle={{ color: '#4CAF50' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="待处理生成"
              value={stats.pending_generations + stats.processing_generations}
              prefix={<ClockCircleOutlined style={{ color: '#FF9800' }} />}
              valueStyle={{ color: '#FF9800' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="成功生成"
              value={stats.completed_generations}
              prefix={<CheckCircleOutlined style={{ color: '#4CAF50' }} />}
              valueStyle={{ color: '#2C2C2C' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="失败生成"
              value={stats.failed_generations}
              prefix={<CloseCircleOutlined style={{ color: '#F44336' }} />}
              valueStyle={{ color: '#F44336' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
