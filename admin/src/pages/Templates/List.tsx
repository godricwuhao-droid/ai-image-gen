import React from 'react';
import { Table, Tag, Space, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const TemplateList: React.FC = () => {
  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '分类', dataIndex: 'category', key: 'category' },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    { title: '使用次数', dataIndex: 'usage_count', key: 'usage_count' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space>
          <Button type="link">编辑</Button>
          <Button type="link" danger>删除</Button>
        </Space>
      ),
    },
  ];

  const data = [
    { id: 1, name: '风景画', category: '风景', is_active: true, usage_count: 100, created_at: '2024-01-01' },
    { id: 2, name: '人物肖像', category: '人物', is_active: true, usage_count: 80, created_at: '2024-01-02' },
  ];

  return (
    <div>
      <h2>提示词模板</h2>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />}>
          添加模板
        </Button>
      </Space>
      <Table columns={columns} dataSource={data} rowKey="id" />
    </div>
  );
};

export default TemplateList;
