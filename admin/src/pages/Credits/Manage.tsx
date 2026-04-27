import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Spin, message, Button, Space, Modal, Input, Select, DatePicker } from 'antd';
import { CreditCardOutlined, DollarOutlined, CheckCircleOutlined, ReloadOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { userService, User } from '../services/api';
import dayjs from 'dayjs';

interface UserCredit {
  id: number;
  username: string;
  email: string;
  daily_generation_count: number;
  total_generations: number;
  created_at: string;
}

const CreditsManage: React.FC = () => {
  const [users, setUsers] = useState<UserCredit[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [stats, setStats] = useState({
    totalCredits: 0,
    totalSpent: 0,
    completedOrders: 0,
  });

  useEffect(() => {
    fetchUsers();
    calculateStats();
  }, [pagination.current, pagination.pageSize]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getList(pagination.current, pagination.pageSize);
      setUsers(data.users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        daily_generation_count: u.daily_generation_count,
        total_generations: u.total_generations,
        created_at: u.created_at,
      })));
      setPagination(prev => ({ ...prev, total: data.total }));
    } catch (error) {
      message.error('获取用户列表失败');
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async () => {
    try {
      const data = await userService.getList(1, 1000);
      const totalCredits = data.users.reduce((sum, u) => sum + (u.daily_generation_count || 0), 0);
      const totalGenerations = data.users.reduce((sum, u) => sum + (u.total_generations || 0), 0);
      setStats({
        totalCredits: totalCredits,
        totalSpent: totalGenerations * 0.02,
        completedOrders: totalGenerations,
      });
    } catch (error) {
      console.error('Failed to calculate stats:', error);
    }
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 150,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '今日生成',
      dataIndex: 'daily_generation_count',
      key: 'daily_generation_count',
      width: 120,
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count}</Tag>
      ),
    },
    {
      title: '总生成数',
      dataIndex: 'total_generations',
      key: 'total_generations',
      width: 120,
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (createdAt: string) => new Date(createdAt).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: UserCredit) => (
        <Space>
          <Button type="link" onClick={() => message.info('积分调整功能开发中')}>
            调整积分
          </Button>
          <Button type="link" onClick={() => message.info('查看详情功能开发中')}>
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>积分管理</h2>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="总生成次数"
              value={stats.totalCredits}
              prefix={<CreditCardOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="估算消耗"
              value={stats.totalSpent}
              prefix={<DollarOutlined />}
              suffix="USD"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已完成生成"
              value={stats.completedOrders}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('添加积分功能开发中')}>
          添加积分
        </Button>
        <Button icon={<ReloadOutlined />} onClick={() => { fetchUsers(); calculateStats(); }}>
          刷新
        </Button>
        <Button icon={<SearchOutlined />}>
          搜索用户
        </Button>
      </Space>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize }));
            },
          }}
        />
      )}
    </div>
  );
};

export default CreditsManage;