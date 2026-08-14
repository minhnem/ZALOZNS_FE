import React, { useState, useEffect } from 'react';
import { Table, Tag, App, Typography, Space } from 'antd';
import handleAPI from '../../apis/handleAPI';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text } = Typography;

export default function AuditLogManagement() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const { message: messageApi } = App.useApp();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await handleAPI('/api/activity-logs', null, 'get');
      setLogs(res || []);
    } catch (error) {
      messageApi.error('Lỗi lấy nhật ký hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const getActionTag = (action) => {
    switch (action) {
      case 'CREATE': return <Tag color="green">THÊM MỚI</Tag>;
      case 'UPDATE': return <Tag color="blue">CẬP NHẬT</Tag>;
      case 'DELETE': return <Tag color="red">XÓA</Tag>;
      case 'SYNC': return <Tag color="purple">ĐỒNG BỘ</Tag>;
      case 'LOGIN': return <Tag color="default">ĐĂNG NHẬP</Tag>;
      default: return <Tag>{action}</Tag>;
    }
  };

  const getEntityName = (entityType) => {
    switch (entityType) {
      case 'Campaign': return 'Chiến dịch';
      case 'Customer': return 'Khách hàng';
      case 'Order': return 'Đơn hàng';
      case 'ZnsTemplate': return 'Mẫu ZNS';
      case 'User': return 'Tài khoản';
      default: return entityType;
    }
  };

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (val) => (
        <div>
          <div>{dayjs(val).format('HH:mm - DD/MM/YYYY')}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(val).fromNow()}</Text>
        </div>
      )
    },
    {
      title: 'Người thao tác',
      dataIndex: 'user_id',
      key: 'user',
      width: 200,
      render: (user) => (
        <Space>
          <Text strong>{user?.fullName || 'Hệ thống'}</Text>
        </Space>
      )
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (val) => getActionTag(val)
    },
    {
      title: 'Đối tượng',
      dataIndex: 'entity_type',
      key: 'entity_type',
      width: 150,
      render: (val) => <Text strong>{getEntityName(val)}</Text>
    },
    {
      title: 'Chi tiết',
      dataIndex: 'details',
      key: 'details'
    }
  ];

  return (
    <div>
      <Table 
        columns={columns} 
        dataSource={logs} 
        rowKey="_id" 
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
}
