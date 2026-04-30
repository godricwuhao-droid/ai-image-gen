import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Modal, message, Popconfirm, Input, Select, DatePicker } from 'antd';
import { DeleteOutlined, ReloadOutlined, EyeOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons';
import { generationService, Generation } from '../../services/api';

const { Option } = Select;
const { RangePicker } = DatePicker;

const GenerationsList: React.FC = () => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState<{
    status?: string;
    provider?: string;
    user_id?: number;
    start_date?: string;
    end_date?: string;
  }>({});
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);

  useEffect(() => {
    fetchGenerations();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchGenerations = async () => {
    try {
      setLoading(true);
      const data = await generationService.getAdminList(
        pagination.current,
        pagination.pageSize,
        filters
      );
      setGenerations(data.generations);
      setPagination(prev => ({ ...prev, total: data.total }));
    } catch (error) {
      message.error('获取生成记录失败');
      console.error('Failed to fetch generations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await generationService.delete(id);
      message.success('删除成功');
      fetchGenerations();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleRetry = async (id: number) => {
    try {
      await generationService.retry(id);
      message.success('已重新提交生成任务');
      fetchGenerations();
    } catch (error) {
      message.error('重试失败');
    }
  };

  const handleViewDetail = (generation: Generation) => {
    setSelectedGeneration(generation);
    setDetailModalVisible(true);
  };

  const getStatusTag = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'orange',
      processing: 'blue',
      completed: 'green',
      failed: 'red',
    };
    const textMap: Record<string, string> = {
      pending: '等待中',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
    };
    return <Tag color={colorMap[status] || 'default'}>{textMap[status] || status}</Tag>;
  };

  const getProviderTag = (provider: string) => {
    const colorMap: Record<string, string> = {
      openai: '#10a37f',
      relay: '#6366f1',
      relay_api: '#8b5cf6',
      image_edit: '#ec4899',
    };
    const textMap: Record<string, string> = {
      openai: 'OpenAI',
      relay: 'Relay',
      relay_api: 'Relay API',
      image_edit: 'Image Edit',
    };
    return <Tag color={colorMap[provider] || 'default'}>{textMap[provider] || provider}</Tag>;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      width: 150,
      render: (user: any) => (
        <span>{user?.username || '-'}</span>
      ),
    },
    {
      title: 'Prompt',
      dataIndex: 'prompt',
      key: 'prompt',
      width: 300,
      ellipsis: true,
    },
    {
      title: '尺寸',
      dataIndex: 'size',
      key: 'size',
      width: 100,
    },
    {
      title: '供应商',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
      render: (provider: string) => getProviderTag(provider),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '费用(USD)',
      dataIndex: 'cost_usd',
      key: 'cost_usd',
      width: 100,
      render: (cost: number) => `$${cost?.toFixed(4) || '0.0000'}`,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (createdAt: string) => new Date(createdAt).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Generation) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          {record.status === 'failed' && (
            <Button 
              type="link" 
              size="small" 
              icon={<SyncOutlined spin />}
              onClick={() => handleRetry(record.id)}
            >
              重试
            </Button>
          )}
          <Popconfirm
            title="确定删除这条记录？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              size="small" 
              danger 
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Select
          placeholder="状态筛选"
          style={{ width: 120 }}
          allowClear
          onChange={(value) => setFilters({ ...filters, status: value })}
        >
          <Option value="pending">等待中</Option>
          <Option value="processing">处理中</Option>
          <Option value="completed">已完成</Option>
          <Option value="failed">失败</Option>
        </Select>
        <Select
          placeholder="供应商"
          style={{ width: 120 }}
          allowClear
          onChange={(value) => setFilters({ ...filters, provider: value })}
        >
          <Option value="openai">OpenAI</Option>
          <Option value="relay">Relay</Option>
          <Option value="relay_api">Relay API</Option>
          <Option value="image_edit">Image Edit</Option>
        </Select>
        <Input
          placeholder="用户ID"
          style={{ width: 100 }}
          type="number"
          onChange={(e) => setFilters({ ...filters, user_id: e.target.value ? parseInt(e.target.value) : undefined })}
        />
        <Button 
          type="primary" 
          icon={<SearchOutlined />}
          onClick={fetchGenerations}
        >
          搜索
        </Button>
        <Button onClick={() => {
          setFilters({});
          setPagination({ ...pagination, current: 1 });
        }}>
          重置
        </Button>
      </div>

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
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPagination({ current: page, pageSize, total: pagination.total });
          },
        }}
      />

      <Modal
        title="生成详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedGeneration && (
          <div>
            <p><strong>ID：</strong>{selectedGeneration.id}</p>
            <p><strong>用户：</strong>{selectedGeneration.user?.username} ({selectedGeneration.user?.email})</p>
            <p><strong>Prompt：</strong></p>
            <div style={{ 
              background: '#f5f5f5', 
              padding: 12, 
              borderRadius: 4,
              wordBreak: 'break-word',
              maxHeight: 200,
              overflow: 'auto'
            }}>
              {selectedGeneration.prompt}
            </div>
            <p style={{ marginTop: 16 }}><strong>参数：</strong></p>
            <ul>
              <li>尺寸：{selectedGeneration.size}</li>
              <li>质量：{selectedGeneration.quality}</li>
              <li>数量：{selectedGeneration.n}</li>
              <li>供应商：{selectedGeneration.provider}</li>
            </ul>
            <p><strong>状态：</strong>{getStatusTag(selectedGeneration.status)}</p>
            <p><strong>费用：</strong>${selectedGeneration.cost_usd?.toFixed(4)}</p>
            <p><strong>积分：</strong>{selectedGeneration.credits_cost}</p>
            <p><strong>点赞数：</strong>{selectedGeneration.likes_count}</p>
            <p><strong>浏览数：</strong>{selectedGeneration.views_count}</p>
            {selectedGeneration.error_message && (
              <>
                <p><strong>错误信息：</strong></p>
                <div style={{ 
                  background: '#fff2f0', 
                  padding: 12, 
                  borderRadius: 4,
                  color: '#ff4d4f'
                }}>
                  {selectedGeneration.error_message}
                </div>
              </>
            )}
            {selectedGeneration.images && selectedGeneration.images.length > 0 && (
              <>
                <p style={{ marginTop: 16 }}><strong>生成图片：</strong></p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedGeneration.images.map((img: any, idx: number) => {
                    const url = typeof img === 'string' ? img : img.url;
                    return (
                      <img 
                        key={idx}
                        src={url}
                        alt={`Generated ${idx + 1}`}
                        style={{ 
                          width: 200, 
                          height: 200, 
                          objectFit: 'cover',
                          borderRadius: 4,
                          border: '1px solid #d9d9d9'
                        }}
                        onClick={() => window.open(url, '_blank')}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GenerationsList;