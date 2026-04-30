import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Modal, message, Popconfirm, Input, Card, Row, Col, Statistic, InputNumber } from 'antd';
import { PlusOutlined, EyeOutlined, StopOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined, DollarOutlined } from '@ant-design/icons';
import { userService, creditService, User } from '../../services/api';

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState<number>(0);
  const [rechargeDescription, setRechargeDescription] = useState('');
  const [rechargeLoading, setRechargeLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [pagination.current, pagination.pageSize]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getList(pagination.current, pagination.pageSize);
      setUsers(data.users);
      setPagination(prev => ({ ...prev, total: data.total }));
    } catch (error) {
      message.error('获取用户列表失败');
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: number, isActive: boolean) => {
    try {
      await userService.updateStatus(userId, isActive);
      message.success(isActive ? '用户已启用' : '用户已禁用');
      fetchUsers();
    } catch (error) {
      message.error('更新用户状态失败');
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      await userService.delete(userId);
      message.success('用户已删除');
      fetchUsers();
    } catch (error) {
      message.error('删除用户失败');
    }
  };

  const handleViewDetail = async (user: User) => {
    try {
      const fullUser = await userService.getById(user.id);
      setSelectedUser(fullUser);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('获取用户详情失败');
    }
  };

  const handleRecharge = (user: User) => {
    setSelectedUser(user);
    setRechargeAmount(0);
    setRechargeDescription('');
    setRechargeModalVisible(true);
  };

  const submitRecharge = async () => {
    if (!selectedUser || rechargeAmount <= 0) {
      message.error('请输入正确的积分数量');
      return;
    }

    try {
      setRechargeLoading(true);
      const result = await creditService.recharge(selectedUser.id, rechargeAmount, rechargeDescription);
      message.success(`已成功为用户 ${selectedUser.username} 充值 ${rechargeAmount} 积分`);
      setRechargeModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '操作失败');
    } finally {
      setRechargeLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
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
      title: '积分',
      dataIndex: 'credits',
      key: 'credits',
      width: 100,
      render: (credits: number) => (
        <Tag color="blue">{credits}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '正常' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '今日生成',
      dataIndex: 'daily_generation_count',
      key: 'daily_generation_count',
      width: 100,
    },
    {
      title: '总生成数',
      dataIndex: 'total_generations',
      key: 'total_generations',
      width: 100,
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
      width: 280,
      render: (_: any, record: User) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button 
            type="link" 
            size="small"
            icon={<DollarOutlined />}
            onClick={() => handleRecharge(record)}
          >
            充值
          </Button>
          <Button 
            type="link" 
            size="small"
            danger={record.is_active}
            onClick={() => handleStatusChange(record.id, !record.is_active)}
          >
            {record.is_active ? '禁用' : '启用'}
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>用户管理</h2>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchUsers}>
          刷新
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
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

      <Modal
        title="用户详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button key="recharge" type="primary" onClick={() => {
            setDetailModalVisible(false);
            handleRecharge(selectedUser!);
          }}>
            充值积分
          </Button>,
        ]}
        width={600}
      >
        {selectedUser && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card size="small">
                  <Statistic 
                    title="用户ID" 
                    value={selectedUser.id} 
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic 
                    title="当前积分" 
                    value={selectedUser.credits} 
                    prefix={<DollarOutlined />}
                  />
                </Card>
              </Col>
            </Row>
            <p><strong>用户名：</strong>{selectedUser.username}</p>
            <p><strong>邮箱：</strong>{selectedUser.email}</p>
            <p><strong>状态：</strong>
              <Tag color={selectedUser.is_active ? 'green' : 'red'}>
                {selectedUser.is_active ? '正常' : '禁用'}
              </Tag>
            </p>
            <p><strong>超级管理员：</strong>
              <Tag color={selectedUser.is_superuser ? 'gold' : 'default'}>
                {selectedUser.is_superuser ? '是' : '否'}
              </Tag>
            </p>
            <p><strong>今日生成数：</strong>{selectedUser.daily_generation_count}</p>
            <p><strong>总生成数：</strong>{selectedUser.total_generations}</p>
            <p><strong>注册时间：</strong>{new Date(selectedUser.created_at).toLocaleString('zh-CN')}</p>
          </div>
        )}
      </Modal>

      <Modal
        title={`为用户 ${selectedUser?.username} 充值积分`}
        open={rechargeModalVisible}
        onCancel={() => setRechargeModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRechargeModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" loading={rechargeLoading} onClick={submitRecharge}>
            确认充值
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <p><strong>用户：</strong>{selectedUser?.username} ({selectedUser?.email})</p>
          <p><strong>当前积分：</strong>{selectedUser?.credits}</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>充值积分数量：</label>
          <InputNumber
            style={{ width: '100%' }}
            value={rechargeAmount}
            onChange={(value) => setRechargeAmount(value || 0)}
            min={1}
            placeholder="请输入积分数量"
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8 }}>说明（可选）：</label>
          <Input.TextArea
            value={rechargeDescription}
            onChange={(e) => setRechargeDescription(e.target.value)}
            placeholder="请输入充值原因"
            rows={3}
          />
        </div>
        {selectedUser && rechargeAmount > 0 && (
          <div style={{ marginTop: 16, padding: 12, background: '#f0f5ff', borderRadius: 4 }}>
            <p style={{ color: '#1890ff' }}>
              <strong>充值后积分：</strong>{selectedUser.credits + rechargeAmount}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserList;