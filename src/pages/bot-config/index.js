import React from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import PageTitle from '@/components/PageTitle';
import { Form, Input, Button, App } from 'antd';
import { useSelector } from 'react-redux';
import { hasPermission } from '@/utils/hasPermission';

const BotConfig = () => {
  const { user } = useSelector((state) => state.auth);
  const { message: messageApi } = App.useApp();
  return (
    <DashboardLayout title="Bot Configuration">
      <div className="max-w-2xl">
        <PageTitle title="Manage Prompts & System Instructions" />
        <Form layout="vertical">
          <Form.Item label="System Instruction" name="systemInstruction" rules={[{ required: true }]}>
            <Input.TextArea rows={6} placeholder="Enter instructions for the AI bot..." />
          </Form.Item>
          <Form.Item label="Fallback Message" name="fallbackMessage">
            <Input placeholder="Message to send when bot doesn't understand..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" onClick={(e) => {
              if (!hasPermission(user, 'system_edit')) {
                e.preventDefault();
                messageApi.warning('Bạn không có quyền sửa cấu hình hệ thống!');
              }
            }}>
              Save Configuration
            </Button>
          </Form.Item>
        </Form>
      </div>
    </DashboardLayout>
  );
};

export default BotConfig;
