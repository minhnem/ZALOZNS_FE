import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  Popconfirm,
  App,
  Row,
  Col,
  Statistic,
  Tooltip,
  InputNumber,
  Divider,
  Alert
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DiffOutlined,
  DeleteOutlined,
  StopOutlined
} from '@ant-design/icons';
import { FaWarehouse, FaClipboardList } from 'react-icons/fa';
import dayjs from 'dayjs';
import handleAPI from '../../apis/handleAPI';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/hasPermission';

const { Title, Text } = Typography;

export default function InventoryPage() {
  const { user } = useSelector((state) => state.auth);
  const { message: messageApi } = App.useApp();

  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalMovements, setTotalMovements] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');

  // Month summary
  const [summary, setSummary] = useState(null);

  // Modals
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

  const [formAdjust] = Form.useForm();
  const [formDiscard] = Form.useForm();

  // Selected batch in modal to show current stock
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState(null);
  const [selectedBatchForDiscard, setSelectedBatchForDiscard] = useState(null);

  useEffect(() => {
    fetchMovements();
    fetchSummary();
    fetchProducts();
    fetchBatches();
  }, [currentPage, pageSize, filterType, filterProduct]);

  const formatCurrency = (val) => {
    if (!val || isNaN(val)) return '0 đ';
    return Number(val).toLocaleString('vi-VN') + ' đ';
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      let url = `/api/stock-movements?page=${currentPage}&limit=${pageSize}`;
      if (filterType !== 'all') url += `&type=${filterType}`;
      if (filterProduct !== 'all') url += `&product_id=${filterProduct}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await handleAPI(url, null, 'get');
      setMovements((res.items || []).map((item) => ({ ...item, key: item._id })));
      setTotalMovements(res.total || 0);
    } catch (error) {
      console.error(error);
      messageApi.error('Lấy dữ liệu sổ kho thất bại');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await handleAPI('/api/stock-movements/summary', null, 'get');
      setSummary(res);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await handleAPI('/api/products', null, 'get');
      setProducts(res);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await handleAPI('/api/product-batches', null, 'get');
      setBatches(res);
    } catch (error) {
      console.error(error);
    }
  };

  // Xử lý điều chỉnh kiểm kê
  const handleSaveAdjust = async (values) => {
    try {
      await handleAPI('/api/stock-movements/adjust', values, 'post');
      messageApi.success('Đã điều chỉnh tồn kho thành công và ghi nhận Sổ kho!');
      setIsAdjustModalOpen(false);
      formAdjust.resetFields();
      setSelectedBatchForAdjust(null);
      fetchMovements();
      fetchSummary();
      fetchBatches();
      fetchProducts();
    } catch (error) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || 'Có lỗi khi kiểm kê';
      messageApi.error(msg);
    }
  };

  // Xử lý xuất hủy hàng
  const handleSaveDiscard = async (values) => {
    try {
      await handleAPI('/api/stock-movements/discard', values, 'post');
      messageApi.success('Đã xuất hủy hàng và ghi nhận Sổ kho!');
      setIsDiscardModalOpen(false);
      formDiscard.resetFields();
      setSelectedBatchForDiscard(null);
      fetchMovements();
      fetchSummary();
      fetchBatches();
      fetchProducts();
    } catch (error) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || 'Có lỗi khi xuất hủy';
      messageApi.error(msg);
    }
  };

  const renderTypeTag = (type) => {
    switch (type) {
      case 'IN':
        return <Tag color="green" icon={<ArrowUpOutlined />}>Nhập kho</Tag>;
      case 'OUT':
        return <Tag color="blue" icon={<ArrowDownOutlined />}>Xuất bán</Tag>;
      case 'ADJUSTMENT':
        return <Tag color="orange" icon={<DiffOutlined />}>Kiểm kê</Tag>;
      case 'DISCARD':
        return <Tag color="red" icon={<DeleteOutlined />}>Xuất hủy</Tag>;
      case 'TRANSFER':
        return <Tag color="purple">Chuyển kho</Tag>;
      default:
        return <Tag>{type}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Thời Gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (t) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>
            {dayjs(t).format('DD/MM/YYYY')}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>
            {dayjs(t).format('HH:mm:ss')}
          </div>
        </div>
      )
    },
    {
      title: 'Loại Biến Động',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (type) => renderTypeTag(type)
    },
    {
      title: 'Mã Chứng Từ',
      dataIndex: 'reference_code',
      key: 'reference_code',
      width: 170,
      render: (code, record) => (
        <div>
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#1e3a8a',
              background: '#f8fafc',
              padding: '2px 6px',
              borderRadius: 4
            }}
          >
            {code || 'THỦ CÔNG'}
          </span>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            {record.reference_type}
          </div>
        </div>
      )
    },
    {
      title: 'Sản Phẩm & Lô Hàng',
      key: 'prod_batch',
      width: 250,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>
            {record.product_id?.name || 'Sản phẩm'}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
            {record.batch_number && (
              <Tag color="cyan" style={{ margin: 0, fontSize: 11, fontFamily: 'monospace' }}>
                Lô: {record.batch_number}
              </Tag>
            )}
            <span style={{ fontSize: 11, color: '#6b7280' }}>
              ĐVT: {record.product_id?.unit || 'Cái'}
            </span>
          </div>
        </div>
      )
    },
    {
      title: 'Biến Động',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (qty, record) => {
        const isPositive = qty > 0;
        const color = isPositive ? '#10b981' : '#ef4444';
        const sign = isPositive ? '+' : '';
        return (
          <span style={{ fontWeight: 700, color, fontSize: 14 }}>
            {sign}{qty} {record.product_id?.unit || 'Cái'}
          </span>
        );
      }
    },
    {
      title: 'Tồn Kho (Trước → Sau)',
      key: 'stock_change',
      width: 180,
      render: (_, record) => (
        <div>
          <span style={{ color: '#6b7280' }}>{record.previous_stock}</span>
          <span style={{ margin: '0 6px', color: '#9ca3af' }}>&rarr;</span>
          <span style={{ fontWeight: 700, color: '#111827' }}>{record.current_stock}</span>{' '}
          <span style={{ fontSize: 12, color: '#6b7280' }}>{record.product_id?.unit || 'Cái'}</span>
        </div>
      )
    },
    {
      title: 'Giá Trị Biến Động',
      dataIndex: 'total_value',
      key: 'total_value',
      width: 140,
      render: (val) => formatCurrency(val)
    },
    {
      title: 'Lý Do / Ghi Chú',
      dataIndex: 'notes',
      key: 'notes',
      width: 220,
      ellipsis: true,
      render: (n) => <span style={{ fontSize: 12, color: '#4b5563' }}>{n || '-'}</span>
    },
    {
      title: 'Người Thực Hiện',
      dataIndex: 'created_by',
      key: 'created_by',
      width: 130,
      render: (u) => <span style={{ fontSize: 12 }}>{u?.name || 'Hệ thống'}</span>
    }
  ];

  return (
    <DashboardLayout title="Sổ Kho & Kiểm Kê">
      {/* HEADER SECTION */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827', fontWeight: 700 }}>
            Sổ Kho & Lịch Sử Biến Động Tồn Kho
          </Title>
          <Text type="secondary">
            Theo dõi chi tiết mọi giao dịch nhập kho, xuất bán, kiểm kê điều chỉnh và xuất hủy hàng
          </Text>
        </div>

        <Space size="middle">
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchMovements();
              fetchSummary();
              messageApi.info('Đã làm mới dữ liệu sổ kho');
            }}
          >
            Làm mới
          </Button>

          {hasPermission(user, 'data_edit') && (
            <Button
              icon={<DiffOutlined />}
              onClick={() => {
                formAdjust.resetFields();
                setSelectedBatchForAdjust(null);
                setIsAdjustModalOpen(true);
              }}
              style={{ color: '#d97706', borderColor: '#fde68a' }}
            >
              Kiểm Kê Kho
            </Button>
          )}

          {hasPermission(user, 'data_edit') && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                formDiscard.resetFields();
                setSelectedBatchForDiscard(null);
                setIsDiscardModalOpen(true);
              }}
            >
              Xuất Hủy Hàng
            </Button>
          )}
        </Space>
      </div>

      {/* KPI METRICS (THÁNG HIỆN TẠI) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              borderLeft: '4px solid #10b981'
            }}
          >
            <Statistic
              title={<span style={{ color: '#4b5563', fontSize: 13 }}>Nhập trong tháng</span>}
              value={summary?.in?.quantity || 0}
              valueStyle={{ color: '#10b981', fontWeight: 700 }}
              prefix={<ArrowUpOutlined />}
              suffix={<span style={{ fontSize: 13, color: '#6b7280' }}>sản phẩm</span>}
            />
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              Giá trị: {formatCurrency(summary?.in?.value)}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              borderLeft: '4px solid #3b82f6'
            }}
          >
            <Statistic
              title={<span style={{ color: '#4b5563', fontSize: 13 }}>Xuất bán trong tháng</span>}
              value={summary?.out?.quantity || 0}
              valueStyle={{ color: '#2563eb', fontWeight: 700 }}
              prefix={<ArrowDownOutlined />}
              suffix={<span style={{ fontSize: 13, color: '#6b7280' }}>sản phẩm</span>}
            />
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              Số giao dịch: {summary?.out?.count || 0} lần
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              borderLeft: '4px solid #f59e0b'
            }}
          >
            <Statistic
              title={<span style={{ color: '#4b5563', fontSize: 13 }}>Kiểm kê điều chỉnh</span>}
              value={summary?.adjustment?.count || 0}
              valueStyle={{ color: '#d97706', fontWeight: 700 }}
              prefix={<DiffOutlined />}
              suffix={<span style={{ fontSize: 13, color: '#6b7280' }}>lần</span>}
            />
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              Lượng lệch: {summary?.adjustment?.quantity || 0} SP
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              borderLeft: '4px solid #ef4444'
            }}
          >
            <Statistic
              title={<span style={{ color: '#4b5563', fontSize: 13 }}>Xuất hủy cận date/hỏng</span>}
              value={summary?.discard?.quantity || 0}
              valueStyle={{ color: '#dc2626', fontWeight: 700 }}
              prefix={<DeleteOutlined />}
              suffix={<span style={{ fontSize: 13, color: '#6b7280' }}>sản phẩm</span>}
            />
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              Thiệt hại vốn: {formatCurrency(summary?.discard?.value)}
            </div>
          </Card>
        </Col>
      </Row>

      {/* MAIN TABLE */}
      <Card
        bordered={false}
        style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        bodyStyle={{ padding: 24 }}
      >
        {/* TOOLBAR */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input
            placeholder="Tìm theo mã chứng từ, mã lô, ghi chú..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            style={{ maxWidth: 340 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={fetchMovements}
            allowClear
          />

          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: 170 }}
          >
            <Select.Option value="all">Tất cả loại giao dịch</Select.Option>
            <Select.Option value="IN">Nhập kho (IN)</Select.Option>
            <Select.Option value="OUT">Xuất bán (OUT)</Select.Option>
            <Select.Option value="ADJUSTMENT">Kiểm kê kho</Select.Option>
            <Select.Option value="DISCARD">Xuất hủy</Select.Option>
          </Select>

          <Select
            value={filterProduct}
            onChange={setFilterProduct}
            style={{ minWidth: 220, maxWidth: 300 }}
            showSearch
            optionFilterProp="children"
            placeholder="Lọc theo sản phẩm"
          >
            <Select.Option value="all">Tất cả sản phẩm</Select.Option>
            {products.map((p) => (
              <Select.Option key={p._id} value={p._id}>
                {p.name} {p.sku ? `(${p.sku})` : ''}
              </Select.Option>
            ))}
          </Select>

          <Button type="primary" onClick={fetchMovements}>
            Lọc Sổ Kho
          </Button>

          {(search || filterType !== 'all' || filterProduct !== 'all') && (
            <Button
              type="link"
              onClick={() => {
                setSearch('');
                setFilterType('all');
                setFilterProduct('all');
              }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={movements}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            total: totalMovements,
            onChange: (p, ps) => {
              setCurrentPage(p);
              setPageSize(ps);
            },
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} trên tổng ${total} bản ghi sổ kho`
          }}
          scroll={{ x: 1300 }}
        />
      </Card>

      {/* MODAL KIỂM KÊ ĐIỀU CHỈNH TỒN KHO */}
      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            Kiểm Kê Kho — Điều Chỉnh Số Lượng Thực Tế
          </div>
        }
        open={isAdjustModalOpen}
        onOk={() => formAdjust.submit()}
        onCancel={() => {
          setIsAdjustModalOpen(false);
          setSelectedBatchForAdjust(null);
        }}
        okText="Xác Nhận Điều Chỉnh"
        cancelText="Hủy"
        width={600}
        okButtonProps={{ style: { background: '#d97706', borderColor: '#d97706' } }}
      >
        <Form form={formAdjust} layout="vertical" onFinish={handleSaveAdjust} style={{ marginTop: 16 }}>
          <Form.Item
            name="batch_id"
            label={<span style={{ fontWeight: 600 }}>Chọn Lô Hàng Cần Kiểm Kê</span>}
            rules={[{ required: true, message: 'Vui lòng chọn lô hàng' }]}
          >
            <Select
              size="large"
              placeholder="Chọn lô hàng..."
              showSearch
              optionFilterProp="children"
              onChange={(bId) => {
                const b = batches.find((item) => item._id === bId);
                setSelectedBatchForAdjust(b);
                if (b) {
                  formAdjust.setFieldsValue({
                    product_id: b.product_id?._id || b.product_id,
                    actual_quantity: b.quantity_in_stock
                  });
                }
              }}
            >
              {batches.map((b) => (
                <Select.Option key={b._id} value={b._id}>
                  {b.product_id?.name || 'Sản phẩm'} — Lô: {b.batch_number} (Tồn hiện tại: {b.quantity_in_stock}{' '}
                  {b.product_id?.unit || 'Cái'})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="product_id" hidden>
            <Input />
          </Form.Item>

          {selectedBatchForAdjust && (
            <Alert
              message={
                <div>
                  <strong>Tồn kho hệ thống hiện tại:</strong>{' '}
                  <span style={{ fontSize: 16, color: '#0d6e57', fontWeight: 700 }}>
                    {selectedBatchForAdjust.quantity_in_stock}
                  </span>{' '}
                  {selectedBatchForAdjust.product_id?.unit || 'Cái'}
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item
            name="actual_quantity"
            label={<span style={{ fontWeight: 600 }}>Số lượng thực tế kiểm đếm được</span>}
            rules={[{ required: true, message: 'Nhập số lượng thực tế' }]}
            extra="Nhập số lượng thực tế trong kho. Hệ thống sẽ tự động tính chênh lệch thừa/thiếu."
          >
            <InputNumber min={0} size="large" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="reason"
            label={<span style={{ fontWeight: 600 }}>Lý do điều chỉnh kiểm kê</span>}
            rules={[{ required: true, message: 'Vui lòng ghi lý do' }]}
          >
            <Input.TextArea rows={2} placeholder="VD: Kiểm kê định kỳ cuối tháng, sai lệch hàng do thất thoát..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL XUẤT HỦY HÀNG CẬN DATE / HỎNG */}
      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>
            Xuất Hủy Hàng — Cận Date / Hỏng Hóc
          </div>
        }
        open={isDiscardModalOpen}
        onOk={() => formDiscard.submit()}
        onCancel={() => {
          setIsDiscardModalOpen(false);
          setSelectedBatchForDiscard(null);
        }}
        okText="Xác Nhận Xuất Hủy"
        cancelText="Hủy"
        width={600}
        okButtonProps={{ danger: true }}
      >
        <Form form={formDiscard} layout="vertical" onFinish={handleSaveDiscard} style={{ marginTop: 16 }}>
          <Form.Item
            name="batch_id"
            label={<span style={{ fontWeight: 600 }}>Chọn Lô Hàng Cần Hủy</span>}
            rules={[{ required: true, message: 'Vui lòng chọn lô hàng' }]}
          >
            <Select
              size="large"
              placeholder="Chọn lô hàng..."
              showSearch
              optionFilterProp="children"
              onChange={(bId) => {
                const b = batches.find((item) => item._id === bId);
                setSelectedBatchForDiscard(b);
              }}
            >
              {batches
                .filter((b) => b.quantity_in_stock > 0)
                .map((b) => (
                  <Select.Option key={b._id} value={b._id}>
                    {b.product_id?.name || 'Sản phẩm'} — Lô: {b.batch_number} (Tồn:{' '}
                    {b.quantity_in_stock} {b.product_id?.unit || 'Cái'} — HSD:{' '}
                    {dayjs(b.expiry_date).format('DD/MM/YYYY')})
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          {selectedBatchForDiscard && (
            <Alert
              message={
                <div>
                  <strong>Tồn kho lô này:</strong>{' '}
                  <span style={{ fontSize: 16, color: '#dc2626', fontWeight: 700 }}>
                    {selectedBatchForDiscard.quantity_in_stock}
                  </span>{' '}
                  {selectedBatchForDiscard.product_id?.unit || 'Cái'} • Hạn dùng:{' '}
                  {dayjs(selectedBatchForDiscard.expiry_date).format('DD/MM/YYYY')}
                </div>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item
            name="quantity"
            label={<span style={{ fontWeight: 600 }}>Số lượng xuất hủy</span>}
            rules={[{ required: true, message: 'Nhập số lượng xuất hủy' }]}
          >
            <InputNumber
              min={1}
              max={selectedBatchForDiscard ? selectedBatchForDiscard.quantity_in_stock : undefined}
              size="large"
              style={{ width: '100%' }}
              placeholder="Nhập số lượng muốn hủy"
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label={<span style={{ fontWeight: 600 }}>Lý do xuất hủy</span>}
            rules={[{ required: true, message: 'Vui lòng ghi rõ lý do hủy hàng' }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="VD: Hết hạn sử dụng không thể bán, hộp bị móp rách do vận chuyển..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
