import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Spin, message, Button, Space, Modal, InputNumber, Input, Select, Popconfirm } from 'antd';
import { CreditOutlined, ReloadOutlined, SearchOutlined, PlusOutlined, MinusOutlined, HistoryOutlined, DollarOutlined } from '@ant-design/icons';
import { creditService, UserCredit, CreditTransaction } from '../../services/api';

const { Option } = Select;

const CreditsManage: React.FC = () => {
  const [userCredits, setUserCredits] = useState<UserCredit[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [stats, setStats] = useState({
    totalCredits: 0,
    totalUsers: 0,
    totalTransactions: 0,
  });
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserCredit | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<number>(0);
  const [rechargeDescription, setRechargeDescription] = useState('');
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [transactionLoading, setTransactionLoading] = useState(false);

  useEffect(() => {
    fetchUserCredits();
    fetchStats();
  }, [pagination.current, pagination.pageSize]);

  const fetchUserCredits = async () => {
    try {
      setLoading(true);
      const data = await creditService.getUserCredits(pagination.current, pagination.pageSize);
      setUserCredits(data.users);
      setPagination(prev => ({ ...prev, total: data.total }));
    } catch (error) {
      message.error('获取用户积分失败');
      console.error('Failed to fetch user credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await creditService.getUserCredits(1, 1000);
      setStats({
        totalCredits: data.users.reduce((sum, u) => sum + u.credits, 0),
        totalUsers: data.total,
        totalTransactions: 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleRecharge = async (user: UserCredit, isDeduct = false) => {
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
      if (rechargeAmount > selectedUser.credits && !selectedUser) {
        message.error('扣除积分不能大于用户当前积分');
        return;
      }
      
      if (selectedUser.credits < rechargeAmount) {
        message.error('扣除积分不能大于用户当前积分');
        return;
      }

      if (rechargeAmount > selectedUser.credits && rechargeAmount > 0) {
        const result = await creditService.recharge(selectedUser.id, rechargeAmount, rechargeDescription);
        message.success(`已成功为用户 ${selectedUser.username} 充值 ${rechargeAmount} 积分`);
      } else if (rechargeAmount > 0) {
        const result = await creditService.deduct(selectedUser.id, rechargeAmount, rechargeDescription);
        message.success(`已成功从用户 ${selectedUser.username} 扣除 ${rechargeAmount} 积分`);
      }
      
      setRechargeModalVisible(false);
      fetchUserCredits();
      fetchStats();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '操作失败');
    } finally {
      setRechargeLoading(false);
    }
  };

  const handleViewTransactions = async (user: UserCredit) => {
    setSelectedUser(user);
    setTransactionModalVisible(true);
    setTransactionLoading(true);
    
    try {
      const data = await creditService.getTransactions(1, 50, { user_id: user.id });
      setTransactions(data.transactions);
    } catch (error) {
      message.error('获取流水记录失败');
    } finally {
      setTransactionLoading(false);
    }
  };

  const getTransactionTypeTag = (type: string) => {
    const typeMap: Record<string, { color: string; text: string }> = {
      admin_recharge: { color: 'green', text: '管理员充值' },
      admin_deduct: { color: 'red', text: '管理员扣除' },
      generation: { color: 'blue', text: '生成消耗' },
      payment: { color: 'purple', text: '购买积分' },
      refund: { color: 'orange', text: '退款' },
    };
    const info = typeMap[type] || { color: 'default', text: type };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const transactionColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '变化',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount: number) => (
        <span style={{ color: amount >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
          {amount >= 0 ? `+${amount}` : amount}
        </span>
      ),
    },
    {
      title: '余额',
      dataIndex: 'balance_after',
      key: 'balance_after',
      width: 100,
    },
    {
      title: '类型',
      dataIndex: 'transaction_type',
      key: 'transaction_type',
      width: 120,
      render: (type: string) => getTransactionTypeTag(type),
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (createdAt: string) => new Date(createdAt).toLocaleString('zh-CN'),
    },
  ];

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
      title: '当前积分',
      dataIndex: 'credits',
      key: 'credits',
      width: 100,
      render: (credits: number) => (
        <Tag color="blue" style={{ fontSize: 16, padding: '4px 8px' }}>
          {credits}
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
      width: 200,
      render: (_: any, record: UserCredit) => (
        <Space size="small">
          <Button 
            type="primary" 
            size="small" 
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedUser(record);
              setRechargeAmount(0);
              setRechargeDescription('');
              setRechargeModalVisible(true);
            }}
          >
            充值
          </Button>
          <Button 
            size="small" 
            icon={<MinusOutlined />}
            onClick={() => {
              setSelectedUser(record);
              setRechargeAmount(0);
              setRechargeDescription('');
              setRechargeModalVisible(true);
            }}
            danger
          >
            扣除
          </Button>
          <Button 
            type="link" 
            size="small" 
            icon={<HistoryOutlined />}
            onClick={() => handleViewTransactions(record)}
          >
            流水
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
              title="用户总积分"
              value={stats.totalCredits}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="用户总数"
              value={stats.totalUsers}
              prefix={<span>👥</span>}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="总交易笔数"
              value={stats.totalTransactions}
              prefix={<HistoryOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={() => { fetchUserCredits(); fetchStats(); }}>
          刷新
        </Button>
        <Button icon={<HistoryOutlined />} onClick={() => {
          setSelectedUser(null);
          setTransactionModalVisible(true);
          setTransactionLoading(true);
          creditService.getTransactions(1, 100).then(data => {
            setTransactions(data.transactions);
            setTransactionLoading(false);
          }).catch(() => {
            setTransactionLoading(false);
          });
        }}>
          所有流水
        </Button>
      </Space>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={userCredits}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize, total: pagination.total });
            },
          }}
        />
      )}

      <Modal
        title={selectedUser ? `调整用户 ${selectedUser.username} 的积分` : '积分调整'}
        open={rechargeModalVisible}
        onCancel={() => setRechargeModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRechargeModalVisible(false)}>
            取消
          </Button>,
          <Button key="deduct" danger onClick={submitRecharge} loading={rechargeLoading}>
            确认扣除
          </Button>,
          <Button key="recharge" type="primary" onClick={submitRecharge} loading={rechargeLoading}>
            确认充值
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <p><strong>用户：</strong>{selectedUser?.username} ({selectedUser?.email})</p>
          <p><strong>当前积分：</strong>{selectedUser?.credits}</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>调整积分数量：</label>
          <InputNumber
            style={{ width: '100%' }}
            value={rechargeAmount}
            onChange={(value) => setRechargeAmount(value || 0)}
            min={0}
            max={selectedUser?.credits || 999999}
            placeholder="请输入积分数量"
          />
          <p style={{ marginTop: 4, color: '#999', fontSize: 12 }}>
            输入正数为充值，输入负数为扣除（不能超过当前积分）
          </p>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8 }}>说明（可选）：</label>
          <Input.TextArea
            value={rechargeDescription}
            onChange={(e) => setRechargeDescription(e.target.value)}
            placeholder="请输入调整原因"
            rows={3}
          />
        </div>
        {selectedUser && rechargeAmount > 0 && (
          <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <p><strong>操作后积分：</strong>{selectedUser.credits + rechargeAmount}</p>
          </div>
        )}
      </Modal>

      <Modal
        title={selectedUser ? `${selectedUser.username} 的流水记录` : '所有流水记录'}
        open={transactionModalVisible}
        onCancel={() => setTransactionModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setTransactionModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={900}
      >
        {transactionLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            columns={transactionColumns}
            dataSource={transactions}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default CreditsManage;