import React, { useState, useEffect } from 'react';
import { Typography, Card, Button, Select, Radio, Table, Badge, Tag, Input, Space, Divider, Row, Col, List, App } from 'antd';
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  SyncOutlined,
  RobotOutlined,
  EditOutlined
} from '@ant-design/icons';
import DashboardLayout from '../../layouts/DashboardLayout';
import handleAPI from '../../apis/handleAPI';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/hasPermission';

const { Title, Text } = Typography;

export default function AutomationPage() {
  const router = useRouter();
  const user = useSelector((state) => state.auth.user);
  const { message: messageApi } = App.useApp();
  const [isRunning, setIsRunning] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [activeCampaigns, setActiveCampaigns] = useState([]);
  const [manualCampaign, setManualCampaign] = useState('all');
  const [manualAudience, setManualAudience] = useState('all');
  const [triggerLoading, setTriggerLoading] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await handleAPI('/api/campaigns', null, 'get');
      if (res) {
        setCampaigns(res);
        setActiveCampaigns(res.filter(c => c.status === 'active' && c.is_auto_run));
      }
    } catch (error) {
      messageApi.error('Lấy dữ liệu chiến dịch thất bại');
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

  const handleManualTrigger = async () => {
    try {
      setTriggerLoading(true);
      const payload = {
        campaignId: manualCampaign,
        audience: manualAudience
      };
      const res = await handleAPI('/api/campaigns/trigger', payload, 'post');
      messageApi.success(res.message || 'Đã kích hoạt chiến dịch thành công!');
    } catch (error) {
      messageApi.error(error.message || 'Có lỗi xảy ra khi kích hoạt!');
    } finally {
      setTriggerLoading(false);
    }
  };

  const logColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'time',
      key: 'time',
      width: 180,
    },
    {
      title: 'Sự kiện (Event)',
      dataIndex: 'event',
      key: 'event',
      width: 250,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Chi tiết xử lý',
      dataIndex: 'details',
      key: 'details',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      dataIndex: 'status',
      width: 150,
      render: (status) => {
        let color = 'green';
        if (status === 'Info') color = 'blue';
        if (status === 'Error') color = 'red';
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  const logData = [
    {
      key: '1',
      time: '05/08/2026 09:00:05',
      event: 'AUTO_REFRESH_TOKEN',
      details: 'Cấp mới Zalo Access Token thành công',
      status: 'Success',
    },
    {
      key: '2',
      time: '05/08/2026 09:00:02',
      event: 'DISPATCHER_RUN_COMPLETED',
      details: 'Đã xử lý 1,250/1,250 khách hàng',
      status: 'Success',
    },
    {
      key: '3',
      time: '05/08/2026 09:00:01',
      event: 'CAMPAIGN_EXECUTE: Merries_Aug',
      details: 'Nhánh Refill: 80 tin, Chưa mua: 50',
      status: 'Success',
    },
    {
      key: '4',
      time: '05/08/2026 09:00:00',
      event: 'CRON_TRIGGER_START',
      details: 'Khởi chạy Cron Job định kỳ 9 AM',
      status: 'Info',
    },
  ];

  return (
    <DashboardLayout title="Tự động hóa ZNS">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

        <Title level={3} style={{ margin: 0, color: '#111827' }}>TRẠM ĐIỀU KHIỂN TỰ ĐỘNG HÓA ZNS</Title>

        {/* 1. STATUS */}
        <Card
          title={<span style={{ color: '#0d6e57', fontWeight: 600 }}>1. TRẠNG THÁI BỘ MÁY TỰ ĐỘNG (SYSTEM STATUS)</span>}
          style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
        >
          <Row gutter={24} align="middle">
            <Col span={18}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16 }}>
                  <Text strong>TRẠNG THÁI CRON JOB:</Text>
                  {isRunning ? (
                    <Badge status="success" text={<Text strong style={{ color: '#389e0d' }}>ĐANG HOẠT ĐỘNG (Running)</Text>} />
                  ) : (
                    <Badge status="error" text={<Text strong style={{ color: '#cf1322' }}>TẠM DỪNG (Paused)</Text>} />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <Row>
                    <Col span={8}><Text type="secondary">Cơ chế Lịch chạy:</Text></Col>
                    <Col span={16}><Text strong>Đa luồng (Mỗi chiến dịch một lịch riêng)</Text></Col>
                  </Row>
                  <Row>
                    <Col span={8}><Text type="secondary">Tổng số tiến trình đang chạy:</Text></Col>
                    <Col span={16}>
                      <Text strong style={{ fontSize: 18, color: '#0d6e57' }}>
                        {activeCampaigns.length}
                      </Text> tiến trình tự động hóa
                    </Col>
                  </Row>
                </div>
              </Space>
            </Col>
            <Col span={6} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                <Button
                  type={isRunning ? "default" : "primary"}
                  danger={isRunning}
                  icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  size="large"
                  style={{ width: '100%', height: 60, fontSize: 16, fontWeight: 600 }}
                  onClick={() => {
                    if (!hasPermission(user, 'campaign_edit')) return messageApi.warning('Bạn không có quyền thay đổi trạng thái hệ thống!');
                    setIsRunning(!isRunning);
                  }}
                >
                  {isRunning ? "Tạm Dừng Hệ Thống" : "Khởi Động Lại Hệ Thống"}
                </Button>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 2. MANUAL TRIGGER */}
        <Card
          title={<span style={{ color: '#d97706', fontWeight: 600 }}>2. KÍCH HOẠT CƯỠNG CHẾ THỦ CÔNG (MANUAL TRIGGER) ⚡</span>}
          style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderColor: '#fcd34d' }}
          headStyle={{ background: '#fffbeb', borderBottomColor: '#fde68a' }}
        >
          <Text style={{ display: 'block', marginBottom: 20 }}>
            Thao tác này sẽ ép hệ thống quét và gửi tin ngay lập tức mà không cần đợi đến giờ định kỳ.
          </Text>

          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 220, fontWeight: 500 }}>Chọn chiến dịch muốn chạy:</div>
              <Select
                value={manualCampaign}
                onChange={setManualCampaign}
                style={{ width: 400 }}
                options={[
                  { value: 'all', label: '-- Tất cả các chiến dịch Active --' },
                  ...activeCampaigns.map(c => ({ value: c._id, label: c.name }))
                ]}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 220, fontWeight: 500 }}>Tệp khách hàng áp dụng:</div>
              <Radio.Group value={manualAudience} onChange={(e) => setManualAudience(e.target.value)}>
                <Radio value="all">Tất cả khách hàng (đạt đk)</Radio>
                <Radio value="test">Chỉ gửi chạy thử (Test 1-2 SĐT Admin)</Radio>
              </Radio.Group>
            </div>

            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-start' }}>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                size="large"
                style={{ background: '#d97706', borderColor: '#d97706', fontWeight: 600, padding: '0 32px' }}
                onClick={() => {
                  if (!hasPermission(user, 'campaign_edit')) return messageApi.warning('Bạn không có quyền kích hoạt chiến dịch!');
                  handleManualTrigger();
                }}
                loading={triggerLoading}
              >
                🚀 KÍCH HOẠT CHẠY NGAY LẬP TỨC
              </Button>
            </div>
          </Space>
        </Card>

        {/* 3. ALL CAMPAIGNS */}
        <Card
          title={<span style={{ color: '#0d6e57', fontWeight: 600 }}>3. DANH SÁCH CHIẾN DỊCH (TẤT CẢ)</span>}
          style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
        >
          {campaigns.length === 0 ? (
            <Text type="secondary">Chưa có chiến dịch nào được tạo.</Text>
          ) : (
            <List
              dataSource={campaigns}
              pagination={{
                pageSize: 5,
                showSizeChanger: false,
                align: 'center',
              }}
              renderItem={(camp) => (
                <List.Item style={{ borderBottom: 'none', padding: 0 }}>
                  <Card
                    key={camp._id}
                    type="inner"
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Text strong style={{ fontSize: 16 }}>CHIẾN DỊCH:</Text>
                        <Text strong style={{ color: '#0d6e57', fontSize: 16 }}>{camp.name}</Text>
                        <Tag color={camp.status === 'active' ? 'green' : 'blue'}>{camp.status === 'active' ? 'Đang chạy' : 'Đang chờ (Waiting)'}</Tag>
                      </div>
                    }
                    extra={
                      <Space>
                        <Button 
                          type="primary" 
                          ghost 
                          icon={<EditOutlined />}
                          onClick={() => {
                            if (!hasPermission(user, 'campaign_edit')) return messageApi.warning('Bạn không có quyền sửa chiến dịch!');
                            router.push(`/marketing/create?edit=${camp._id}`);
                          }}
                        >
                          Sửa Chiến Dịch
                        </Button>
                        <Button type="default" danger icon={<PauseCircleOutlined />} onClick={() => {
                          if (!hasPermission(user, 'campaign_edit')) return messageApi.warning('Bạn không có quyền hủy lịch chạy!');
                        }}>
                          Hủy Lịch Chạy
                        </Button>
                      </Space>
                    }
                    style={{ marginBottom: 16, borderColor: '#e5e7eb', width: '100%' }}
                    headStyle={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '0 20px' }}
                    bodyStyle={{ padding: '20px' }}
                  >
                    <Row>
                      <Col span={6}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Thời gian bắt đầu:</Text>
                        <Text strong style={{ fontSize: 15 }}>{camp.start_time ? new Date(camp.start_time).toLocaleString('vi-VN') : 'Ngay lập tức'}</Text>
                      </Col>
                      <Col span={6}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Thời gian kết thúc:</Text>
                        <Text strong style={{ fontSize: 15 }}>{camp.end_time ? new Date(camp.end_time).toLocaleString('vi-VN') : 'Không giới hạn'}</Text>
                      </Col>
                      <Col span={6}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Sản phẩm / Loại:</Text>
                        <Text strong style={{ fontSize: 15 }}>{camp.product_id?.name || camp.type}</Text>
                      </Col>
                      <Col span={6}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Lịch chạy định kỳ:</Text>
                        <Text strong style={{ fontSize: 15 }}>{camp.recurring_schedule ? parseCronDisplay(camp.recurring_schedule) : <span style={{ color: '#9ca3af' }}>Hàng ngày lúc 09:00 AM</span>}</Text>
                      </Col>
                    </Row>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* 4. LOGS */}
        <Card
          title={<span style={{ color: '#0d6e57', fontWeight: 600 }}>4. NHẬT KÝ TIẾN TRÌNH CHẠY TỰ ĐỘNG (DISPATCHER LOGS)</span>}
          style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Space>
              <Input
                placeholder="Tìm kiếm log..."
                prefix={<SearchOutlined />}
                style={{ width: 300 }}
                allowClear
              />
              <Select defaultValue="all" style={{ width: 150 }}>
                <Select.Option value="all">Tất cả sự kiện</Select.Option>
                <Select.Option value="success">Thành công</Select.Option>
                <Select.Option value="error">Lỗi</Select.Option>
              </Select>
            </Space>
            <Button icon={<SyncOutlined />}>Làm mới</Button>
          </div>

          <Table
            columns={logColumns}
            dataSource={logData}
            pagination={{ pageSize: 10 }}
            bordered
            size="middle"
          />
        </Card>

      </div>
    </DashboardLayout>
  );
}
