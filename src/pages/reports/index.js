import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  Row,
  Col,
  Table,
  Tag,
  Space,
  Button,
  DatePicker,
  Drawer,
  Statistic,
  Progress,
  Tooltip,
  App
} from 'antd';
import {
  PieChartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  SyncOutlined,
  UserOutlined,
  WarningOutlined
} from '@ant-design/icons';
import DashboardLayout from '../../layouts/DashboardLayout';
import handleAPI from '../../apis/handleAPI';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function ReportsPage() {
  const { message: messageApi } = App.useApp();

  // State for master view
  const [campaigns, setCampaigns] = useState([]);
  const [overallStats, setOverallStats] = useState({ success: 0, failed: 0 });
  const [dailyStats, setDailyStats] = useState([]);
  const [loading, setLoading] = useState(false);

  // Date filter (Default: this month)
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);

  // State for detail drawer
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignLogs, setCampaignLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch campaigns
  const fetchCampaigns = async (dates) => {
    setLoading(true);
    try {
      let url = '/api/reports/campaigns';
      if (dates && dates[0] && dates[1]) {
        url += `?startDate=${dates[0].toISOString()}&endDate=${dates[1].toISOString()}`;
      }
      const res = await handleAPI(url, null, 'get');
      if (res) {
        setCampaigns(res.campaigns || []);
        setOverallStats(res.overallStats || { success: 0, failed: 0 });
        setDailyStats(res.dailyStats || []);
      }
    } catch (error) {
      console.error('Lỗi khi tải báo cáo chiến dịch', error);
      messageApi.error('Không thể tải dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns(dateRange);
  }, [dateRange]);

  const onDateChange = (dates) => {
    setDateRange(dates);
  };

  // Open Drawer and fetch logs
  const openDetail = async (campaign) => {
    setSelectedCampaign(campaign);
    setDrawerVisible(true);
    setLogsLoading(true);
    try {
      let url = `/api/reports/campaigns/${campaign._id}/logs`;
      if (dateRange && dateRange[0] && dateRange[1]) {
        url += `?startDate=${dateRange[0].toISOString()}&endDate=${dateRange[1].toISOString()}`;
      }
      const res = await handleAPI(url, null, 'get');
      if (res) {
        setCampaignLogs(res);
      }
    } catch (error) {
      console.error('Lỗi tải chi tiết logs:', error);
      messageApi.error('Không thể tải chi tiết danh sách gửi');
    } finally {
      setLogsLoading(false);
    }
  };

  // ─── Columns for Campaign Master View ───
  const campaignColumns = [
    {
      title: 'Tên chiến dịch',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => openDetail(record)} style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>
          {text}
        </a>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        if (status === 'active') return <Tag color="success">Hoạt động</Tag>;
        if (status === 'scheduled') return <Tag color="blue">Đã lên lịch</Tag>;
        return <Tag>{status}</Tag>;
      }
    },
    {
      title: 'Tổng đã gửi',
      dataIndex: 'totalCount',
      key: 'totalCount',
      align: 'center',
      render: (val) => <Text strong style={{ fontSize: 15 }}>{val}</Text>
    },
    {
      title: 'Tỷ lệ thành công',
      key: 'successRate',
      width: 250,
      render: (_, record) => {
        const percent = record.totalCount > 0 ? Math.round((record.successCount / record.totalCount) * 100) : 0;
        return (
          <Tooltip title={`${record.successCount} thành công / ${record.failedCount} thất bại`}>
            <Progress percent={percent} size="small" strokeColor="#10b981" trailColor="#fee2e2" />
          </Tooltip>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" size="small" style={{ borderRadius: 6 }} onClick={() => openDetail(record)}>
          Xem chi tiết
        </Button>
      )
    }
  ];

  // ─── Columns for Detail Logs Drawer ───
  const logColumns = [
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500, color: '#111827' }}>{record.customerId?.name || 'Khách vãng lai'}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{record.phoneSent}</div>
        </div>
      )
    },
    {
      title: 'Bé / Giai đoạn',
      key: 'baby',
      render: (_, record) => {
        if (!record.customerId) return <Text type="secondary">—</Text>;
        const { baby_name, baby_dob, edd } = record.customerId;
        return (
          <div>
            {baby_name && <div style={{ fontSize: 13 }}>Bé: {baby_name}</div>}
            {record.stage === 'PREGNANCY' && <Tag color="warning" style={{ marginTop: 4 }}>Thai kỳ</Tag>}
            {record.stage === 'BABY' && <Tag color="processing" style={{ marginTop: 4 }}>Đã sinh</Tag>}
          </div>
        );
      }
    },
    {
      title: 'Trạng thái gửi',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        if (status === 'success') return <Tag icon={<CheckCircleOutlined />} color="success">Thành công</Tag>;
        return (
          <Tooltip title={record.errorMessage || 'Lỗi không xác định'}>
            <Tag icon={<CloseCircleOutlined />} color="error">Thất bại</Tag>
          </Tooltip>
        );
      }
    },
    {
      title: 'Thời gian gửi',
      dataIndex: 'sentAt',
      key: 'sentAt',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '—'
    }
  ];

  const overallTotal = overallStats.success + overallStats.failed;
  const successPercent = overallTotal > 0 ? Math.round((overallStats.success / overallTotal) * 100) : 0;

  // Custom Bar Chart Component
  const DailyBarChart = ({ data }) => {
    if (!data || data.length === 0) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text type="secondary">Chưa có dữ liệu</Text></div>;

    const chartWidth = 600;
    const chartHeight = 160;
    const gap = 16;
    const maxVal = Math.max(...data.map(d => Math.max(d.success, d.failed)), 1) * 1.2;
    const barWidth = Math.min(24, (chartWidth - data.length * gap) / (data.length * 2));

    return (
      <div style={{ width: '100%' }}>
        {/* HTML Legend (no overlap with SVG) */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, paddingLeft: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#10b981' }} />
            <span style={{ fontSize: 12, color: '#6b7280' }}>Thành công</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#ef4444' }} />
            <span style={{ fontSize: 12, color: '#6b7280' }}>Thất bại</span>
          </div>
        </div>

        <svg width="100%" viewBox={`0 0 ${chartWidth + 60} ${chartHeight + 40}`} style={{ overflow: 'visible' }}>
          {[0, 0.5, 1].map((ratio, i) => {
            const y = chartHeight - ratio * chartHeight;
            return (
              <g key={i}>
                <text x="30" y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="11">{Math.round(ratio * maxVal)}</text>
                <line x1="40" y1={y} x2={chartWidth + 40} y2={y} stroke="#f3f4f6" strokeWidth="1" />
              </g>
            );
          })}

          {data.map((d, idx) => {
            const groupWidth = barWidth * 2 + 4;
            const x = 40 + gap + idx * (groupWidth + gap);
            const successHeight = (d.success / maxVal) * chartHeight;
            const failedHeight = (d.failed / maxVal) * chartHeight;

            return (
              <g key={idx}>
                <rect x={x} y={chartHeight - successHeight} width={barWidth} height={successHeight} fill="#10b981" rx="2" />
                <rect x={x + barWidth + 4} y={chartHeight - failedHeight} width={barWidth} height={failedHeight} fill="#ef4444" rx="2" />
                <text x={x + barWidth} y={chartHeight + 20} textAnchor="middle" fill="#6b7280" fontSize="11">{d.date}</text>
              </g>
            );
          })}
          <line x1="40" y1={chartHeight} x2={chartWidth + 40} y2={chartHeight} stroke="#e5e7eb" strokeWidth="1" />
        </svg>
      </div>
    );
  };

  return (
    <DashboardLayout title="Báo Cáo ZNS">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <Title level={3} style={{ margin: 0, color: '#111827', fontWeight: 700 }}>
            Báo Cáo Chiến Dịch
          </Title>
          <Space>
            <RangePicker
              value={dateRange}
              onChange={onDateChange}
              format="DD/MM/YYYY"
              allowClear={false}
              style={{ borderRadius: 8 }}
            />
            <Button icon={<SyncOutlined />} onClick={() => fetchCampaigns(dateRange)} style={{ borderRadius: 8 }}>
              Làm mới
            </Button>
          </Space>
        </div>

        {/* Charts Row */}
        <Row gutter={24}>
          <Col xs={24} md={8}>
            <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', height: '100%' }} bodyStyle={{ padding: 24 }}>
              <Title level={5} style={{ marginTop: 0, color: '#374151' }}>Tổng Quan Trạng Thái</Title>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, marginTop: 24 }}>
                <Progress type="dashboard" percent={successPercent} strokeColor="#10b981" trailColor="#fee2e2" size={130} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>Thành công</Text>
                    <Text strong style={{ fontSize: 20, color: '#10b981' }}>{overallStats.success}</Text>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>Thất bại</Text>
                    <Text strong style={{ fontSize: 20, color: '#ef4444' }}>{overallStats.failed}</Text>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', height: '100%' }} bodyStyle={{ padding: 24 }}>
              <Title level={5} style={{ marginTop: 0, color: '#374151', marginBottom: 24 }}>Lưu Lượng Gửi Tin (Theo Ngày)</Title>
              <DailyBarChart data={dailyStats} />
            </Card>
          </Col>
        </Row>

        {/* Master View - Campaign List */}
        <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }} bodyStyle={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              Báo cáo hiệu quả các chiến dịch ZNS trong khoảng thời gian đã chọn. Bấm vào chiến dịch để xem danh sách khách hàng chi tiết.
            </Text>
          </div>
          <Table
            columns={campaignColumns}
            dataSource={campaigns}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Không có dữ liệu gửi ZNS trong thời gian này' }}
          />
        </Card>

        {/* Detail View - Drawer */}
        <Drawer
          title={<span style={{ fontWeight: 600 }}>Chi Tiết Chiến Dịch: {selectedCampaign?.name}</span>}
          width={700}
          placement="right"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          bodyStyle={{ padding: '20px 24px', backgroundColor: '#f9fafb' }}
        >
          {selectedCampaign && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Summary Cards */}
              <Row gutter={16}>
                <Col span={8}>
                  <Card bordered={false} style={{ borderRadius: 10, textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <Statistic
                      title="Tổng đã gửi"
                      value={selectedCampaign.totalCount}
                      valueStyle={{ color: '#111827', fontWeight: 700 }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card bordered={false} style={{ borderRadius: 10, textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <Statistic
                      title="Thành công"
                      value={selectedCampaign.successCount}
                      valueStyle={{ color: '#10b981', fontWeight: 700 }}
                      prefix={<CheckCircleOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card bordered={false} style={{ borderRadius: 10, textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <Statistic
                      title="Thất bại"
                      value={selectedCampaign.failedCount}
                      valueStyle={{ color: '#ef4444', fontWeight: 700 }}
                      prefix={<CloseCircleOutlined />}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Logs Table */}
              <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>Danh sách đối tượng nhận</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>Danh sách khách hàng và trạng thái gửi của từng người.</Text>
                </div>
                <Table
                  columns={logColumns}
                  dataSource={campaignLogs}
                  rowKey="_id"
                  loading={logsLoading}
                  pagination={{ pageSize: 8 }}
                  size="small"
                />
              </Card>

            </div>
          )}
        </Drawer>

      </div>
    </DashboardLayout>
  );
}
