import React, { useEffect, useState } from 'react';
import {
  Card, Form, Input, Button, message, Tabs, Table, Space, Modal, Tag, InputNumber, Select,
  Typography, Divider, Popconfirm, Tooltip,
} from 'antd';
import {
  SaveOutlined, ReloadOutlined, DollarOutlined, EyeOutlined, EyeInvisibleOutlined,
  SettingOutlined, ApiOutlined, CodeOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'umi';

const { Title, Text } = Typography;
const { Option } = Select;

interface ConfigItem {
  key: string;
  value: string;
  description?: string;
}

const QUALITIES = ['low', 'medium', 'high'];
const SIZES = ['1024x1024', '1024x1536', '1536x1024', '2048x2048', '2048x1152', '3840x2160', '2160x3840'];
const QUALITY_LABELS: Record<string, string> = { low: '基础质量', medium: '中等质量', high: '高质量' };
const QUALITY_COLORS: Record<string, string> = { low: 'blue', medium: 'green', high: 'red' };

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingKey, setEditingKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState<Record<string, boolean>>({});
  const [searchText, setSearchText] = useState('');
  const [priceQualityFilter, setPriceQualityFilter] = useState<string>('all');
  const [creditsQualityFilter, setCreditsQualityFilter] = useState<string>('all');
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

  const handleBatchSavePrices = async () => {
    setSaving(true);
    try {
      const priceKeys = Object.keys(configs).filter(k => k.startsWith('price_'));
      const updates = priceKeys.map(key => ({
        key,
        value: configs[key] || '0',
        description: configs[key]?.toString() || '',
      }));

      const response = await fetch('/api/v1/admin/config/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        message.success(`批量保存了 ${updates.length} 个价格配置`);
      } else {
        message.error('批量保存失败');
      }
    } catch (error) {
      message.error('批量保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleBatchSaveCredits = async () => {
    setSaving(true);
    try {
      const creditKeys = Object.keys(configs).filter(k => k.startsWith('credits_'));
      const updates = creditKeys.map(key => ({
        key,
        value: configs[key] || '0',
        description: configs[key]?.toString() || '',
      }));

      const response = await fetch('/api/v1/admin/config/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        message.success(`批量保存了 ${updates.length} 个积分配置`);
      } else {
        message.error('批量保存失败');
      }
    } catch (error) {
      message.error('批量保存失败');
    } finally {
      setSaving(false);
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

  const configList = Object.keys(configs)
    .filter(key => !searchText || key.includes(searchText) || (configs[key] || '').includes(searchText))
    .map(key => ({
      key,
      value: configs[key],
      description: getConfigDescription(key),
    }));

  const getPriceData = (type: 'price' | 'credits', filter?: string) => {
    const data: any[] = [];
    QUALITIES.forEach(quality => {
      if (filter && filter !== 'all' && filter !== quality) return;
      SIZES.forEach(size => {
        const key = `${type}_${quality}_${size}`;
        data.push({
          key,
          quality,
          qualityLabel: QUALITY_LABELS[quality],
          size,
          value: configs[key] || '0',
        });
      });
    });
    return data;
  };

  const priceColumns = [
    {
      title: '质量',
      dataIndex: 'qualityLabel',
      width: 110,
      render: (label: string) => <Tag color={QUALITY_COLORS[label]}>{label}</Tag>,
    },
    {
      title: '尺寸',
      dataIndex: 'size',
      width: 130,
    },
    {
      title: '单价 (USD)',
      dataIndex: 'value',
      render: (value: string, record: any) => (
        <InputNumber
          value={parseFloat(value) || 0}
          onChange={(val) => setConfigs(prev => ({ ...prev, [record.key]: val?.toString() || '0' }))}
          min={0}
          precision={4}
          style={{ width: 140 }}
        />
      ),
    },
  ];

  const creditsColumns = [
    {
      title: '质量',
      dataIndex: 'qualityLabel',
      width: 110,
      render: (label: string) => <Tag color={QUALITY_COLORS[label]}>{label}</Tag>,
    },
    {
      title: '尺寸',
      dataIndex: 'size',
      width: 130,
    },
    {
      title: '积分消耗',
      dataIndex: 'value',
      render: (value: string, record: any) => (
        <InputNumber
          value={parseInt(value) || 0}
          onChange={(val) => setConfigs(prev => ({ ...prev, [record.key]: val?.toString() || '0' }))}
          min={0}
          style={{ width: 120 }}
        />
      ),
    },
  ];

  const togglePasswordVisible = (key: string) => {
    setPasswordVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderPasswordInput = (key: string, label: string, width: number = 400) => (
    <Form.Item label={label}>
      <Space.Compact style={{ width }}>
        <Input
          value={configs[key] || ''}
          onChange={e => setConfigs(prev => ({ ...prev, [key]: e.target.value }))}
          type={passwordVisible[key] ? 'text' : 'password'}
          style={{ flex: 1 }}
          placeholder={'请输入' + label}
        />
        <Button
          type={passwordVisible[key] ? 'default' : 'primary'}
          icon={passwordVisible[key] ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={() => togglePasswordVisible(key)}
        />
        <Popconfirm
          title="确定保存此配置？"
          onConfirm={() => handleSave(key, configs[key] || '')}
          okText="确定"
          cancelText="取消"
        >
          <Button type="primary" icon={<SaveOutlined />}>保存</Button>
        </Popconfirm>
      </Space.Compact>
    </Form.Item>
  );

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        <SettingOutlined /> 系统设置
      </Title>

      <Tabs
        defaultActiveKey="generation"
        size="large"
        items={[
          {
            key: 'generation',
            label: <><CodeOutlined /> 生成配置</>,
            children: (
              <Card loading={loading} title="基础配置">
                <Form layout="vertical">
                  <Form.Item label="默认图片尺寸">
                    <Select
                      value={configs['default_size'] || '1024x1024'}
                      onChange={(val) => setConfigs(prev => ({ ...prev, default_size: val }))}
                      style={{ width: 200 }}
                    >
                      {SIZES.map(size => (
                        <Option key={size} value={size}>{size}</Option>
                      ))}
                    </Select>
                    <Popconfirm
                      title="确定保存此配置？"
                      onConfirm={() => handleSave('default_size', configs['default_size'] || '1024x1024')}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button type="primary" style={{ marginLeft: 8 }} icon={<SaveOutlined />}>保存</Button>
                    </Popconfirm>
                  </Form.Item>

                  <Form.Item label="默认图片质量">
                    <Select
                      value={configs['default_quality'] || 'medium'}
                      onChange={(val) => setConfigs(prev => ({ ...prev, default_quality: val }))}
                      style={{ width: 200 }}
                    >
                      {QUALITIES.map(q => (
                        <Option key={q} value={q}>{QUALITY_LABELS[q]}</Option>
                      ))}
                    </Select>
                    <Popconfirm
                      title="确定保存此配置？"
                      onConfirm={() => handleSave('default_quality', configs['default_quality'] || 'medium')}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button type="primary" style={{ marginLeft: 8 }} icon={<SaveOutlined />}>保存</Button>
                    </Popconfirm>
                  </Form.Item>

                  <Divider style={{ margin: '16px 0' }} />

                  <Form.Item label="每日免费次数">
                    <Space.Compact>
                      <InputNumber
                        value={parseInt(configs['daily_free_generations'] || '10') || 10}
                        onChange={(val) => setConfigs(prev => ({ ...prev, daily_free_generations: val?.toString() || '10' }))}
                        min={0}
                        style={{ width: 150 }}
                      />
                      <Popconfirm
                        title="确定保存此配置？"
                        onConfirm={() => handleSave('daily_free_generations', configs['daily_free_generations'] || '10')}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button type="primary" icon={<SaveOutlined />}>保存</Button>
                      </Popconfirm>
                    </Space.Compact>
                  </Form.Item>

                  <Form.Item label="最大Prompt长度">
                    <Space.Compact>
                      <InputNumber
                        value={parseInt(configs['max_prompt_length'] || '4000') || 4000}
                        onChange={(val) => setConfigs(prev => ({ ...prev, max_prompt_length: val?.toString() || '4000' }))}
                        min={100}
                        max={10000}
                        step={100}
                        style={{ width: 150 }}
                      />
                      <Popconfirm
                        title="确定保存此配置？"
                        onConfirm={() => handleSave('max_prompt_length', configs['max_prompt_length'] || '4000')}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button type="primary" icon={<SaveOutlined />}>保存</Button>
                      </Popconfirm>
                    </Space.Compact>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'api',
            label: <><ApiOutlined /> API配置</>,
            children: (
              <Card loading={loading} title="第三方 API 配置">
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  配置第三方 API 密钥，修改后点击保存按钮生效。
                </Text>
                <Form layout="vertical">
                  {renderPasswordInput('openai_api_key', 'OpenAI API Key')}
                  {renderPasswordInput('relay_api_key', 'Relay API Key')}
                  <Form.Item label="Relay API Base URL">
                    <Space.Compact style={{ width: 400 }}>
                      <Input
                        value={configs['relay_api_base_url'] || ''}
                        onChange={e => setConfigs(prev => ({ ...prev, relay_api_base_url: e.target.value }))}
                        style={{ flex: 1 }}
                        placeholder="请输入 Relay API Base URL"
                      />
                      <Popconfirm
                        title="确定保存此配置？"
                        onConfirm={() => handleSave('relay_api_base_url', configs['relay_api_base_url'] || '')}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button type="primary" icon={<SaveOutlined />}>保存</Button>
                      </Popconfirm>
                    </Space.Compact>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'pricing',
            label: <><DollarOutlined /> 价格配置</>,
            children: (
              <Card
                extra={
                  <Space>
                    <Select
                      value={priceQualityFilter}
                      onChange={setPriceQualityFilter}
                      style={{ width: 120 }}
                      size="small"
                    >
                      <Option value="all">全部质量</Option>
                      {QUALITIES.map(q => (
                        <Option key={q} value={q}>{QUALITY_LABELS[q]}</Option>
                      ))}
                    </Select>
                    <Popconfirm
                      title="确定批量保存所有价格配置？"
                      onConfirm={handleBatchSavePrices}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button type="primary" icon={<SaveOutlined />} loading={saving}>
                        批量保存价格
                      </Button>
                    </Popconfirm>
                    <Button icon={<ReloadOutlined />} onClick={fetchConfigs}>刷新</Button>
                  </Space>
                }
                loading={loading}
              >
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  配置不同质量和尺寸的图片生成价格（USD/次），修改后点击批量保存价格生效。
                </Text>
                <Table
                  dataSource={getPriceData('price', priceQualityFilter)}
                  rowKey="key"
                  columns={priceColumns}
                  pagination={false}
                  size="small"
                />
              </Card>
            ),
          },
          {
            key: 'credits',
            label: '积分配置',
            children: (
              <Card
                extra={
                  <Space>
                    <Select
                      value={creditsQualityFilter}
                      onChange={setCreditsQualityFilter}
                      style={{ width: 120 }}
                      size="small"
                    >
                      <Option value="all">全部质量</Option>
                      {QUALITIES.map(q => (
                        <Option key={q} value={q}>{QUALITY_LABELS[q]}</Option>
                      ))}
                    </Select>
                    <Popconfirm
                      title="确定批量保存所有积分配置？"
                      onConfirm={handleBatchSaveCredits}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button type="primary" icon={<SaveOutlined />} loading={saving}>
                        批量保存积分
                      </Button>
                    </Popconfirm>
                    <Button icon={<ReloadOutlined />} onClick={fetchConfigs}>刷新</Button>
                  </Space>
                }
                loading={loading}
              >
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  配置不同质量和尺寸的图片生成所需积分，修改后点击批量保存积分生效。
                </Text>
                <Table
                  dataSource={getPriceData('credits', creditsQualityFilter)}
                  rowKey="key"
                  columns={creditsColumns}
                  pagination={false}
                  size="small"
                />
              </Card>
            ),
          },
          {
            key: 'all',
            label: '所有配置',
            children: (
              <Card
                extra={
                  <Space>
                    <Input
                      placeholder="搜索配置项..."
                      prefix={<SearchOutlined />}
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      style={{ width: 200 }}
                      allowClear
                    />
                    <Button icon={<ReloadOutlined />} onClick={fetchConfigs}>刷新</Button>
                  </Space>
                }
                loading={loading}
              >
                <Table
                  dataSource={configList}
                  rowKey="key"
                  pagination={{ pageSize: 20 }}
                  columns={[
                    {
                      title: '配置项',
                      dataIndex: 'key',
                      width: 250,
                      render: (key: string) => <Text strong>{key}</Text>,
                    },
                    {
                      title: '值',
                      dataIndex: 'value',
                      ellipsis: { showTitle: false },
                      render: (value: string) => (
                        <Tooltip title={value || '-'}>
                          <Text>{value || '-'}</Text>
                        </Tooltip>
                      ),
                    },
                    {
                      title: '描述',
                      dataIndex: 'description',
                      width: 200,
                    },
                    {
                      title: '操作',
                      width: 100,
                      fixed: 'right' as const,
                      render: (_: any, record: any) => (
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
        okText="保存"
        cancelText="取消"
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
