import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Button, message, Drawer, Descriptions, Statistic, Card, Row, Col, Select, Popconfirm } from 'antd';
import { EyeOutlined, ReloadOutlined, SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { orderService, Order } from '../services/api';

const OrderList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  useEffect(() => {
    fetchOrders();
  }, [pagination.current, pagination.pageSize]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getList(pagination.current, pagination.pageSize);
      setOrders(data.orders);
      setPagination(prev => ({ ...prev, total: data.total }));
    } catch (error) {
      message.error('获取订单列表失败');
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (order: Order) => {
    setSelectedOrder(order);
    setDrawerVisible(true);
  };

  const handleStatusChange = async (orderId: number, status: string) => {
    try {
      await orderService.updateStatus(orderId, status);
      message.success('订单状态已更新');
      fetchOrders();
      setDrawerVisible(false);
    } catch (error) {
      message.error('更新订单状态失败');
    }
  };

  const statusColorMap: Record<string, string> = {
    pending: 'orange',
    processing: 'blue',
    completed: 'green',
    failed: 'red',
    refunded: 'purple',
  };

  const statusTextMap: Record<string, string> = {
    pending: '待支付',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
    refunded: '已退款',
  };

  const columns = [
    {
      title: '订单ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 100,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => `$${amount?.toFixed(2) || '0.00'}`,
    },
    {
      title: '支付方式',
      dataIndex: 'payment_method',
      key: 'payment_method',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'payment_status',
      key: 'payment_status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusColorMap[status]}>
          {statusTextMap[status]}
        </Tag>
      ),
    },
    {
      title: '交易ID',
      dataIndex: 'transaction_id',
      key: 'transaction_id',
      ellipsis: true,
      width: 180,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (createdAt: string) => new Date(createdAt).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: Order) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>订单管理</h2>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchOrders}>
          刷新
        </Button>
        <Button icon={<SearchOutlined />}>
          搜索订单
        </Button>
      </Space>
      <Table
        columns={columns}
        dataSource={orders}
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

      <Drawer
        title="订单详情"
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedOrder && (
          <>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card size="small">
                  <Statistic 
                    title="订单金额" 
                    value={selectedOrder.amount} 
                    prefix="$" 
                    precision={2}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic 
                    title="订单状态" 
                    value={statusTextMap[selectedOrder.payment_status]}
                    valueStyle={{ color: statusColorMap[selectedOrder.payment_status] }}
                  />
                </Card>
              </Col>
            </Row>

            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="订单ID">{selectedOrder.id}</Descriptions.Item>
              <Descriptions.Item label="用户ID">{selectedOrder.user_id}</Descriptions.Item>
              <Descriptions.Item label="支付方式">{selectedOrder.payment_method || '-'}</Descriptions.Item>
              <Descriptions.Item label="交易ID">{selectedOrder.transaction_id || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{new Date(selectedOrder.created_at).toLocaleString('zh-CN')}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{new Date(selectedOrder.updated_at).toLocaleString('zh-CN')}</Descriptions.Item>
            </Descriptions>

            <h4 style={{ marginTop: 24, marginBottom: 8 }}>操作</h4>
            <Space>
              {selectedOrder.payment_status === 'pending' && (
                <Button 
                  type="primary" 
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleStatusChange(selectedOrder.id, 'completed')}
                >
                  标记为已完成
                </Button>
              )}
              {selectedOrder.payment_status === 'completed' && (
                <Popconfirm
                  title="确定要退款吗？"
                  onConfirm={() => handleStatusChange(selectedOrder.id, 'refunded')}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger icon={<CloseCircleOutlined />}>
                    退款
                  </Button>
                </Popconfirm>
              )}
              <Button 
                icon={<CloseCircleOutlined />}
                onClick={() => handleStatusChange(selectedOrder.id, 'failed')}
              >
                标记为失败
              </Button>
            </Space>
          </>
        )}
      </Drawer>
    </div>
  );
};

export default OrderList;