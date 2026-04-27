import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Button, Image, message, Drawer, Descriptions, Statistic, Card, Row, Col } from 'antd';
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { generationService, Generation } from '../services/api';

const GenerationList: React.FC = () => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  useEffect(() => {
    fetchGenerations();
  }, [pagination.current, pagination.pageSize]);

  const fetchGenerations = async () => {
    try {
      setLoading(true);
      const data = await generationService.getList(pagination.current, pagination.pageSize);
      setGenerations(data.generations);
      setPagination(prev => ({ ...prev, total: data.total }));
    } catch (error) {
      message.error('获取生成记录失败');
      console.error('Failed to fetch generations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (generation: Generation) => {
    setSelectedGeneration(generation);
    setDrawerVisible(true);
  };

  const statusColorMap: Record<string, string> = {
    pending: 'orange',
    processing: 'blue',
    completed: 'green',
    failed: 'red',
  };

  const statusTextMap: Record<string, string> = {
    pending: '等待中',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 100,
    },
    {
      title: '提示词',
      dataIndex: 'prompt',
      key: 'prompt',
      ellipsis: true,
      width: 300,
    },
    {
      title: '尺寸',
      dataIndex: 'size',
      key: 'size',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusColorMap[status]}>
          {statusTextMap[status]}
        </Tag>
      ),
    },
    {
      title: '消耗积分',
      dataIndex: 'cost_usd',
      key: 'cost_usd',
      width: 100,
      render: (cost: number) => `$${cost?.toFixed(2) || '0.00'}`,
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
      render: (_: any, record: Generation) => (
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
      <h2>图片生成记录</h2>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchGenerations}>
          刷新
        </Button>
        <Button icon={<SearchOutlined />}>
          搜索
        </Button>
      </Space>
      <Table
        columns={columns}
        dataSource={generations}
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
        title="生成详情"
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedGeneration && (
          <>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card size="small">
                  <Statistic title="状态" value={statusTextMap[selectedGeneration.status]} valueStyle={{ color: statusColorMap[selectedGeneration.status] }} />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic title="消耗" value={selectedGeneration.cost_usd} prefix="$" precision={2} />
                </Card>
              </Col>
            </Row>

            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="ID">{selectedGeneration.id}</Descriptions.Item>
              <Descriptions.Item label="用户ID">{selectedGeneration.user_id}</Descriptions.Item>
              <Descriptions.Item label="尺寸">{selectedGeneration.size}</Descriptions.Item>
              <Descriptions.Item label="质量">{selectedGeneration.quality}</Descriptions.Item>
              <Descriptions.Item label="数量">{selectedGeneration.n}</Descriptions.Item>
              <Descriptions.Item label="提供商">{selectedGeneration.provider}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{new Date(selectedGeneration.created_at).toLocaleString('zh-CN')}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{new Date(selectedGeneration.updated_at).toLocaleString('zh-CN')}</Descriptions.Item>
            </Descriptions>

            <h4 style={{ marginTop: 24, marginBottom: 8 }}>提示词</h4>
            <p style={{ padding: 12, background: '#f5f5f5', borderRadius: 4 }}>{selectedGeneration.prompt}</p>

            {selectedGeneration.error_message && (
              <>
                <h4 style={{ marginTop: 24, marginBottom: 8 }}>错误信息</h4>
                <p style={{ padding: 12, background: '#fff2f0', borderRadius: 4, color: '#f5222d' }}>{selectedGeneration.error_message}</p>
              </>
            )}

            {selectedGeneration.images && selectedGeneration.images.length > 0 && (
              <>
                <h4 style={{ marginTop: 24, marginBottom: 8 }}>生成的图片</h4>
                <Image.PreviewGroup>
                  <Space>
                    {selectedGeneration.images.map((img: string, idx: number) => (
                      <Image key={idx} src={img} width={150} />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              </>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
};

export default GenerationList;