import React from 'react';
import { Typography, Card } from 'antd';
import DashboardLayout from '../../layouts/DashboardLayout';

const { Title, Text } = Typography;

export default function SettingsPage() {
  return (
    <DashboardLayout title="Cài đặt">
      <Card bordered={false} style={{ minHeight: '100%', borderRadius: 12 }}>
        <Title level={3}>Cài đặt hệ thống</Title>
        <Text type="secondary">Giao diện Cài đặt đang được xây dựng...</Text>
      </Card>
    </DashboardLayout>
  );
}
