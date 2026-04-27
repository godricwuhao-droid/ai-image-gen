import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin, message } from 'antd';
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

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await statsService.getDashboard();
      setStats(data);
    } catch (error) {
      message.error('获取统计数据失败');
      console.error('Failed to fetch stats:', error);
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
    <div>
      <h1>管理后台首页</h1>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="用户总数"
              value={stats?.total_users || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="生成图片数"
              value={stats?.total_generations || 0}
              prefix={<PictureOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总收入"
              value={stats?.total_revenue || 0}
              prefix={<DollarOutlined />}
              suffix="USD"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月增长"
              value={stats?.growth_rate || 0}
              prefix={<RiseOutlined />}
              suffix="%"
              valueStyle={{ color: stats?.growth_rate && stats.growth_rate > 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月新用户"
              value={stats?.monthly_new_users || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总订单数"
              value={stats?.total_orders || 0}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成订单"
              value={stats?.completed_orders || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理生成"
              value={(stats?.pending_generations || 0) + (stats?.processing_generations || 0)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Card title="生成状态分布">
            <Statistic title="完成" value={stats?.completed_generations || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#3f8600' }} />
            <Statistic title="处理中" value={stats?.processing_generations || 0} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#1890ff' }} style={{ marginTop: 16 }} />
            <Statistic title="失败" value={stats?.failed_generations || 0} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#f5222d' }} style={{ marginTop: 16 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="用户活跃度">
            <Statistic title="日活跃生成" value={(stats?.total_generations || 0) / 30} suffix="张/天" precision={1} />
            <Statistic title="用户平均生成" value={stats?.total_users ? (stats.total_generations / stats.total_users).toFixed(1) : '0'} suffix="张" style={{ marginTop: 16 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="收入统计">
            <Statistic title="平均订单金额" value={stats?.completed_orders ? (stats.total_revenue / stats.completed_orders).toFixed(2) : '0'} suffix="USD" prefix="$" />
            <Statistic title="总收入" value={stats?.total_revenue || 0} prefix="$" suffix="USD" style={{ marginTop: 16 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;