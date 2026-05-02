import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Spin,
  message,
  Button,
  Space,
  Modal,
  InputNumber,
  Input,
  Divider,
  Typography,
  Tabs,
  Descriptions,
} from 'antd';
import {
  CreditCardOutlined,
  ReloadOutlined,
  PlusOutlined,
  MinusOutlined,
  HistoryOutlined,
  DollarOutlined,
  TeamOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { creditService, UserCredit, CreditTransaction } from '../../services/api';
import './Manage.less';

const { TextArea } = Input;
const { Text, Title } = Typography;

type OperationType = 'recharge' | 'deduct';

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

  // 充值/扣除弹窗状态
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserCredit | null>(null);
  const [operationType, setOperationType] = useState<OperationType>('recharge');
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustDescription, setAdjustDescription] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // 流水记录弹窗状态
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [transactionLoading, setTransactionLoading] = useState(false);

  const fetchUserCredits = useCallback(async () => {
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
  }, [pagination.current, pagination.pageSize]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await creditService.getUserCredits(1, 100);
      setStats({
        totalCredits: data.users.reduce((sum, u) => sum + u.credits, 0),
        totalUsers: data.total,
        totalTransactions: 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchUserCredits();
    fetchStats();
  }, [fetchUserCredits, fetchStats]);

  // 打开充值/扣除弹窗
  const openAdjustModal = (user: UserCredit, type: OperationType) => {
    setSelectedUser(user);
    setOperationType(type);
    setAdjustAmount(0);
    setAdjustDescription('');
    setRechargeModalVisible(true);
  };

  // 提交充值/扣除操作
  const handleSubmit = async () => {
    if (!selectedUser || adjustAmount <= 0) {
      message.error('请输入正确的积分数量');
      return;
    }

    // 扣除操作：检查余额是否足够
    if (operationType === 'deduct' && adjustAmount > selectedUser.credits) {
      message.error(`扣除积分不能大于用户当前积分 (${selectedUser.credits})`);
      return;
    }

    try {
      setSubmitLoading(true);

      if (operationType === 'recharge') {
        await creditService.recharge(selectedUser.id, adjustAmount, adjustDescription);
        message.success(`成功为用户 ${selectedUser.username} 充值 ${adjustAmount} 积分`);
      } else if (operationType === 'deduct') {
        await creditService.deduct(selectedUser.id, adjustAmount, adjustDescription);
        message.success(`成功从用户 ${selectedUser.username} 扣除 ${adjustAmount} 积分`);
      } else {
        message.error('操作类型无效');
        return;
      }

      setRechargeModalVisible(false);
      fetchUserCredits();
      fetchStats();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || '操作失败';
      message.error(errorMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  // 查看流水记录
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

  // 查看所有流水
  const handleViewAllTransactions = async () => {
    setSelectedUser(null);
    setTransactionModalVisible(true);
    setTransactionLoading(true);

    try {
      const data = await creditService.getTransactions(1, 100);
      setTransactions(data.transactions);
      setTransactionLoading(false);
    } catch (error) {
      message.error('获取流水记录失败');
      setTransactionLoading(false);
    }
  };

  // 流水类型标签
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

  // 流水表格列
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

  // 用户积分表格列
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
      width: 120,
      render: (credits: number) => (
        <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px', borderRadius: 4 }}>
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
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: UserCredit) => (
        <Space size="middle">
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => openAdjustModal(record, 'recharge')}
            className="action-btn-recharge"
          >
            充值
          </Button>
          <Button
            type="text"
            size="small"
            danger
            icon={<MinusOutlined />}
            onClick={() => openAdjustModal(record, 'deduct')}
            className="action-btn-deduct"
          >
            扣除
          </Button>
          <Button
            type="text"
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => handleViewTransactions(record)}
            className="action-btn-transaction"
          >
            流水
          </Button>
        </Space>
      ),
    },
  ];

  // 计算操作后余额
  const calculateNewBalance = () => {
    if (!selectedUser) return 0;
    if (operationType === 'recharge') {
      return selectedUser.credits + adjustAmount;
    }
    return Math.max(0, selectedUser.credits - adjustAmount);
  };

  // Tabs 配置
  const operationTabs = [
    {
      key: 'recharge',
      label: (
        <span>
          <PlusOutlined /> 充值积分
        </span>
      ),
    },
    {
      key: 'deduct',
      label: (
        <span>
          <MinusOutlined /> 扣除积分
        </span>
      ),
    },
  ];

  return (
    <div className="credits-manage">
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ marginBottom: 8 }}>
          <CreditCardOutlined /> 积分管理
        </Title>
        <Text type="secondary">管理用户积分余额，执行充值/扣除操作</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card className="stat-card stat-card-purple" bordered={false}>
            <Statistic
              title="用户总积分"
              value={stats.totalCredits}
              prefix={<DollarOutlined />}
              precision={0}
              groupSeparator=","
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="stat-card stat-card-green" bordered={false}>
            <Statistic
              title="用户总数"
              value={stats.totalUsers}
              prefix={<TeamOutlined />}
              precision={0}
              groupSeparator=","
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="stat-card stat-card-blue" bordered={false}>
            <Statistic
              title="总交易笔数"
              value={stats.totalTransactions}
              prefix={<BarChartOutlined />}
              precision={0}
              groupSeparator=","
            />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <div className="action-bar">
        <Space size="middle">
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => { fetchUserCredits(); fetchStats(); }}
          >
            刷新数据
          </Button>
          <Button 
            icon={<HistoryOutlined />} 
            onClick={handleViewAllTransactions}
          >
            所有流水
          </Button>
        </Space>
      </div>

      {/* 用户积分表格 */}
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={userCredits}
            rowKey="id"
            scroll={{ x: 1400 }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (page, pageSize) => {
                setPagination({ current: page, pageSize, total: pagination.total });
              },
            }}
          />
        )}
      </div>

      {/* 充值/扣除弹窗 */}
      <Modal
        title={
          <Space>
            {operationType === 'recharge' ? (
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
            ) : (
              <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
            )}
            <span>
              {operationType === 'recharge' ? '充值积分' : '扣除积分'}
            </span>
          </Space>
        }
        open={rechargeModalVisible}
        onCancel={() => setRechargeModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRechargeModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={submitLoading}
            onClick={handleSubmit}
            danger={operationType === 'deduct'}
          >
            {operationType === 'recharge' ? '确认充值' : '确认扣除'}
          </Button>,
        ]}
        width={600}
      >
        {/* 用户信息 */}
        <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="用户名">{selectedUser?.username}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{selectedUser?.email}</Descriptions.Item>
          <Descriptions.Item label="当前积分">
            <Tag color="blue" style={{ fontSize: 14 }}>{selectedUser?.credits}</Tag>
          </Descriptions.Item>
        </Descriptions>

        <Divider style={{ margin: '12px 0 16px' }} />

        {/* 操作类型切换 */}
        <Tabs
          activeKey={operationType}
          onChange={(key) => setOperationType(key as OperationType)}
          items={operationTabs}
          size="large"
          style={{ marginBottom: 16 }}
        />

        {/* 调整数量 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            调整积分数量：
          </label>
          <InputNumber
            style={{ width: '100%' }}
            value={adjustAmount}
            onChange={(value) => setAdjustAmount(value || 0)}
            min={1}
            max={operationType === 'deduct' ? selectedUser?.credits || 999999 : 999999}
            placeholder={operationType === 'recharge' ? '请输入充值数量' : '请输入扣除数量'}
            size="large"
          />
          <Text type="secondary" style={{ marginTop: 4, fontSize: 12, display: 'block' }}>
            {operationType === 'recharge'
              ? '充值后将增加到用户积分余额'
              : `最多可扣除 ${selectedUser?.credits} 积分`}
          </Text>
        </div>

        {/* 说明 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            说明（可选）：
          </label>
          <TextArea
            value={adjustDescription}
            onChange={(e) => setAdjustDescription(e.target.value)}
            placeholder="请输入调整原因，将记录在流水中"
            rows={3}
          />
        </div>

        {/* 余额预览 */}
        {selectedUser && adjustAmount > 0 && (
          <Card
            type="inner"
            title={
              <Space>
                <SwapOutlined /> 操作预览
              </Space>
            }
            style={{ marginTop: 16 }}
            size="small"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">当前积分：</Text>
                <br />
                <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{selectedUser.credits.toLocaleString()}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">操作后积分：</Text>
                <br />
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: operationType === 'recharge' ? '#52c41a' : '#ff4d4f',
                  }}
                >
                  {calculateNewBalance().toLocaleString()}
                </Text>
              </Col>
            </Row>
          </Card>
        )}
      </Modal>

      {/* 流水记录弹窗 */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            <span>{selectedUser ? `${selectedUser.username} 的流水记录` : '所有流水记录'}</span>
          </Space>
        }
        open={transactionModalVisible}
        onCancel={() => setTransactionModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setTransactionModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={1000}
      >
        {transactionLoading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
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