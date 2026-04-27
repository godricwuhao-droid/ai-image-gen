import React from 'react';
import { Card, Form, Input, Button, Switch, message } from 'antd';

const Settings: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log('Success:', values);
    message.success('设置保存成功');
  };

  return (
    <div>
      <h2>系统设置</h2>
      <Card title="基本设置" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            site_name: 'AI Image Generator',
            maintenance_mode: false,
          }}
        >
          <Form.Item label="网站名称" name="site_name">
            <Input />
          </Form.Item>
          <Form.Item label="网站描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="维护模式" name="maintenance_mode" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Settings;
