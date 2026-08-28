import React from 'react';
import { Typography, Card, Tabs } from 'antd';
import DashboardLayout from '../../layouts/DashboardLayout';
import RoleManagement from '../../components/settings/RoleManagement';
import UserManagement from '../../components/settings/UserManagement';
import AuditLogManagement from '../../components/settings/AuditLogManagement';
import KiotVietSettings from '../../components/settings/KiotVietSettings';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const items = [
    {
      key: '1',
      label: 'Cài đặt hệ thống',
      children: <Text type="secondary">Giao diện Cài đặt đang được xây dựng...</Text>
    },
    {
      key: '2',
      label: 'Phân quyền & Vai trò',
      children: <RoleManagement />
    },
    {
      key: '3',
      label: 'Nhân sự',
      children: <UserManagement />
    },
    {
      key: '4',
      label: 'Nhật ký hệ thống',
      children: <AuditLogManagement />
    },
    {
      key: '5',
      label: 'Kết nối KiotViet',
      children: <KiotVietSettings />
    }
  ];

  return (
    <DashboardLayout title="Cài đặt">
      <Card bordered={false} style={{ minHeight: '100%', borderRadius: 12 }}>
        <Title level={3}>Cài đặt</Title>
        <Tabs defaultActiveKey="2" items={items} />
      </Card>
    </DashboardLayout>
  );
}
