import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Card,
  Row,
  Col,
  Table,
  Tag,
  Space,
  Input,
  Select,
  Button,
  Statistic,
  Tooltip,
  Badge,
  Spin,
  message
} from 'antd';
import {
  TeamOutlined,
  UserAddOutlined,
  ApartmentOutlined,
  DollarOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  RiseOutlined,
  MoreOutlined,
  BellOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  SyncOutlined
} from '@ant-design/icons';
import DashboardLayout from '../../layouts/DashboardLayout';
import handleAPI from '../../apis/handleAPI';

const { Title, Text } = Typography;

// ─── Segment colors & labels ────────────────────────────────────────────────
const SEGMENT_CONFIG = {
  PREGNANCY: { color: '#f59e0b', bg: '#fef3c7', label: 'Mang thai', tag: 'warning' },
  NEWBORN:   { color: '#10b981', bg: '#d1fae5', label: 'Sơ sinh',   tag: 'success' },
  INFANT:    { color: '#3b82f6', bg: '#dbeafe', label: 'Nhũ nhi',   tag: 'processing' },
  TODDLER:   { color: '#8b5cf6', bg: '#ede9fe', label: 'Tập đi',    tag: 'purple' },
  PRESCHOOL: { color: '#ec4899', bg: '#fce7f3', label: 'Mẫu giáo',  tag: 'magenta' },
  UNKNOWN:   { color: '#6b7280', bg: '#f3f4f6', label: 'Chưa rõ',   tag: 'default' },
};

const CHART_COLORS = {
  pregnancy: '#f59e0b',
  newborn:   '#34d399',
  infant:    '#60a5fa',
  toddler:   '#0d6e57',
  preschool: '#a78bfa',
};

