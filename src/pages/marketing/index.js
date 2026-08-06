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
  message,
  Popconfirm,
  Tabs
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined,
  RocketOutlined 
} from '@ant-design/icons';
import { useRouter } from 'next/router';
import handleAPI from '../../apis/handleAPI';
import DashboardLayout from '../../layouts/DashboardLayout';
import LifecycleMilestones from '../../components/LifecycleMilestones';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function MarketingPage() {
  const router = useRouter();
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
      message.error('Lấy danh sách chiến dịch thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await handleAPI(`/api/campaigns/${id}`, null, 'delete');
      message.success('Đã xóa chiến dịch!');
      fetchCampaigns();
    } catch (error) {
      message.error('Lỗi khi xóa chiến dịch');
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
      render: (text) => text ? <Tag color="blue">{text}</Tag> : <span style={{ color: '#9ca3af' }}>Chưa set</span>
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
          active: { color: 'success', icon: '🟢', text: 'Active' },
          scheduled: { color: 'warning', icon: '🟡', text: 'Scheduled' },
          completed: { color: 'default', icon: '⚪', text: 'Completed' },
          draft: { color: 'default', icon: '📝', text: 'Draft' },
          paused: { color: 'error', icon: '🔴', text: 'Paused' }
        };
        const s = map[status] || map.draft;
        return <Tag color={s.color} style={{ fontWeight: 500 }}>{s.icon} {s.text}</Tag>;
      },
    },
    {
      title: 'Lịch bắn / Mốc',
      key: 'schedule',
      render: (_, record) => {
        if (record.is_auto_run && record.start_time) {
          return new Date(record.start_time).toLocaleString('vi-VN');
        }
        return record.recurring_schedule || <span style={{ color: '#9ca3af' }}>Chạy thủ công</span>;
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => router.push(`/marketing/create?edit=${record._id}`)} />
          </Tooltip>
          <Popconfirm
            title="Bạn có chắc muốn xóa chiến dịch này?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
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
            onClick={() => router.push('/marketing/create')}
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
                        { value: 'LIFECYCLE', label: 'LIFECYCLE' },
                        { value: 'PRODUCT_REFILL', label: 'PRODUCT_REFILL' },
                        { value: 'PROMOTION', label: 'PROMOTION' },
                      ]}
                    />
                    <Select
                      value={filterStatus}
                      onChange={setFilterStatus}
                      style={{ width: 160 }}
                      options={[
                        { value: 'all', label: 'Tất cả trạng thái' },
                        { value: 'active', label: 'Active' },
                        { value: 'scheduled', label: 'Scheduled' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'draft', label: 'Draft' },
                        { value: 'paused', label: 'Paused' },
                      ]}
                    />
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
