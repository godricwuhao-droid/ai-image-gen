import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Modal, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { userService, User } from '../services/api';

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

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
      width: 120,
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
      width: 200,
      render: (_: any, record: User) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => Modal.info({ title: '编辑用户', content: `ID: ${record.id}` })}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            danger={record.is_active}
            icon={record.is_active ? <StopOutlined /> : <EditOutlined />}
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
            <Button type="link" danger icon={<DeleteOutlined />}>
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
        <Button type="primary" icon={<PlusOutlined />}>
          添加用户
        </Button>
        <Button icon={<SearchOutlined />}>
          搜索用户
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
    </div>
  );
};

export default UserList;