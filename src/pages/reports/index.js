import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
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
  App,
  Tabs,
  Input,
  Select,
  Badge,
  Divider,
  Alert
} from 'antd';
import {
  DollarOutlined,
  ShoppingOutlined,
  RiseOutlined,
  FallOutlined,
  DownloadOutlined,
  InboxOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileExcelOutlined,
  CalendarOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  PieChartOutlined,
  UserOutlined,
  ArrowUpOutlined,
  SwapOutlined,
  BarcodeOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import DashboardLayout from '../../layouts/DashboardLayout';
import handleAPI from '../../apis/handleAPI';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/hasPermission';
import { useRouter } from 'next/router';
import axios from 'axios';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Định dạng tiền tệ
const formatMoney = (val) => Number(val || 0).toLocaleString('vi-VN') + ' đ';

export default function ReportsPage() {
  const { message: messageApi } = App.useApp();
  const { user, token } = useSelector((state) => state.auth);
  const router = useRouter();

  // Active Tab: 'sales' | 'inventory' | 'expiry' | 'stock-movement' | 'campaigns'
  const [activeTab, setActiveTab] = useState('sales');

  // Khoảng thời gian lọc toàn cục (Mặc định: Tháng này)
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ]);
  const [activePreset, setActivePreset] = useState('thisMonth');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // 1. Data States: Sales & Profit
  const [salesData, setSalesData] = useState(null);

  // 2. Data States: Inventory & Valuation
  const [inventoryData, setInventoryData] = useState(null);

  // 3. Data States: Expiry & Losses
  const [expiryData, setExpiryData] = useState(null);

  // 4. Data States: Stock Movement (XNT)
  const [movementData, setMovementData] = useState(null);
  const [xntSearch, setXntSearch] = useState('');
  const [xntCategoryFilter, setXntCategoryFilter] = useState('ALL');

  // 5. Data States: ZNS Campaigns
  const [campaignData, setCampaignData] = useState({
    campaigns: [],
    overallStats: { success: 0, failed: 0, skipped: 0 },
    dailyStats: []
  });
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignLogs, setCampaignLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch logic theo active tab
  const fetchData = async (tab = activeTab, dates = dateRange) => {
    setLoading(true);
    const startStr = dates?.[0] ? dates[0].toISOString() : '';
    const endStr = dates?.[1] ? dates[1].toISOString() : '';

    try {
      if (tab === 'sales') {
        const res = await handleAPI(`/api/reports/sales?startDate=${startStr}&endDate=${endStr}`, null, 'get');
        if (res) setSalesData(res);
      } else if (tab === 'inventory') {
        const res = await handleAPI(`/api/reports/inventory?startDate=${startStr}&endDate=${endStr}`, null, 'get');
        if (res) setInventoryData(res);
      } else if (tab === 'expiry') {
        const res = await handleAPI(`/api/reports/expiry-loss?startDate=${startStr}&endDate=${endStr}`, null, 'get');
        if (res) setExpiryData(res);
      } else if (tab === 'stock-movement') {
        const res = await handleAPI(`/api/reports/stock-movement?startDate=${startStr}&endDate=${endStr}`, null, 'get');
        if (res) setMovementData(res);
      } else if (tab === 'campaigns') {
        const res = await handleAPI(`/api/reports/campaigns?startDate=${startStr}&endDate=${endStr}`, null, 'get');
        if (res) {
          setCampaignData({
            campaigns: res.campaigns || [],
            overallStats: res.overallStats || { success: 0, failed: 0, skipped: 0 },
            dailyStats: res.dailyStats || []
          });
        }
      }
    } catch (error) {
      console.error('Lỗi tải báo cáo:', error);
      messageApi.error('Không thể tải dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission(user, 'dashboard_view')) {
      fetchData(activeTab, dateRange);
    }
  }, [activeTab, dateRange, user]);

  // Bộ lọc ngày nhanh (Presets)
  const handleQuickPreset = (preset) => {
    setActivePreset(preset);
    let start, end;
    const now = dayjs();
    switch (preset) {
      case 'today':
        start = now.startOf('day');
        end = now.endOf('day');
        break;
      case '7days':
        start = now.subtract(6, 'day').startOf('day');
        end = now.endOf('day');
        break;
      case '30days':
        start = now.subtract(29, 'day').startOf('day');
        end = now.endOf('day');
        break;
      case 'thisMonth':
        start = now.startOf('month');
        end = now.endOf('month');
        break;
      case 'lastMonth':
        start = now.subtract(1, 'month').startOf('month');
        end = now.subtract(1, 'month').endOf('month');
        break;
      default:
        start = now.startOf('month');
        end = now.endOf('month');
    }
    setDateRange([start, end]);
  };

  // Xuất file Excel cho Tab hiện tại
  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      const startStr = dateRange?.[0] ? dateRange[0].toISOString() : '';
      const endStr = dateRange?.[1] ? dateRange[1].toISOString() : '';
      const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

      const typeMap = {
        sales: 'sales',
        inventory: 'inventory',
        expiry: 'expiry',
        'stock-movement': 'stock-movement',
        campaigns: 'sales'
      };

      const exportType = typeMap[activeTab] || 'sales';
      const url = `${baseURL}/api/reports/export-excel?type=${exportType}&startDate=${startStr}&endDate=${endStr}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Bao_Cao_${exportType}_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      messageApi.success('Đã xuất file Excel thành công!');
    } catch (error) {
      console.error('Lỗi khi xuất Excel:', error);
      messageApi.error('Không thể xuất file Excel. Vui lòng thử lại.');
    } finally {
      setExportLoading(false);
    }
  };

  // Drawer chi tiết Campaign Logs
  const openDetail = async (campaign) => {
    setSelectedCampaign(campaign);
    setDrawerVisible(true);
    setLogsLoading(true);
    try {
      const startStr = dateRange?.[0] ? dateRange[0].toISOString() : '';
      const endStr = dateRange?.[1] ? dateRange[1].toISOString() : '';
      const res = await handleAPI(`/api/reports/campaigns/${campaign._id}/logs?startDate=${startStr}&endDate=${endStr}`, null, 'get');
      if (res) setCampaignLogs(res);
    } catch (error) {
      messageApi.error('Lỗi khi tải chi tiết nhật ký');
    } finally {
      setLogsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // SVG CHART COMPONENT: Doanh thu & Lợi nhuận
  // ═══════════════════════════════════════════════════
  const SalesTimelineChart = ({ data }) => {
    if (!data || data.length === 0) {
      return (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text type="secondary">Chưa có giao dịch nào trong khoảng thời gian này</Text>
        </div>
      );
    }

    const chartWidth = 650;
    const chartHeight = 180;
    const maxVal = Math.max(...data.map(d => Math.max(d.revenue || 0, d.profit || 0)), 100000) * 1.15;
    const gap = 16;
    const groupWidth = Math.min(36, (chartWidth - 60) / data.length);
    const barWidth = groupWidth / 2 - 2;

    return (
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 20, marginBottom: 12, paddingLeft: 45 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#0d6e57' }} />
            <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Doanh thu</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#10b981' }} />
            <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Lợi nhuận gộp</span>
          </div>
        </div>

        <svg width="100%" viewBox={`0 0 ${chartWidth + 60} ${chartHeight + 50}`} style={{ overflow: 'visible' }}>
          {[0, 0.33, 0.66, 1].map((ratio, i) => {
            const y = chartHeight - ratio * chartHeight;
            const val = Math.round(ratio * maxVal);
            const label = val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val;
            return (
              <g key={i}>
                <text x="40" y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="11">{label}</text>
                <line x1="48" y1={y} x2={chartWidth + 48} y2={y} stroke="#f3f4f6" strokeWidth="1" />
              </g>
            );
          })}

          {data.map((d, idx) => {
            const x = 50 + idx * groupWidth + 4;
            const revHeight = Math.max(2, (d.revenue / maxVal) * chartHeight);
            const profitHeight = Math.max(2, (d.profit / maxVal) * chartHeight);
            const revY = chartHeight - revHeight;
            const profitY = chartHeight - profitHeight;

            return (
              <g key={idx}>
                {/* Revenue bar */}
                <rect
                  x={x}
                  y={revY}
                  width={barWidth}
                  height={revHeight}
                  fill="#0d6e57"
                  rx="3"
                >
                  <title>{`${d.date} - Doanh thu: ${formatMoney(d.revenue)}`}</title>
                </rect>

                {/* Profit bar */}
                <rect
                  x={x + barWidth + 2}
                  y={profitY}
                  width={barWidth}
                  height={profitHeight}
                  fill="#10b981"
                  rx="3"
                >
                  <title>{`${d.date} - Lợi nhuận: ${formatMoney(d.profit)}`}</title>
                </rect>

                {/* Date label */}
                <text
                  x={x + barWidth}
                  y={chartHeight + 18}
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize="10"
                >
                  {d.date}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════
  // TAB 1: DOANH THU & LỢI NHUẬN (SALES & PROFIT)
  // ═══════════════════════════════════════════════════
  const renderSalesTab = () => {
    const summary = salesData?.summary || {
      totalOrders: 0,
      totalRevenue: 0,
      totalSubtotal: 0,
      totalDiscount: 0,
      totalCogs: 0,
      grossProfit: 0,
      profitMargin: 0,
      avgOrderValue: 0,
      totalItemsSold: 0
    };

    const topProductColumns = [
      {
        title: 'Hạng',
        key: 'rank',
        width: 70,
        render: (_, __, index) => {
          if (index === 0) return <Tag color="gold" style={{ fontWeight: 700 }}>#1</Tag>;
          if (index === 1) return <Tag color="cyan" style={{ fontWeight: 700 }}>#2</Tag>;
          if (index === 2) return <Tag color="blue" style={{ fontWeight: 700 }}>#3</Tag>;
          return <Text type="secondary">#{index + 1}</Text>;
        }
      },
      {
        title: 'Sản phẩm',
        key: 'product',
        render: (_, record) => (
          <div>
            <div style={{ fontWeight: 600, color: '#111827' }}>{record.product_name}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>SKU: {record.product_sku || 'N/A'} | ĐVT: {record.unit}</div>
          </div>
        )
      },
      {
        title: 'Đã bán',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 90,
        align: 'right',
        render: (val) => <Text strong>{val}</Text>
      },
      {
        title: 'Doanh thu',
        dataIndex: 'revenue',
        key: 'revenue',
        align: 'right',
        render: (val) => <span style={{ fontWeight: 600, color: '#0d6e57' }}>{formatMoney(val)}</span>
      },
      {
        title: 'Lợi nhuận',
        dataIndex: 'profit',
        key: 'profit',
        align: 'right',
        render: (val) => <span style={{ fontWeight: 600, color: val >= 0 ? '#10b981' : '#ef4444' }}>{formatMoney(val)}</span>
      }
    ];

    const cashierColumns = [
      {
        title: 'Thu ngân',
        dataIndex: 'cashier_name',
        key: 'cashier_name',
        render: (val) => <Text strong>{val}</Text>
      },
      {
        title: 'Số đơn',
        dataIndex: 'ordersCount',
        key: 'ordersCount',
        align: 'right'
      },
      {
        title: 'Tổng doanh thu',
        dataIndex: 'totalSales',
        key: 'totalSales',
        align: 'right',
        render: (val) => <span style={{ fontWeight: 600, color: '#0d6e57' }}>{formatMoney(val)}</span>
      }
    ];

    const recentOrderColumns = [
      {
        title: 'Mã HĐ',
        dataIndex: 'order_code',
        key: 'order_code',
        render: (val) => <Tag color="blue">{val}</Tag>
      },
      {
        title: 'Khách hàng',
        key: 'customer',
        render: (_, record) => (
          <div>
            <div>{record.customer_name || 'Khách lẻ'}</div>
            {record.customer_phone && <div style={{ fontSize: 12, color: '#9ca3af' }}>{record.customer_phone}</div>}
          </div>
        )
      },
      {
        title: 'Phương thức',
        dataIndex: 'payment_method',
        key: 'payment_method',
        render: (pm) => {
          if (pm === 'CASH') return <Tag color="green">Tiền mặt</Tag>;
          if (pm === 'TRANSFER') return <Tag color="blue">Chuyển khoản</Tag>;
          if (pm === 'CARD') return <Tag color="purple">Thẻ</Tag>;
          return <Tag>Khác</Tag>;
        }
      },
      {
        title: 'Thời gian',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm')
      },
      {
        title: 'Thực thu',
        dataIndex: 'final_amount',
        key: 'final_amount',
        align: 'right',
        render: (val) => <span style={{ fontWeight: 600, color: '#0d6e57' }}>{formatMoney(val)}</span>
      }
    ];

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Metric Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: 12, background: 'linear-gradient(135deg, #0d6e57 0%, #10b981 100%)', color: '#fff' }}>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 4 }}>TỔNG DOANH THU</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>{formatMoney(summary.totalRevenue)}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                Chiết khấu đã trừ: {formatMoney(summary.totalDiscount)}
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>GIÁ VỐN HÀNG BÁN (COGS)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1f2937' }}>{formatMoney(summary.totalCogs)}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                Tổng SP bán: <Text strong>{summary.totalItemsSold}</Text> mặt hàng
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>LỢI NHUẬN GỘP</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: summary.grossProfit >= 0 ? '#10b981' : '#ef4444' }}>
                {formatMoney(summary.grossProfit)}
              </div>
              <div style={{ marginTop: 8 }}>
                <Tag color={summary.profitMargin >= 30 ? 'success' : 'warning'}>
                  Tỷ suất LN: {summary.profitMargin}%
                </Tag>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>ĐƠN HOÀN TẤT & GIÁ TRỊ TB</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{summary.totalOrders} đơn</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                AOV (Giá trị TB): <Text strong>{formatMoney(summary.avgOrderValue)}</Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Charts & Payment Breakdown */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              bordered={false}
              style={{ borderRadius: 12, border: '1px solid #e5e7eb', height: '100%' }}
              title={<span style={{ fontWeight: 600 }}>Biến Động Doanh Thu & Lợi Nhuận Theo Ngày</span>}
            >
              <SalesTimelineChart data={salesData?.timeline || []} />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              bordered={false}
              style={{ borderRadius: 12, border: '1px solid #e5e7eb', height: '100%' }}
              title={<span style={{ fontWeight: 600 }}>Phương Thức Thanh Toán</span>}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {(salesData?.paymentMethods || []).map((pm) => {
                  const labelMap = { CASH: 'Tiền mặt', TRANSFER: 'Chuyển khoản', CARD: 'Thẻ', OTHER: 'Khác' };
                  const colorMap = { CASH: '#10b981', TRANSFER: '#3b82f6', CARD: '#8b5cf6', OTHER: '#6b7280' };
                  return (
                    <div key={pm.method} style={{ padding: '8px 0', borderBottom: '1px dashed #f3f4f6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 500, color: '#374151' }}>{labelMap[pm.method] || pm.method}</span>
                        <span style={{ fontWeight: 600 }}>{formatMoney(pm.amount)} ({pm.percentage}%)</span>
                      </div>
                      <Progress percent={pm.percentage} strokeColor={colorMap[pm.method] || '#10b981'} size="small" showInfo={false} />
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{pm.count} giao dịch</div>
                    </div>
                  );
                })}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Top Selling & Cashier */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              bordered={false}
              style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
              title={<span style={{ fontWeight: 600 }}>Top 10 Sản Phẩm Bán Chạy Nhất</span>}
            >
              <Table
                dataSource={salesData?.topProducts || []}
                columns={topProductColumns}
                rowKey={(r) => r.product_id || r.product_name}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              bordered={false}
              style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
              title={<span style={{ fontWeight: 600 }}>Doanh Số Theo Thu Ngân</span>}
            >
              <Table
                dataSource={salesData?.cashierStats || []}
                columns={cashierColumns}
                rowKey="cashier_name"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>

        {/* Recent Completed Orders */}
        <Card
          bordered={false}
          style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
          title={<span style={{ fontWeight: 600 }}>Hóa Đơn Bán Lẻ Gần Đây</span>}
        >
          <Table
            dataSource={salesData?.recentOrders || []}
            columns={recentOrderColumns}
            rowKey="_id"
            pagination={{ pageSize: 8 }}
            size="small"
          />
        </Card>
      </Space>
    );
  };

  // ═══════════════════════════════════════════════════
  // TAB 2: TỒN KHO & GIÁ TRỊ KHO (INVENTORY & VALUATION)
  // ═══════════════════════════════════════════════════
  const renderInventoryTab = () => {
    const summary = inventoryData?.summary || {
      totalProducts: 0,
      activeCount: 0,
      outOfStockCount: 0,
      lowStockCount: 0,
      totalStockUnits: 0,
      totalCostValue: 0,
      totalRetailValue: 0,
      potentialProfit: 0,
      potentialMargin: 0
    };

    const categoryColumns = [
      {
        title: 'Danh mục',
        dataIndex: 'category',
        key: 'category',
        render: (val) => <Text strong>{val}</Text>
      },
      {
        title: 'Số mặt hàng',
        dataIndex: 'productCount',
        key: 'productCount',
        align: 'right'
      },
      {
        title: 'Tổng tồn (ĐVT)',
        dataIndex: 'totalUnits',
        key: 'totalUnits',
        align: 'right',
        render: (val) => Number(val).toLocaleString('vi-VN')
      },
      {
        title: 'Giá trị vốn tồn',
        dataIndex: 'totalCostValue',
        key: 'totalCostValue',
        align: 'right',
        render: (val) => <span style={{ fontWeight: 600, color: '#0d6e57' }}>{formatMoney(val)}</span>
      },
      {
        title: 'Tỷ trọng %',
        dataIndex: 'percentage',
        key: 'percentage',
        width: 140,
        render: (val) => (
          <Space size={8}>
            <Progress percent={val} size="small" showInfo={false} style={{ width: 75 }} />
            <Text style={{ fontSize: 12, minWidth: 42 }}>{val}%</Text>
          </Space>
        )
      }
    ];

    const topStockColumns = [
      {
        title: 'Sản phẩm',
        key: 'name',
        render: (_, record) => (
          <div>
            <div style={{ fontWeight: 600 }}>{record.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>SKU: {record.sku || 'N/A'} | {record.category}</div>
          </div>
        )
      },
      {
        title: 'Số lượng tồn',
        dataIndex: 'total_stock',
        key: 'total_stock',
        align: 'right',
        render: (val, record) => <Tag color="blue">{val} {record.unit}</Tag>
      },
      {
        title: 'Giá vốn',
        dataIndex: 'cost_price',
        key: 'cost_price',
        align: 'right',
        render: (val) => formatMoney(val)
      },
      {
        title: 'Tổng giá trị vốn',
        dataIndex: 'cost_value',
        key: 'cost_value',
        align: 'right',
        render: (val) => <span style={{ fontWeight: 600, color: '#0d6e57' }}>{formatMoney(val)}</span>
      }
    ];

    const lowStockColumns = [
      {
        title: 'Sản phẩm',
        key: 'name',
        render: (_, record) => (
          <div>
            <div style={{ fontWeight: 600 }}>{record.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>SKU: {record.sku || 'N/A'}</div>
          </div>
        )
      },
      {
        title: 'Tồn hiện tại',
        dataIndex: 'total_stock',
        key: 'total_stock',
        align: 'right',
        render: (val, record) => (
          <Tag color={val === 0 ? 'error' : 'warning'}>
            {val === 0 ? 'Hết hàng' : `Còn ${val} ${record.unit}`}
          </Tag>
        )
      },
      {
        title: 'Thao tác',
        key: 'action',
        align: 'center',
        render: () => (
          <Button size="small" type="primary" onClick={() => router.push('/purchase-orders')}>
            Nhập hàng
          </Button>
        )
      }
    ];

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Status indicator: Historic stock vs Realtime stock */}
        {summary.isPast ? (
          <Alert
            type="info"
            showIcon
            message={
              <span>
                Số liệu tồn kho và giá trị vốn đang được <b>tính lùi đến hết ngày {dayjs(summary.asOfDate).format('DD/MM/YYYY')}</b> (dựa trên sổ biến động kho XNT).
              </span>
            }
            style={{ borderRadius: 8 }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge status="processing" color="#10b981" />
            <Text type="secondary" style={{ fontSize: 13 }}>
              Số liệu tồn kho thực tế <b>thời gian thực (Real-time)</b>
            </Text>
          </div>
        )}

        {/* Metric Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>VỐN LƯU ĐỘNG TỒN KHO</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0d6e57' }}>{formatMoney(summary.totalCostValue)}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                Tổng số lượng: <Text strong>{Number(summary.totalStockUnits).toLocaleString('vi-VN')}</Text> đơn vị
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>GIÁ TRỊ BÁN DỰ KIẾN</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{formatMoney(summary.totalRetailValue)}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                Doanh thu tiềm năng khi bán hết kho
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>LỢI NHUẬN TIỀM NĂNG</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{formatMoney(summary.potentialProfit)}</div>
              <div style={{ marginTop: 8 }}>
                <Tag color="success">Margin dự kiến: {summary.potentialMargin}%</Tag>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>TÌNH TRẠNG SẢN PHẨM</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1f2937' }}>{summary.totalProducts} mặt hàng</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <Tag color="error">Hết: {summary.outOfStockCount}</Tag>
                <Tag color="warning">Sắp hết: {summary.lowStockCount}</Tag>
                <Tag color="success">Đang bán: {summary.activeCount}</Tag>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Categories breakdown & Top stock */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card
              bordered={false}
              style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
              title={<span style={{ fontWeight: 600 }}>Cơ Cấu Giá Trị Tồn Kho Theo Danh Mục</span>}
            >
              <Table
                dataSource={inventoryData?.categories || []}
                columns={categoryColumns}
                rowKey="category"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card
              bordered={false}
              style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
              title={<span style={{ fontWeight: 600, color: '#ef4444' }}>Cảnh Báo Sắp Hết Hàng (Tồn ≤ 5)</span>}
            >
              <Table
                dataSource={inventoryData?.lowStockAlerts || []}
                columns={lowStockColumns}
                rowKey="_id"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>

        {/* Top 10 Stock Products */}
        <Card
          bordered={false}
          style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
          title={<span style={{ fontWeight: 600 }}>Top 10 Sản Phẩm Tồn Kho Nhiều Nhất (Chiếm Vốn Lớn)</span>}
        >
          <Table
            dataSource={inventoryData?.topStockProducts || []}
            columns={topStockColumns}
            rowKey="_id"
            pagination={false}
            size="small"
          />
        </Card>
      </Space>
    );
  };

  // ═══════════════════════════════════════════════════
  // TAB 3: HẠN SỬ DỤNG & THIỆT HẠI HỦY HÀNG (EXPIRY & LOSS)
  // ═══════════════════════════════════════════════════
  const renderExpiryTab = () => {
    const summary = expiryData?.summary || {
      totalRiskValue: 0,
      totalRiskUnits: 0,
      totalRiskBatches: 0,
      totalDiscardUnits: 0,
      totalDiscardValue: 0,
      discardOperationsCount: 0
    };

    const breakdown = expiryData?.breakdown || {
      expired: { count: 0, units: 0, riskValue: 0 },
      near_30: { count: 0, units: 0, riskValue: 0 },
      near_60: { count: 0, units: 0, riskValue: 0 },
      near_90: { count: 0, units: 0, riskValue: 0 },
      safe: { count: 0, units: 0, riskValue: 0 }
    };

    const criticalBatchColumns = [
      {
        title: 'Sản phẩm',
        dataIndex: 'product_name',
        key: 'product_name',
        render: (text) => <Text strong>{text}</Text>
      },
      {
        title: 'Mã lô',
        dataIndex: 'batch_number',
        key: 'batch_number',
        render: (text) => <Tag>{text}</Tag>
      },
      {
        title: 'Hạn sử dụng',
        dataIndex: 'expiry_date',
        key: 'expiry_date',
        render: (val) => dayjs(val).format('DD/MM/YYYY')
      },
      {
        title: 'Số ngày còn lại',
        dataIndex: 'days_left',
        key: 'days_left',
        render: (days) => {
          if (days <= 0) return <Tag color="error" style={{ fontWeight: 700 }}>Đã quá hạn</Tag>;
          if (days <= 30) return <Tag color="volcano" style={{ fontWeight: 700 }}>Còn {days} ngày</Tag>;
          if (days <= 60) return <Tag color="orange">Còn {days} ngày</Tag>;
          return <Tag color="gold">Còn {days} ngày</Tag>;
        }
      },
      {
        title: 'Tồn kho',
        dataIndex: 'quantity_in_stock',
        key: 'quantity_in_stock',
        align: 'right',
        render: (val, record) => `${val} ${record.unit}`
      },
      {
        title: 'Vốn rủi ro',
        dataIndex: 'risk_value',
        key: 'risk_value',
        align: 'right',
        render: (val) => <span style={{ fontWeight: 600, color: '#ef4444' }}>{formatMoney(val)}</span>
      },
      {
        title: 'Hành động đề xuất',
        key: 'action',
        align: 'center',
        render: () => (
          <Button
            size="small"
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={() => router.push('/marketing/create')}
          >
            Tạo ZNS xả hàng
          </Button>
        )
      }
    ];

    const disposalColumns = [
      {
        title: 'Thời gian',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm')
      },
      {
        title: 'Sản phẩm',
        key: 'product',
        render: (_, record) => record.product_id?.name || 'Sản phẩm'
      },
      {
        title: 'Lô hàng',
        dataIndex: 'batch_number',
        key: 'batch_number',
        render: (val) => val ? <Tag>{val}</Tag> : '—'
      },
      {
        title: 'Số lượng hủy',
        dataIndex: 'quantity',
        key: 'quantity',
        align: 'right',
        render: (val, record) => <Text type="danger" strong>{Math.abs(val)} {record.product_id?.unit || 'Cái'}</Text>
      },
      {
        title: 'Thiệt hại vốn',
        dataIndex: 'total_value',
        key: 'total_value',
        align: 'right',
        render: (val) => <span style={{ fontWeight: 600, color: '#ef4444' }}>{formatMoney(val)}</span>
      },
      {
        title: 'Lý do / Ghi chú',
        dataIndex: 'notes',
        key: 'notes',
        render: (text) => text || 'Hủy hàng hết hạn'
      },
      {
        title: 'Người thực hiện',
        key: 'user',
        render: (_, record) => record.created_by?.fullName || 'Hệ thống'
      }
    ];

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* KPI Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: 12, background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', color: '#fff' }}>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 4 }}>VỐN RỦI RO CẬN DATE & QUÁ HẠN</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{formatMoney(summary.totalRiskValue)}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                Tổng {summary.totalRiskUnits} sản phẩm / {summary.totalRiskBatches} lô hàng
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #fee2e2' }}>
              <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 4, fontWeight: 600 }}>ĐÃ QUÁ HẠN (HẾT DATE)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#b91c1c' }}>{formatMoney(breakdown.expired.riskValue)}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                {breakdown.expired.count} lô ({breakdown.expired.units} SP) — Cần tiêu hủy ngay!
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #ffedd5' }}>
              <div style={{ color: '#ea580c', fontSize: 13, marginBottom: 4, fontWeight: 600 }}>CẬN DATE KHẨN CẤP (≤ 30 NGÀY)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#c2410c' }}>{formatMoney(breakdown.near_30.riskValue)}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                {breakdown.near_30.count} lô ({breakdown.near_30.units} SP) — Ưu tiên xả hàng
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>THIỆT HẠI ĐÃ XUẤT HỦY TRONG KỲ</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#7f1d1d' }}>{formatMoney(summary.totalDiscardValue)}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                Đã hủy: <Text strong>{summary.totalDiscardUnits}</Text> SP ({summary.discardOperationsCount} đợt)
              </div>
            </Card>
          </Col>
        </Row>

        {/* Risk Breakdown Progress */}
        <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ marginBottom: 12, fontWeight: 600 }}>Cơ Cấu Mức Độ Rủi Ro Hạn Sử Dụng:</div>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <div style={{ padding: 12, borderRadius: 8, background: '#fef2f2', border: '1px solid #fee2e2' }}>
                <div style={{ color: '#ef4444', fontWeight: 600 }}>Đã Quá Hạn</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{breakdown.expired.count} lô</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{formatMoney(breakdown.expired.riskValue)}</div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div style={{ padding: 12, borderRadius: 8, background: '#fff7ed', border: '1px solid #ffedd5' }}>
                <div style={{ color: '#ea580c', fontWeight: 600 }}>Cận Date ≤ 30 Ngày</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{breakdown.near_30.count} lô</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{formatMoney(breakdown.near_30.riskValue)}</div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div style={{ padding: 12, borderRadius: 8, background: '#fefce8', border: '1px solid #fef9c3' }}>
                <div style={{ color: '#ca8a04', fontWeight: 600 }}>Cận Date 31 - 60 Ngày</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{breakdown.near_60.count} lô</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{formatMoney(breakdown.near_60.riskValue)}</div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div style={{ padding: 12, borderRadius: 8, background: '#f0fdf4', border: '1px solid #dcfce7' }}>
                <div style={{ color: '#16a34a', fontWeight: 600 }}>Cận Date 61 - 90 Ngày</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{breakdown.near_90.count} lô</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{formatMoney(breakdown.near_90.riskValue)}</div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Batches Expiring Within Selected Date Range */}
        <Card
          bordered={false}
          style={{ borderRadius: 12, border: '1px solid #fed7aa', background: '#fffaf5' }}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontWeight: 600, color: '#c2410c' }}>
                Lô Hàng Chạm Hạn Sử Dụng Trong Kỳ Lọc ({dateRange?.[0] ? dayjs(dateRange[0]).format('DD/MM') : ''} - {dateRange?.[1] ? dayjs(dateRange[1]).format('DD/MM/YYYY') : ''})
              </span>
              <Tag color="orange" style={{ fontWeight: 600 }}>
                {summary.periodExpiringCount || 0} Lô ({summary.periodExpiringUnits || 0} SP) — Vốn: {formatMoney(summary.periodExpiringRiskValue || 0)}
              </Tag>
            </div>
          }
        >
          <Table
            dataSource={expiryData?.periodExpiringBatches || []}
            columns={criticalBatchColumns}
            rowKey="_id"
            pagination={{ pageSize: 6 }}
            size="small"
            locale={{ emptyText: 'Không có lô hàng nào chạm hạn trong khoảng ngày đã chọn' }}
          />
        </Card>

        {/* Critical Batches Table */}
        <Card
          bordered={false}
          style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
          title={<span style={{ fontWeight: 600, color: '#c2410c' }}>Danh Sách Các Lô Hàng Cận Date Rủi Ro Cao Nhất (Cần Xả Gấp)</span>}
        >
          <Table
            dataSource={expiryData?.criticalBatches || []}
            columns={criticalBatchColumns}
            rowKey="_id"
            pagination={{ pageSize: 8 }}
            size="small"
          />
        </Card>

        {/* Disposals History */}
        <Card
          bordered={false}
          style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
          title={<span style={{ fontWeight: 600 }}>Lịch Sử Hủy Hàng Cận Date / Hỏng Hóc Trong Kỳ</span>}
        >
          <Table
            dataSource={expiryData?.recentDisposals || []}
            columns={disposalColumns}
            rowKey="_id"
            pagination={{ pageSize: 6 }}
            size="small"
          />
        </Card>
      </Space>
    );
  };

  // ═══════════════════════════════════════════════════
  // TAB 4: BÁO CÁO XUẤT - NHẬP - TỒN (STOCK MOVEMENTS / XNT)
  // ═══════════════════════════════════════════════════
  const renderStockMovementTab = () => {
    const summary = movementData?.summary || {
      totalProducts: 0,
      grandOpeningUnits: 0,
      grandInUnits: 0,
      grandOutUnits: 0,
      grandDiscardUnits: 0,
      grandClosingUnits: 0,
      grandClosingValue: 0
    };

    const allMovements = movementData?.movements || [];

    // Filter by search and category
    const filteredMovements = allMovements.filter((m) => {
      const matchSearch = !xntSearch || m.name?.toLowerCase().includes(xntSearch.toLowerCase()) || m.sku?.toLowerCase().includes(xntSearch.toLowerCase());
      const matchCat = xntCategoryFilter === 'ALL' || m.category === xntCategoryFilter;
      return matchSearch && matchCat;
    });

    const categoryList = Array.from(new Set(allMovements.map((m) => m.category).filter(Boolean)));

    const xntColumns = [
      {
        title: 'Mã SKU',
        dataIndex: 'sku',
        key: 'sku',
        width: 110,
        render: (val) => val ? <Tag>{val}</Tag> : '—'
      },
      {
        title: 'Sản phẩm',
        key: 'name',
        render: (_, record) => (
          <div>
            <div style={{ fontWeight: 600 }}>{record.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>ĐVT: {record.unit} | {record.category}</div>
          </div>
        )
      },
      {
        title: 'Tồn đầu kỳ',
        dataIndex: 'opening_stock',
        key: 'opening_stock',
        align: 'right',
        render: (val) => <Text strong>{val}</Text>
      },
      {
        title: 'Tổng nhập (+)',
        dataIndex: 'total_in',
        key: 'total_in',
        align: 'right',
        render: (val) => <span style={{ color: '#10b981', fontWeight: 600 }}>+{val}</span>
      },
      {
        title: 'Xuất bán (-)',
        dataIndex: 'total_out',
        key: 'total_out',
        align: 'right',
        render: (val) => <span style={{ color: '#3b82f6', fontWeight: 600 }}>-{val}</span>
      },
      {
        title: 'Điều chỉnh',
        dataIndex: 'total_adjustment',
        key: 'total_adjustment',
        align: 'right',
        render: (val) => (
          <span style={{ color: val > 0 ? '#10b981' : val < 0 ? '#ef4444' : '#6b7280' }}>
            {val > 0 ? `+${val}` : val}
          </span>
        )
      },
      {
        title: 'Xuất hủy (-)',
        dataIndex: 'total_discard',
        key: 'total_discard',
        align: 'right',
        render: (val) => val > 0 ? <span style={{ color: '#ef4444', fontWeight: 600 }}>-{val}</span> : '0'
      },
      {
        title: 'Tồn cuối kỳ',
        dataIndex: 'closing_stock',
        key: 'closing_stock',
        align: 'right',
        render: (val) => <Tag color={val <= 0 ? 'error' : val <= 5 ? 'warning' : 'blue'} style={{ fontWeight: 700 }}>{val}</Tag>
      },
      {
        title: 'Giá trị tồn cuối',
        dataIndex: 'closing_value',
        key: 'closing_value',
        align: 'right',
        render: (val) => <span style={{ fontWeight: 600, color: '#0d6e57' }}>{formatMoney(val)}</span>
      }
    ];

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* KPI Row */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} lg={4}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb', textAlign: 'center' }}>
              <div style={{ color: '#6b7280', fontSize: 12 }}>TỒN ĐẦU KỲ</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginTop: 4 }}>{summary.grandOpeningUnits}</div>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb', textAlign: 'center' }}>
              <div style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>TỔNG NHẬP</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981', marginTop: 4 }}>+{summary.grandInUnits}</div>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb', textAlign: 'center' }}>
              <div style={{ color: '#3b82f6', fontSize: 12, fontWeight: 600 }}>XUẤT BÁN (POS)</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6', marginTop: 4 }}>-{summary.grandOutUnits}</div>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb', textAlign: 'center' }}>
              <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>XUẤT HỦY</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>-{summary.grandDiscardUnits}</div>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb', textAlign: 'center' }}>
              <div style={{ color: '#0d6e57', fontSize: 12, fontWeight: 600 }}>TỒN CUỐI KỲ</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0d6e57', marginTop: 4 }}>{summary.grandClosingUnits}</div>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb', textAlign: 'center' }}>
              <div style={{ color: '#6b7280', fontSize: 12 }}>GIÁ TRỊ TỒN CUỐI</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0d6e57', marginTop: 4 }}>{formatMoney(summary.grandClosingValue)}</div>
            </Card>
          </Col>
        </Row>

        {/* Filter bar */}
        <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Tìm theo Tên sản phẩm, SKU..."
                prefix={<SearchOutlined />}
                allowClear
                value={xntSearch}
                onChange={(e) => setXntSearch(e.target.value)}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                style={{ width: '100%' }}
                value={xntCategoryFilter}
                onChange={setXntCategoryFilter}
                options={[
                  { label: 'Tất cả danh mục', value: 'ALL' },
                  ...categoryList.map((c) => ({ label: c, value: c }))
                ]}
              />
            </Col>
            <Col xs={24} md={10} style={{ textAlign: 'right' }}>
              <Text type="secondary">
                Hiển thị <Text strong>{filteredMovements.length}</Text> / {allMovements.length} mặt hàng
              </Text>
            </Col>
          </Row>
        </Card>

        {/* Movement Table */}
        <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <Table
            dataSource={filteredMovements}
            columns={xntColumns}
            rowKey="_id"
            pagination={{ pageSize: 12 }}
            size="small"
          />
        </Card>
      </Space>
    );
  };

  // ═══════════════════════════════════════════════════
  // TAB 5: BÁO CÁO CHIẾN DỊCH ZALO ZNS
  // ═══════════════════════════════════════════════════
  const renderCampaignTab = () => {
    const { campaigns, overallStats, dailyStats } = campaignData;
    const overallTotal = overallStats.success + overallStats.failed;
    const successPercent = overallTotal > 0 ? Math.round((overallStats.success / overallTotal) * 100) : 0;

    const campaignColumns = [
      {
        title: 'Tên chiến dịch',
        key: 'name',
        render: (_, record) => (
          <div>
            <div style={{ fontWeight: 600, color: '#111827' }}>{record.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Loại: <Tag color="blue">{record.type === 'LIFECYCLE' ? 'Vòng đời' : record.type === 'PRODUCT_REFILL' ? 'Nhắc mua lại' : 'Khuyến mãi'}</Tag>
            </div>
          </div>
        )
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        render: (status) => (
          <Tag color={status === 'active' ? 'success' : 'default'}>
            {status === 'active' ? 'Đang chạy' : 'Tạm dừng'}
          </Tag>
        )
      },
      {
        title: 'Thành công',
        dataIndex: 'successCount',
        key: 'successCount',
        align: 'right',
        render: (val) => <span style={{ color: '#10b981', fontWeight: 600 }}>{val}</span>
      },
      {
        title: 'Thất bại',
        dataIndex: 'failedCount',
        key: 'failedCount',
        align: 'right',
        render: (val) => <span style={{ color: '#ef4444', fontWeight: 600 }}>{val}</span>
      },
      {
        title: 'Tỷ lệ thành công',
        key: 'rate',
        width: 200,
        render: (_, record) => {
          const rate = record.totalCount > 0 ? Math.round((record.successCount / record.totalCount) * 100) : 0;
          return <Progress percent={rate} size="small" strokeColor="#10b981" trailColor="#fee2e2" />;
        }
      },
      {
        title: 'Thao tác',
        key: 'action',
        align: 'center',
        render: (_, record) => (
          <Button size="small" type="primary" onClick={() => openDetail(record)}>
            Xem chi tiết
          </Button>
        )
      }
    ];

    const logColumns = [
      {
        title: 'Khách hàng',
        key: 'customer',
        render: (_, record) => (
          <div>
            <div style={{ fontWeight: 500 }}>{record.customerId?.name || 'Khách vãng lai'}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{record.phoneSent}</div>
          </div>
        )
      },
      {
        title: 'Bé / Giai đoạn',
        key: 'baby',
        render: (_, record) => {
          if (!record.customerId) return <Text type="secondary">—</Text>;
          const { baby_name } = record.customerId;
          return (
            <div>
              {baby_name && <div>Bé: {baby_name}</div>}
              {record.stage === 'PREGNANCY' && <Tag color="warning">Thai kỳ</Tag>}
              {record.stage === 'BABY' && <Tag color="processing">Đã sinh</Tag>}
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
        title: 'Thời gian',
        dataIndex: 'sentAt',
        key: 'sentAt',
        render: (val) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '—'
      }
    ];

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* KPI cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>TỔNG TIN NHẮN ĐÃ GỬI</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1f2937' }}>{overallTotal} tin</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#10b981' }}>
                Thành công: {overallStats.success} tin
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>TỶ LỆ GỬI THÀNH CÔNG</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{successPercent}%</div>
              <div style={{ marginTop: 8 }}>
                <Progress percent={successPercent} strokeColor="#10b981" trailColor="#fee2e2" size="small" />
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #fee2e2' }}>
              <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 4, fontWeight: 600 }}>TIN NHẮN THẤT BẠI</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#b91c1c' }}>{overallStats.failed} tin</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                Đã bỏ qua: {overallStats.skipped} tin
              </div>
            </Card>
          </Col>
        </Row>

        {/* Campaign List */}
        <Card
          bordered={false}
          style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
          title={<span style={{ fontWeight: 600 }}>Hiệu Quả Từng Chiến Dịch Zalo ZNS</span>}
        >
          <Table
            dataSource={campaigns}
            columns={campaignColumns}
            rowKey="_id"
            pagination={{ pageSize: 8 }}
            size="small"
          />
        </Card>

        {/* Drawer for detail logs */}
        <Drawer
          title={`Chi Tiết Nhật Ký: ${selectedCampaign?.name || ''}`}
          placement="right"
          width={650}
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
        >
          <Table
            dataSource={campaignLogs}
            columns={logColumns}
            rowKey="_id"
            loading={logsLoading}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Drawer>
      </Space>
    );
  };

  // ═══════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════
  const tabItems = [
    {
      key: 'sales',
      label: (
        <span style={{ fontSize: 14, fontWeight: 500 }}>
          <DollarOutlined style={{ marginRight: 6 }} /> Doanh Thu & Lợi Nhuận
        </span>
      ),
      children: renderSalesTab()
    },
    {
      key: 'inventory',
      label: (
        <span style={{ fontSize: 14, fontWeight: 500 }}>
          <InboxOutlined style={{ marginRight: 6 }} /> Tồn Kho & Giá Trị Kho
        </span>
      ),
      children: renderInventoryTab()
    },
    {
      key: 'expiry',
      label: (
        <span style={{ fontSize: 14, fontWeight: 500 }}>
          <ClockCircleOutlined style={{ marginRight: 6 }} /> Hạn Dùng & Hủy Hàng
        </span>
      ),
      children: renderExpiryTab()
    },
    {
      key: 'stock-movement',
      label: (
        <span style={{ fontSize: 14, fontWeight: 500 }}>
          <SwapOutlined style={{ marginRight: 6 }} /> Xuất - Nhập - Tồn (XNT)
        </span>
      ),
      children: renderStockMovementTab()
    },
    {
      key: 'campaigns',
      label: (
        <span style={{ fontSize: 14, fontWeight: 500 }}>
          <PieChartOutlined style={{ marginRight: 6 }} /> Chiến Dịch Zalo ZNS
        </span>
      ),
      children: renderCampaignTab()
    }
  ];

  return (
    <DashboardLayout title="Báo Cáo & Phân Tích">
      <Head>
        <title>Trung Tâm Báo Cáo & Phân Tích | MobyFlow</title>
      </Head>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Header Controller Card */}
        <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Row gutter={[16, 16]} justify="space-between" align="middle">
            <Col xs={24} md={10}>
              <Title level={3} style={{ margin: 0, color: '#111827' }}>
                Trung Tâm Báo Cáo & Phân Tích
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Giai Đoạn 5: Báo cáo tài chính bán lẻ, giá trị kho, rủi ro hạn dùng FEFO & sổ kho tổng hợp
              </Text>
            </Col>

            <Col xs={24} md={14} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
              {/* Presets */}
              <Space wrap>
                <Button 
                  size="small" 
                  type={activePreset === 'today' ? 'primary' : 'default'}
                  ghost={activePreset === 'today'}
                  onClick={() => handleQuickPreset('today')}
                >
                  Hôm nay
                </Button>
                <Button 
                  size="small" 
                  type={activePreset === '7days' ? 'primary' : 'default'}
                  ghost={activePreset === '7days'}
                  onClick={() => handleQuickPreset('7days')}
                >
                  7 ngày qua
                </Button>
                <Button 
                  size="small" 
                  type={activePreset === '30days' ? 'primary' : 'default'}
                  ghost={activePreset === '30days'}
                  onClick={() => handleQuickPreset('30days')}
                >
                  30 ngày
                </Button>
                <Button 
                  size="small" 
                  type={activePreset === 'thisMonth' ? 'primary' : 'default'}
                  ghost={activePreset === 'thisMonth'}
                  onClick={() => handleQuickPreset('thisMonth')}
                >
                  Tháng này
                </Button>
                <Button 
                  size="small" 
                  type={activePreset === 'lastMonth' ? 'primary' : 'default'}
                  ghost={activePreset === 'lastMonth'}
                  onClick={() => handleQuickPreset('lastMonth')}
                >
                  Tháng trước
                </Button>
              </Space>

              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  setDateRange(dates);
                  setActivePreset('custom');
                }}
                format="DD/MM/YYYY"
                style={{ borderRadius: 6 }}
              />

              <Button
                icon={<SyncOutlined spin={loading} />}
                onClick={() => fetchData(activeTab, dateRange)}
              >
                Làm mới
              </Button>

              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                loading={exportLoading}
                onClick={handleExportExcel}
                style={{ backgroundColor: '#0d6e57', borderColor: '#0d6e57' }}
              >
                Xuất Excel
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Tab Content Container */}
        <Card bordered={false} style={{ borderRadius: 12, minHeight: 600 }}>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key)}
            items={tabItems}
          />
        </Card>
      </Space>
    </DashboardLayout>
  );
}