// ─── Simple SVG Bar Chart Component ─────────────────────────────────────────
const BarChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  const categories = ['pregnancy', 'newborn', 'infant', 'toddler', 'preschool'];
  const categoryLabels = {
    pregnancy: 'Mang thai',
    newborn: 'Sơ sinh (0-6th)',
    infant: 'Nhũ nhi (6-12th)',
    toddler: 'Tập đi (1-3t)',
    preschool: 'Mẫu giáo (3t+)'
  };

  const maxVal = Math.max(...data.map(d => categories.reduce((sum, cat) => sum + (d[cat] || 0), 0)), 1);
  const chartWidth = 680;
  const chartHeight = 240;
  const barWidth = 36;
  const gap = (chartWidth - data.length * barWidth) / (data.length + 1);

  // Y-axis scale
  const yTicks = [];
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(Math.round((maxVal / tickCount) * i));
  }

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: CHART_COLORS[cat] }} />
            <span style={{ fontSize: 12, color: '#6b7280' }}>{categoryLabels[cat]}</span>
          </div>
        ))}
      </div>

      <svg width="100%" viewBox={`0 0 ${chartWidth + 60} ${chartHeight + 40}`} style={{ overflow: 'visible' }}>
        {/* Y-axis labels */}
        {yTicks.map((tick, i) => {
          const y = chartHeight - (tick / maxVal) * chartHeight + 10;
          return (
            <g key={i}>
              <text x="30" y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="11">{tick}</text>
              <line x1="40" y1={y} x2={chartWidth + 40} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, idx) => {
          const x = 40 + gap + idx * (barWidth + gap);
          let currentY = chartHeight + 10;

          return (
            <g key={idx}>
              {categories.map(cat => {
                const val = d[cat] || 0;
                const height = maxVal > 0 ? (val / maxVal) * chartHeight : 0;
                currentY -= height;
                return (
                  <rect
                    key={cat}
                    x={x}
                    y={currentY}
                    width={barWidth}
                    height={height}
                    fill={CHART_COLORS[cat]}
                    rx="2"
                  >
                    <title>{`${categoryLabels[cat]}: ${val}`}</title>
                  </rect>
                );
              })}
              {/* Month label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 28}
                textAnchor="middle"
                fill="#6b7280"
                fontSize="11"
              >
                {d.month}
              </text>
            </g>
          );
        })}

        {/* Y-axis line */}
        <line x1="40" y1="10" x2="40" y2={chartHeight + 10} stroke="#e5e7eb" strokeWidth="1" />
        {/* X-axis line */}
        <line x1="40" y1={chartHeight + 10} x2={chartWidth + 40} y2={chartHeight + 10} stroke="#e5e7eb" strokeWidth="1" />
      </svg>
    </div>
  );
};

// ─── Mini Sparkline ────────────────────────────────────────────────────────
const MiniSparkline = ({ color = '#0d6e57', trend = 'up' }) => {
  const points = trend === 'up'
    ? '0,20 10,18 20,15 30,16 40,12 50,8 60,10 70,5'
    : '0,5 10,8 20,12 30,10 40,15 50,18 60,16 70,20';

  return (
    <svg width="80" height="28" viewBox="0 0 80 28">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ─── Main Dashboard Component ───────────────────────────────────────────────
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      // Fake data matching the screenshot
      const fakeData = {
        keyMetrics: {
          totalCustomers: 8245,
          newRegistrations: 312,
          activeSegments: 15,
          totalRevenue: 1450000000
        },
        monthlySegmentation: [
          { month: 'Jan', pregnancy: 5, newborn: 2, infant: 3, toddler: 7, preschool: 0 },
          { month: 'Feb', pregnancy: 4, newborn: 3, infant: 4, toddler: 8, preschool: 0 },
          { month: 'Mar', pregnancy: 6, newborn: 4, infant: 3, toddler: 6, preschool: 0 },
          { month: 'Apr', pregnancy: 7, newborn: 5, infant: 4, toddler: 5, preschool: 0 },
          { month: 'May', pregnancy: 8, newborn: 6, infant: 3, toddler: 4, preschool: 0 },
          { month: 'Jun', pregnancy: 9, newborn: 7, infant: 2, toddler: 3, preschool: 0 },
          { month: 'Jul', pregnancy: 7, newborn: 8, infant: 4, toddler: 2, preschool: 1 },
          { month: 'Sep', pregnancy: 5, newborn: 6, infant: 5, toddler: 3, preschool: 2 },
          { month: 'Oct', pregnancy: 4, newborn: 5, infant: 6, toddler: 4, preschool: 3 },
          { month: 'Nov', pregnancy: 3, newborn: 4, infant: 7, toddler: 5, preschool: 4 },
          { month: 'Dec', pregnancy: 2, newborn: 3, infant: 8, toddler: 6, preschool: 5 },
        ],
        recentAutomations: [
          { _id: '1', trigger: 'Pregnancy Week 32', childAgeStage: 'Thai kỳ Tuần 32', automationName: 'Gửi: Chuẩn bị đồ đi sinh', status: 'active' },
          { _id: '2', trigger: 'Child 6th Month Birth', childAgeStage: 'Bé Tháng 6', automationName: 'Gửi: Chào mừng ăn dặm', status: 'active' },
          { _id: '3', trigger: 'Child 12th Month Birth', childAgeStage: 'Bé Tháng 12', automationName: 'Gửi: Khuyến mãi phát triển cho bé tập đi', status: 'scheduled' },
          { _id: '4', trigger: 'Child 18th Month Birth', childAgeStage: 'Bé Tháng 18', automationName: 'Gửi: Giảm giá sách hoạt động', status: 'scheduled' },
        ],
        customerList: [
          { _id: '1', parentName: 'Mai Nguyễn', childName: 'Minh Tú', dueDate: '2004-03-03', childAge: '7 tháng', segment: 'PREGNANCY', lastPurchase: '2006-03-03', lifecycleValue: 10000, phone: '0901234567' },
          { _id: '2', parentName: 'Nguyễn Phi', childName: 'Hà Nguyên', dueDate: '2004-02-15', childAge: '14 tháng', segment: 'NEWBORN', lastPurchase: '2006-02-15', lifecycleValue: 10000, phone: '0901234568' },
          { _id: '3', parentName: 'Trần Minh', childName: 'Hoàng Đức', dueDate: '2004-08-23', childAge: 'Thai kỳ (Tuần 34)', segment: 'INFANT', lastPurchase: '2006-08-23', lifecycleValue: 10000, phone: '0901234569' },
          { _id: '4', parentName: 'Thảo Lê', childName: 'Sam', dueDate: '2004-11-03', childAge: '7 tháng', segment: 'TODDLER', lastPurchase: '2006-11-03', lifecycleValue: 10000, phone: '0901234570' },
        ],
        alerts: [
          { type: 'warning', message: '15 tã Mẹ & Bé hết hàng\nGửi cảnh báo nhập hàng' },
          { type: 'info', message: 'Gợi ý: Liên hệ khách hàng Segment "Toddler" cho đồ chơi giáo dục' },
          { type: 'info', message: 'Phân tích: 23% bé 6m chưa nhận hướng dẫn ăn dặm' }
        ]
      };
      
      // Simulate API call delay
      setTimeout(() => {
        setDashboardData(fakeData);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      message.error('Không thể tải dữ liệu dashboard');
      setLoading(false);
    }
  };

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    if (!dashboardData?.customerList) return [];
    return dashboardData.customerList.filter(c => {
      const matchSearch =
        c.parentName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.childName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch);
      const matchSegment = segmentFilter === 'all' || c.segment === segmentFilter;
      return matchSearch && matchSegment;
    });
  }, [dashboardData, customerSearch, segmentFilter]);

  // ── Metric card styles ──────────────────────────────────────────────
  const metricCards = dashboardData ? [
    {
      title: 'Tổng hồ sơ khách hàng',
      value: dashboardData.keyMetrics.totalCustomers,
      icon: <TeamOutlined style={{ fontSize: 22 }} />,
      color: '#0d6e57',
      bg: '#ecfdf5',
      sparkColor: '#0d6e57',
      trend: 'up'
    },
    {
      title: 'Đăng ký mới (Tháng này)',
      value: dashboardData.keyMetrics.newRegistrations,
      icon: <UserAddOutlined style={{ fontSize: 22 }} />,
      color: '#3b82f6',
      bg: '#eff6ff',
      sparkColor: '#3b82f6',
      trend: 'up'
    },
    {
      title: 'Phân khúc vòng đời hoạt động',
      value: dashboardData.keyMetrics.activeSegments,
      icon: <ApartmentOutlined style={{ fontSize: 22 }} />,
      color: '#8b5cf6',
      bg: '#f5f3ff',
      sparkColor: '#8b5cf6',
      trend: 'up'
    },
    {
      title: 'Doanh thu vòng đời (MTD)',
      value: dashboardData.keyMetrics.totalRevenue,
      prefix: 'đ',
      icon: <DollarOutlined style={{ fontSize: 22 }} />,
      color: '#f59e0b',
      bg: '#fffbeb',
      sparkColor: '#f59e0b',
      trend: 'up',
      isRevenue: true
    }
  ] : [];

  // ── Automations table columns ───────────────────────────────────────
  const automationColumns = [
    {
      title: 'Kích hoạt',
      dataIndex: 'trigger',
      key: 'trigger',
      width: 120,
      render: (text) => <Text style={{ fontWeight: 500 }}>{text}</Text>
    },
    {
      title: 'Tên tự động hóa',
      dataIndex: 'automationName',
      key: 'automationName',
      render: (text) => (
        <Text style={{ fontWeight: 500, color: '#111827' }}>
          {text}
        </Text>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        if (status === 'active') return <Tag color="success">Hoạt động</Tag>;
        if (status === 'scheduled') return <Tag color="blue">Đã lên lịch</Tag>;
        return <Tag>{status}</Tag>;
      }
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: () => (
        <Button type="text" icon={<MoreOutlined />} style={{ color: '#9ca3af' }} />
      )
    }
  ];

  // ── Customer table columns ──────────────────────────────────────────
  const customerColumns = [
    {
      title: 'Tên phụ huynh',
      dataIndex: 'parentName',
      key: 'parentName',
      width: 150,
      render: (text) => (
        <Text style={{ fontWeight: 500 }}>{text}</Text>
      ),
    },
    {
      title: 'Tên bé',
      dataIndex: 'childName',
      key: 'childName',
      width: 120,
      render: (text) => text || <Text type="secondary">—</Text>
    },
    {
      title: 'Ngày dự sinh / Sinh',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 140,
      render: (date) => date ? new Date(date).toLocaleDateString('vi-VN') : <Text type="secondary">—</Text>
    },
    {
      title: 'Tuổi bé (Hiện tại)',
      dataIndex: 'childAge',
      key: 'childAge',
      width: 160,
    },
    {
      title: 'Phân khúc hiện tại',
      dataIndex: 'segment',
      key: 'segment',
      width: 150,
      render: (seg) => {
        const conf = SEGMENT_CONFIG[seg] || SEGMENT_CONFIG.UNKNOWN;
        return <Tag color={conf.tag} style={{ fontWeight: 500 }}>{conf.label}</Tag>;
      }
    },
    {
      title: 'Mua gần nhất',
      dataIndex: 'lastPurchase',
      key: 'lastPurchase',
      width: 130,
      render: (date) => date ? new Date(date).toLocaleDateString('vi-VN') : <Text type="secondary">—</Text>
    },
    {
      title: 'Giá trị vòng đời (LCV)',
      dataIndex: 'lifecycleValue',
      key: 'lifecycleValue',
      width: 160,
      render: (val) => (
        <Text style={{ fontWeight: 600, color: '#111827' }}>
          đ{(val || 0).toLocaleString('vi-VN')} VNĐ
        </Text>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: () => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button type="text" size="small" icon={<EditOutlined />} />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Space>
      )
    }
  ];

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Spin size="large" tip="Đang tải dữ liệu..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard - Tổng Quan Vòng Đời">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Page Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0, color: '#111827', fontWeight: 700 }}>
            Dashboard - Tổng Quan Vòng Đời
          </Title>
          <Button
            icon={<SyncOutlined />}
            onClick={fetchDashboard}
            style={{ borderRadius: 8 }}
          >
            Làm mới
          </Button>
        </div>

        {/* ──── Main Content Layout ──── */}
        <Row gutter={24}>
          {/* ──── Left Column (Metrics, Chart, Table) ──── */}
          <Col xs={24} lg={18} xl={19}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Key Metrics */}
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 14, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Chỉ Số Chính
                  </Text>
                </div>
                <Row gutter={16}>
                  {metricCards.map((card, idx) => (
                    <Col xs={12} sm={12} md={6} key={idx}>
                      <Card
                        bordered={false}
                        style={{
                          borderRadius: 12,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          height: '100%',
                          border: '1px solid #f0f0f0'
                        }}
                        bodyStyle={{ padding: '18px 16px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8, lineHeight: 1.3 }}>
                              {card.title}
                            </Text>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                              {card.isRevenue
                                ? `đ${(card.value || 0).toLocaleString('vi-VN')}`
                                : (card.value || 0).toLocaleString('vi-VN')
                              }
                            </div>
                          </div>
                          <MiniSparkline color={card.sparkColor} trend={card.trend} />
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>

              {/* Chart & Automations */}
              <Row gutter={16}>
                {/* Chart */}
                <Col xs={24} lg={12}>
                  <Card
                    bordered={false}
                    style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', height: '100%', border: '1px solid #f0f0f0' }}
                    bodyStyle={{ padding: '16px 20px' }}
                  >
                    <div style={{ marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 16, color: '#0d6e57' }}>
                        Phân Khúc Vòng Đời Trẻ Em
                      </Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                      Số lượng trẻ theo độ tuổi & phân khúc
                    </Text>
                    <BarChart data={dashboardData?.monthlySegmentation || []} />
                  </Card>
                </Col>

                {/* Recent Automations */}
                <Col xs={24} lg={12}>
                  <Card
                    bordered={false}
                    style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', height: '100%', border: '1px solid #f0f0f0' }}
                    bodyStyle={{ padding: '16px 20px' }}
                  >
                    <div style={{ marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 16, color: '#0d6e57' }}>
                        Tự Động Hóa Gần Đây & Sắp Tới
                      </Text>
                    </div>
                    <Table
                      columns={automationColumns}
                      dataSource={(dashboardData?.recentAutomations || []).map((item, idx) => ({ ...item, key: item._id || idx }))}
                      pagination={false}
                      size="small"
                      style={{ marginTop: 8 }}
                      locale={{ emptyText: 'Chưa có chiến dịch nào' }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Customer List */}
              <Card
                bordered={false}
                style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}
                bodyStyle={{ padding: '20px 24px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <Text strong style={{ fontSize: 16, color: '#111827', display: 'block' }}>
                      Danh Sách Khách Hàng Với Thông Tin Vòng Đời
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Hồ sơ khách hàng hàng đầu & vòng đời con trẻ
                    </Text>
                  </div>
                  <Space>
                    <Input
                      placeholder="Tìm kiếm khách hàng..."
                      prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      style={{ width: 220, borderRadius: 8 }}
                      allowClear
                    />
                    <Select
                      value={segmentFilter}
                      onChange={setSegmentFilter}
                      style={{ width: 170 }}
                      options={[
                        { value: 'all', label: 'Lọc theo phân khúc' },
                        { value: 'PREGNANCY', label: '🤰 Mang thai' },
                        { value: 'NEWBORN', label: '👶 Sơ sinh' },
                        { value: 'INFANT', label: '🍼 Nhũ nhi' },
                        { value: 'TODDLER', label: '🧒 Tập đi' },
                        { value: 'PRESCHOOL', label: '🎒 Mẫu giáo' },
                      ]}
                    />
                  </Space>
                </div>

                <Table
                  columns={customerColumns}
                  dataSource={filteredCustomers.map((c) => ({ ...c, key: c._id }))}
                  pagination={{
                    pageSize: 5,
                    showSizeChanger: false,
                    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
                    style: { marginTop: 12 }
                  }}
                  size="middle"
                  scroll={{ x: 1000 }}
                  locale={{ emptyText: 'Chưa có dữ liệu khách hàng' }}
                />
              </Card>
            </div>
          </Col>

          {/* ──── Right Column (Alerts) ──── */}
          <Col xs={24} lg={6} xl={5}>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 14, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Cảnh Báo & Cơ Hội
              </Text>
            </div>
            <Card
              bordered={false}
              style={{
                borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: '1px solid #f0f0f0',
                height: 'calc(100% - 28px)'
              }}
              bodyStyle={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {dashboardData?.alerts?.length > 0 ? dashboardData.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    borderLeft: `4px solid ${alert.type === 'warning' ? '#f59e0b' : alert.type === 'info' ? '#3b82f6' : '#10b981'}`,
                    background: alert.type === 'warning' ? '#fffbeb' : alert.type === 'info' ? '#eff6ff' : '#ecfdf5',
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: '#374151',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {alert.message}
                </div>
              )) : (
                <>
                  <div style={{
                    padding: '12px 14px', borderRadius: 8, borderLeft: '4px solid #f59e0b',
                    background: '#fffbeb', fontSize: 13, lineHeight: 1.5, color: '#374151', whiteSpace: 'pre-line'
                  }}>
                    {'15 tã Mẹ & Bé hết hàng\nGửi cảnh báo nhập hàng'}
                  </div>
                  <div style={{
                    padding: '12px 14px', borderRadius: 8, borderLeft: '4px solid #3b82f6',
                    background: '#eff6ff', fontSize: 13, lineHeight: 1.5, color: '#374151'
                  }}>
                    Gợi ý: Liên hệ khách hàng Segment &ldquo;Toddler&rdquo; cho đồ chơi giáo dục
                  </div>
                  <div style={{
                    padding: '12px 14px', borderRadius: 8, borderLeft: '4px solid #10b981',
                    background: '#ecfdf5', fontSize: 13, lineHeight: 1.5, color: '#374151'
                  }}>
                    Phân tích: 23% bé 6 tháng chưa nhận hướng dẫn ăn dặm
                  </div>
                </>
              )}
            </Card>
          </Col>
        </Row>

      </div>
    </DashboardLayout>
  );
}
