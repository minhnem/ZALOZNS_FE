import React from 'react';
import { Typography, Card } from 'antd';
import DashboardLayout from '../../layouts/DashboardLayout';

const { Title, Text } = Typography;

export default function ReportsPage() {
  return (
    <DashboardLayout title="Báo cáo">
      <Card bordered={false} style={{ minHeight: '100%', borderRadius: 12 }}>
        <Title level={3}>Báo cáo</Title>
        <Text type="secondary">Giao diện Báo cáo đang được xây dựng...</Text>
      </Card>
    </DashboardLayout>
  );
}
