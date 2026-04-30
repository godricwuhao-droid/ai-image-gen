import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Switch, message, Tabs, Table, Tag, Space, Modal } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'umi';

interface ConfigItem {
  key: string;
  value: string;
  description?: string;
}

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingKey, setEditingKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/admin/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
      });
      
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('admin_token');
        message.error('请重新登录');
        navigate('/login');
        return;
      }

      const data = await response.json();
      const configMap: Record<string, string> = {};
      (data.configs || []).forEach((item: ConfigItem) => {
        configMap[item.key] = item.value;
      });
      setConfigs(configMap);
    } catch (error) {
      message.error('获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string, value: string, description?: string) => {
    try {
      const response = await fetch('/api/v1/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: JSON.stringify({ key, value, description }),
      });

      if (response.ok) {
        message.success('配置保存成功');
        fetchConfigs();
        setEditModalVisible(false);
      } else {
        message.error('保存失败');
      }
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleEdit = (key: string) => {
    setEditingKey(key);
    setEditValue(configs[key] || '');
    setEditDescription(getConfigDescription(key));
    setEditModalVisible(true);
  };

  const getConfigDescription = (key: string) => {
    const descriptions: Record<string, string> = {
      site_name: '网站名称',
      default_size: '默认图片尺寸',
      default_quality: '默认图片质量',
      daily_free_generations: '每日免费生成次数',
      max_prompt_length: '最大Prompt长度',
      openai_api_key: 'OpenAI API Key',
      relay_api_key: 'Relay API Key',
      relay_api_base_url: 'Relay API Base URL',
    };
    return descriptions[key] || '';
  };

  const settings = [
    {
      key: 'generation',
      label: '生成配置',
      items: [
        { key: 'default_size', label: '默认图片尺寸', value: configs['default_size'] || '1024x1024', type: 'select', options: ['1024x1024', '1792x1024', '1024x1792'] },
        { key: 'default_quality', label: '默认图片质量', value: configs['default_quality'] || 'standard', type: 'select', options: ['standard', 'hd'] },
        { key: 'daily_free_generations', label: '每日免费次数', value: configs['daily_free_generations'] || '10' },
        { key: 'max_prompt_length', label: '最大Prompt长度', value: configs['max_prompt_length'] || '4000' },
      ],
    },
    {
      key: 'api',
      label: 'API配置',
      items: [
        { key: 'openai_api_key', label: 'OpenAI API Key', value: configs['openai_api_key'] || '', type: 'password' },
        { key: 'relay_api_key', label: 'Relay API Key', value: configs['relay_api_key'] || '', type: 'password' },
        { key: 'relay_api_base_url', label: 'Relay API Base URL', value: configs['relay_api_base_url'] || '' },
      ],
    },
  ];

  const configList = Object.keys(configs).map(key => ({
    key,
    value: configs[key],
    description: getConfigDescription(key),
  }));

  return (
    <div>
      <h2>系统设置</h2>

      <Tabs
        defaultActiveKey="generation"
        items={[
          {
            key: 'generation',
            label: '生成配置',
            children: (
              <Card loading={loading}>
                <Form layout="vertical">
                  {settings[0].items.map(item => (
                    <Form.Item key={item.key} label={item.label}>
                      <Space.Compact>
                        <Input
                          value={configs[item.key] || item.value}
                          onChange={e => setConfigs({ ...configs, [item.key]: e.target.value })}
                          style={{ width: 300 }}
                          type={item.type === 'password' ? 'password' : 'text'}
                        />
                        <Button type="primary" onClick={() => handleSave(item.key, configs[item.key] || item.value)}>
                          保存
                        </Button>
                      </Space.Compact>
                    </Form.Item>
                  ))}
                </Form>
              </Card>
            ),
          },
          {
            key: 'api',
            label: 'API配置',
            children: (
              <Card loading={loading}>
                <Form layout="vertical">
                  {settings[1].items.map(item => (
                    <Form.Item key={item.key} label={item.label}>
                      <Space.Compact>
                        <Input
                          value={configs[item.key] || item.value}
                          onChange={e => setConfigs({ ...configs, [item.key]: e.target.value })}
                          style={{ width: 400 }}
                          type={item.type === 'password' ? 'password' : 'text'}
                        />
                        <Button type="primary" onClick={() => handleSave(item.key, configs[item.key] || item.value)}>
                          保存
                        </Button>
                      </Space.Compact>
                    </Form.Item>
                  ))}
                </Form>
              </Card>
            ),
          },
          {
            key: 'all',
            label: '所有配置',
            children: (
              <Card
                extra={<Button icon={<ReloadOutlined />} onClick={fetchConfigs}>刷新</Button>}
                loading={loading}
              >
                <Table
                  dataSource={configList}
                  rowKey="key"
                  pagination={false}
                  columns={[
                    { title: '配置项', dataIndex: 'key', width: 200 },
                    { title: '值', dataIndex: 'value', ellipsis: true },
                    { title: '描述', dataIndex: 'description', width: 150 },
                    {
                      title: '操作',
                      width: 100,
                      render: (_, record) => (
                        <Button type="link" size="small" onClick={() => handleEdit(record.key)}>
                          编辑
                        </Button>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="编辑配置"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => handleSave(editingKey, editValue, editDescription)}
        onText="保存"
        onCancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="配置项">
            <Input value={editingKey} disabled />
          </Form.Item>
          <Form.Item label="配置值">
            <Input.TextArea
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              rows={4}
            />
          </Form.Item>
          <Form.Item label="描述">
            <Input
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings;