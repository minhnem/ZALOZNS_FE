import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  Button, 
  Input, 
  Select, 
  DatePicker, 
  Table, 
  Tag, 
  Space, 
  Tooltip,
  Popconfirm,
  Tabs,
  App
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined,
  RocketOutlined,
  CopyOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import handleAPI from '../../apis/handleAPI';
import { hasPermission } from '../../utils/hasPermission';
import DashboardLayout from '../../layouts/DashboardLayout';
import LifecycleMilestones from '../../components/LifecycleMilestones';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function MarketingPage() {
  const router = useRouter();
  const user = useSelector((state) => state.auth.user);
  const { message: messageApi } = App.useApp();

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await handleAPI('/api/campaigns', null, 'get');
      setCampaigns(res.map(item => ({ ...item, key: item._id })));
    } catch (error) {
      console.error(error);
      messageApi.error('Lấy danh sách chiến dịch thất bại');
    } finally {
      setLoading(false);
    }
  };

  const parseCronDisplay = (cronStr) => {
    if (!cronStr) return "Hàng ngày lúc 09:00 AM";
    const parts = cronStr.split(' ');
    if (parts.length >= 2) {
      const hour = parts[1].padStart(2, '0');
      const min = parts[0].padStart(2, '0');
      return `Hàng ngày lúc ${hour}:${min}`;
    }
    return cronStr;
  };

  const handleDelete = async (id) => {
    try {
      await handleAPI(`/api/campaigns/${id}`, null, 'delete');
      messageApi.success('Đã xóa chiến dịch!');
      fetchCampaigns();
    } catch (error) {
      messageApi.error('Lỗi khi xóa chiến dịch');
    }
  };

  // Filtered data
  const filteredCampaigns = campaigns.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchText.toLowerCase());
    const matchType = filterType === 'all' || c.type === filterType;
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const columns = [
    {
      title: 'Tên Chiến Dịch',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontWeight: 600, color: '#111827' }}>{text}</span>,
    },
    {
      title: 'Loại (Type)',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Template ZNS',
      dataIndex: 'zns_template_id',
      key: 'zns_template_id',
      render: (text, record) => {
        if (record.type === 'MASTER_CAMPAIGN') {
           const subCount = record.sub_events ? record.sub_events.length : 0;
           if (subCount > 0) {
             const tooltipContent = (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 {record.sub_events.map((ev, idx) => (
                   <span key={idx}>- Sự kiện {idx + 1}: [{ev.zns_template_id}]</span>
                 ))}
               </div>
             );
             return (
               <Tooltip title={tooltipContent}>
                 <Tag color="purple" style={{ cursor: 'pointer' }}>{subCount} Sự kiện con</Tag>
               </Tooltip>
             );
           }
           return <Tag color="purple">0 Sự kiện con</Tag>;
        }

        if (record.type === 'LIFECYCLE' || record.type === 'PRODUCT_REFILL') {
           const milestoneCount = record.milestones ? record.milestones.length : 0;
           if (milestoneCount > 0) {
             const tooltipContent = (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 {record.milestones.map((m, idx) => (
                   <span key={idx}>- Mốc {idx + 1}: [{m.zns_template_id || text || 'Chưa set'}]</span>
                 ))}
               </div>
             );
             return (
               <Tooltip title={tooltipContent}>
                 <Tag color="magenta" style={{ cursor: 'pointer' }}>{milestoneCount} Mốc kịch bản</Tag>
               </Tooltip>
             );
           }
        }

        return text ? <Tag color="blue">{text}</Tag> : <span style={{ color: '#9ca3af' }}>Chưa set</span>;
      }
    },
    {
      title: 'Sản phẩm',
      key: 'product_id',
      render: (_, record) => {
        if (record.product_id && record.product_id.name) {
          return <Tag color="green">{record.product_id.name}</Tag>;
        }
        return <span style={{ color: '#9ca3af' }}>—</span>;
      }
    },

    {
      title: 'Trạng thái',
      key: 'status',
      dataIndex: 'status',
      render: (status) => {
        const map = {
          active: { color: 'success', icon: '🟢', text: 'Đang hoạt động' },
          draft: { color: 'default', icon: '📝', text: 'Bản nháp' },
          paused: { color: 'error', icon: '🔴', text: 'Tạm dừng' }
        };
        const s = map[status] || map.draft;
        return <Tag color={s.color} style={{ fontWeight: 500 }}>{s.icon} {s.text}</Tag>;
      },
    },
    {
      title: 'Lịch bắn / Mốc',
      key: 'schedule',
      render: (_, record) => {
        if (record.type === 'MASTER_CAMPAIGN') {
          return <span style={{ color: '#0d6e57', fontWeight: 500 }}>Theo lịch sự kiện con</span>;
        }
        if (record.is_auto_run && record.start_time) {
          return new Date(record.start_time).toLocaleString('vi-VN');
        }
        if (record.is_auto_run && record.recurring_schedule) {
          return parseCronDisplay(record.recurring_schedule);
        }
        return <span style={{ color: '#9ca3af' }}>Chạy thủ công</span>;
      }
    },
    {
      title: 'Người tạo / Cập nhật',
      key: 'audit',
      width: 200,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div style={{ marginBottom: 4 }}><Text type="secondary">Tạo:</Text> <Text strong>{record.created_by?.fullName || 'Hệ thống'}</Text></div>
          <div><Text type="secondary">Sửa:</Text> <Text strong>{record.updated_by?.fullName || 'Hệ thống'}</Text></div>
        </div>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button type="text" style={{ color: '#0ea5e9' }} icon={<EyeOutlined />} onClick={() => router.push(`/marketing/create?view=${record._id}`)} />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => {
              if (!hasPermission(user, 'campaign_edit')) return messageApi.warning('Bạn không có quyền sửa chiến dịch!');
              router.push(`/marketing/create?edit=${record._id}`);
            }} />
          </Tooltip>
          <Tooltip title="Sao chép">
            <Button type="text" style={{ color: '#8b5cf6' }} icon={<CopyOutlined />} onClick={() => {
              if (!hasPermission(user, 'campaign_create')) return messageApi.warning('Bạn không có quyền tạo chiến dịch!');
              router.push(`/marketing/create?clone=${record._id}`);
            }} />
          </Tooltip>
          {hasPermission(user, 'campaign_delete') ? (
            <Popconfirm
              title="Bạn có chắc muốn xóa chiến dịch này?"
              onConfirm={() => handleDelete(record._id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          ) : (
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={(e) => {
                e.stopPropagation();
                messageApi.warning('Bạn không có quyền xóa chiến dịch!');
              }}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout title="Chiến dịch ZNS">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Quản Lý Chiến Dịch ZNS</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            size="large" 
            style={{ fontWeight: 600, borderRadius: 8 }}
            onClick={() => {
              if (!hasPermission(user, 'campaign_create')) return messageApi.warning('Bạn không có quyền tạo chiến dịch!');
              router.push('/marketing/create');
            }}
          >
            Tạo Chiến Dịch Mới
          </Button>
        </div>

        <Tabs
          defaultActiveKey="1"
          items={[
            {
              key: '1',
              label: 'Quản Lý Chiến Dịch ZNS',
              children: (
                <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  
                  {/* Filters Section */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                    <Input 
                      placeholder="Tìm kiếm chiến dịch..." 
                      prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ width: 250, borderRadius: 8 }}
                      allowClear
                    />
                    <Select
                      value={filterType}
                      onChange={setFilterType}
                      style={{ width: 180 }}
                      options={[
                        { value: 'all', label: 'Tất cả loại' },
                        { value: 'MASTER_CAMPAIGN', label: 'Sự kiện lớn (Master)' },
                        { value: 'LIFECYCLE', label: 'Vòng đời (Lifecycle)' },
                        { value: 'PRODUCT_REFILL', label: 'Nhắc mua lại' },
                        { value: 'PROMOTION', label: 'Khuyến mãi' },
                      ]}
                    />
                    <Select
                      value={filterStatus}
                      onChange={setFilterStatus}
                      style={{ width: 180 }}
                      options={[
                        { value: 'all', label: 'Tất cả trạng thái' },
                        { value: 'active', label: 'Đang hoạt động' },
                        { value: 'paused', label: 'Tạm dừng' },
                        { value: 'draft', label: 'Bản nháp' },
                      ]}
                    />
                    {(searchText || filterType !== 'all' || filterStatus !== 'all') && (
                      <Button 
                        icon={<ClearOutlined />} 
                        onClick={() => {
                          setSearchText('');
                          setFilterType('all');
                          setFilterStatus('all');
                        }}
                      >
                        Hủy lọc
                      </Button>
                    )}
                  </div>

                  {/* Table Section */}
                  <Table 
                    columns={columns} 
                    dataSource={filteredCampaigns}
                    loading={loading}
                    rowKey="_id"
                    pagination={{ 
                      pageSize: 10,
                      showSizeChanger: true,
                      showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} / ${total} bản ghi`
                    }}
                  />
                </Card>
              )
            },
            {
              key: '2',
              label: 'Kịch Bản Vòng Đời (Lifecycle)',
              children: <LifecycleMilestones />
            }
          ]}
        />
      </div>
    </DashboardLayout>
  );
}
