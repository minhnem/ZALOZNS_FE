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
  DatePicker,
  InputNumber,
  Divider,
  Checkbox,
  Drawer,
  Descriptions,
  Alert
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  SearchOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  EyeOutlined,
  CalendarOutlined,
  StopOutlined,
  DollarOutlined,
  BarcodeOutlined
} from '@ant-design/icons';
import { FaWarehouse, FaTruck } from 'react-icons/fa';
import dayjs from 'dayjs';
import handleAPI from '../../apis/handleAPI';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/hasPermission';

const { Title, Text } = Typography;

export default function PurchaseOrdersPage() {
  const { user } = useSelector((state) => state.auth);
  const { message: messageApi, modal: modalApi } = App.useApp();

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Modal tạo / sửa
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  // Drawer xem chi tiết
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  const [form] = Form.useForm();

  // Watch items trong form để tính tổng tiền
  const [orderItems, setOrderItems] = useState([]);
  const [discountVal, setDiscountVal] = useState(0);
  const [taxVal, setTaxVal] = useState(0);

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const formatCurrency = (val) => {
    if (!val || isNaN(val)) return '0 đ';
    return Number(val).toLocaleString('vi-VN') + ' đ';
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await handleAPI('/api/purchase-orders', null, 'get');
      setOrders(res.map((item) => ({ ...item, key: item._id })));
    } catch (error) {
      console.error(error);
      messageApi.error('Lấy danh sách phiếu nhập kho thất bại');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await handleAPI('/api/suppliers?status=active', null, 'get');
      setSuppliers(res);
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

  // Mở modal tạo phiếu mới
  const handleOpenCreateModal = () => {
    setEditingOrder(null);
    form.resetFields();

    const todayStr = dayjs().format('YYYYMMDD');
    const defaultBatchNo = `LOT-${todayStr}-${Math.floor(100 + Math.random() * 900)}`;

    const initialItem = products.length > 0 ? {
      product_id: products[0]._id,
      batch_number: defaultBatchNo,
      manufacturing_date: dayjs(),
      expiry_date: dayjs().add(1, 'year'),
      quantity: 10,
      cost_price: products[0].cost_price || 0
    } : null;

    form.setFieldsValue({
      code: `PO-${todayStr}-${Math.floor(100 + Math.random() * 900)}`,
      order_date: dayjs(),
      payment_status: 'unpaid',
      payment_method: 'bank_transfer',
      discount: 0,
      tax: 0,
      auto_receive: true, // Mặc định kích hoạt nhập kho ngay
      items: initialItem ? [initialItem] : []
    });

    setOrderItems(initialItem ? [initialItem] : []);
    setDiscountVal(0);
    setTaxVal(0);
    setIsModalVisible(true);
  };

  // Mở modal chỉnh sửa phiếu nhập kho
  const handleOpenEditModal = (order) => {
    setEditingOrder(order);

    const formattedItems = (order.items || []).map((it) => ({
      product_id: it.product_id?._id || it.product_id,
      batch_number: it.batch_number,
      manufacturing_date: it.manufacturing_date ? dayjs(it.manufacturing_date) : null,
      expiry_date: it.expiry_date ? dayjs(it.expiry_date) : null,
      quantity: it.quantity,
      cost_price: it.cost_price,
      product_batch_id: it.product_batch_id?._id || it.product_batch_id
    }));

    form.setFieldsValue({
      supplier_id: order.supplier_id?._id || order.supplier_id,
      code: order.code,
      order_date: order.order_date ? dayjs(order.order_date) : dayjs(),
      expected_delivery_date: order.expected_delivery_date ? dayjs(order.expected_delivery_date) : null,
      discount: order.discount || 0,
      tax: order.tax || 0,
      payment_status: order.payment_status || 'unpaid',
      payment_method: order.payment_method || 'bank_transfer',
      notes: order.notes || '',
      items: formattedItems,
      auto_receive: false
    });

    setOrderItems(formattedItems);
    setDiscountVal(order.discount || 0);
    setTaxVal(order.tax || 0);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingOrder(null);
    form.resetFields();
    setOrderItems([]);
  };

  // Thêm dòng sản phẩm mới vào phiếu
  const handleAddItem = () => {
    const todayStr = dayjs().format('YYYYMMDD');
    const defaultBatchNo = `LOT-${todayStr}-${Math.floor(100 + Math.random() * 900)}`;
    const currentItems = form.getFieldValue('items') || [];
    const firstProd = products[0];

    const newItem = {
      product_id: firstProd?._id,
      batch_number: defaultBatchNo,
      manufacturing_date: dayjs(),
      expiry_date: dayjs().add(1, 'year'),
      quantity: 1,
      cost_price: firstProd?.cost_price || 0
    };

    const updated = [...currentItems, newItem];
    form.setFieldsValue({ items: updated });
    setOrderItems(updated);
  };

  // Xóa 1 dòng sản phẩm
  const handleRemoveItem = (index) => {
    const currentItems = form.getFieldValue('items') || [];
    const updated = currentItems.filter((_, idx) => idx !== index);
    form.setFieldsValue({ items: updated });
    setOrderItems(updated);
  };

  // Khi chọn sản phẩm thì tự điền giá vốn cost_price
  const handleProductSelect = (productId, index) => {
    const prod = products.find((p) => p._id === productId);
    if (!prod) return;

    const currentItems = form.getFieldValue('items') || [];
    currentItems[index] = {
      ...currentItems[index],
      product_id: prod._id,
      cost_price: prod.cost_price || 0
    };
    form.setFieldsValue({ items: currentItems });
    setOrderItems([...currentItems]);
  };

  // Lưu phiếu nhập
  const handleSaveOrder = async (values) => {
    try {
      if (!values.items || values.items.length === 0) {
        return messageApi.error('Phiếu nhập phải có ít nhất 1 sản phẩm');
      }

      const payload = {
        ...values,
        order_date: values.order_date ? values.order_date.toISOString() : new Date().toISOString(),
        expected_delivery_date: values.expected_delivery_date
          ? values.expected_delivery_date.toISOString()
          : null,
        items: values.items.map((it) => ({
          ...it,
          manufacturing_date: it.manufacturing_date ? it.manufacturing_date.toISOString() : null,
          expiry_date: it.expiry_date ? it.expiry_date.toISOString() : null
        }))
      };

      if (editingOrder) {
        await handleAPI(`/api/purchase-orders/${editingOrder._id}`, payload, 'put');
        messageApi.success('Cập nhật phiếu nhập kho thành công!');
      } else {
        await handleAPI('/api/purchase-orders', payload, 'post');
        messageApi.success('Tạo phiếu nhập kho thành công!');
      }

      handleCloseModal();
      fetchOrders();
    } catch (error) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || 'Có lỗi khi lưu phiếu';
      messageApi.error(msg);
    }
  };

  // Xác nhận nhập kho thực tế
  const handleReceiveOrder = async (orderId) => {
    try {
      const res = await handleAPI(`/api/purchase-orders/${orderId}/receive`, null, 'post');
      messageApi.success(res.message || 'Đã hoàn tất nhập kho vào hệ thống!');
      fetchOrders();
    } catch (error) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || 'Lỗi khi nhập kho';
      messageApi.error(msg);
    }
  };

  // Hủy phiếu
  const handleCancelOrder = async (orderId) => {
    try {
      await handleAPI(`/api/purchase-orders/${orderId}/cancel`, null, 'post');
      messageApi.success('Đã hủy phiếu nhập kho');
      fetchOrders();
    } catch (error) {
      messageApi.error('Lỗi khi hủy phiếu');
    }
  };

  // Xóa phiếu
  const handleDeleteOrder = async (orderId) => {
    try {
      await handleAPI(`/api/purchase-orders/${orderId}`, null, 'delete');
      messageApi.success('Đã xóa phiếu nhập');
      setSelectedRowKeys((prev) => prev.filter((k) => k !== orderId));
      fetchOrders();
    } catch (error) {
      messageApi.error('Lỗi khi xóa phiếu');
    }
  };

  // Xóa nhiều phiếu đã chọn
  const handleBulkDeleteOrders = async () => {
    if (selectedRowKeys.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      const res = await handleAPI('/api/purchase-orders/bulk-delete', { ids: selectedRowKeys }, 'post');
      messageApi.success(res?.message || `Đã xóa ${selectedRowKeys.length} phiếu nhập kho!`);
      setSelectedRowKeys([]);
      fetchOrders();
    } catch (error) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || 'Lỗi khi xóa nhiều phiếu';
      messageApi.error(msg);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Xem chi tiết
  const handleViewDetail = async (order) => {
    setSelectedOrderDetail(order);
    setDrawerVisible(true);
    try {
      const res = await handleAPI(`/api/purchase-orders/${order._id}`, null, 'get');
      setSelectedOrderDetail(res);
    } catch (error) {
      console.error(error);
    }
  };

  // Tính tổng tiền realtime cho Form
  const formCalculations = useMemo(() => {
    const items = orderItems || [];
    let subtotal = 0;
    items.forEach((it) => {
      const qty = Number(it?.quantity) || 0;
      const cost = Number(it?.cost_price) || 0;
      subtotal += qty * cost;
    });
    const finalAmount = Math.max(0, subtotal - Number(discountVal || 0) + Number(taxVal || 0));
    return { subtotal, finalAmount };
  }, [orderItems, discountVal, taxVal]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.code?.toLowerCase().includes(q) ||
        o.supplier_name?.toLowerCase().includes(q) ||
        o.items?.some((i) => i.batch_number?.toLowerCase().includes(q) || i.product_name?.toLowerCase().includes(q));

      const matchSupplier = filterSupplier === 'all' || (o.supplier_id?._id || o.supplier_id) === filterSupplier;
      const matchStatus = filterStatus === 'all' || o.status === filterStatus;
      return matchSearch && matchSupplier && matchStatus;
    });
  }, [orders, search, filterSupplier, filterStatus]);

  // KPIs
  const kpis = useMemo(() => {
    const total = orders.length;
    let receivedCount = 0;
    let pendingCount = 0;
    let totalValue = 0;

    orders.forEach((o) => {
      if (o.status === 'received') {
        receivedCount++;
        totalValue += o.final_amount || 0;
      } else if (o.status === 'confirmed' || o.status === 'draft') {
        pendingCount++;
      }
    });

    return { total, receivedCount, pendingCount, totalValue };
  }, [orders]);

  const renderStatusTag = (status) => {
    switch (status) {
      case 'received':
        return <Tag color="success" icon={<CheckCircleOutlined />}>Đã nhập kho</Tag>;
      case 'confirmed':
        return <Tag color="processing" icon={<ClockCircleOutlined />}>Chờ giao hàng</Tag>;
      case 'draft':
        return <Tag color="warning">Bản nháp</Tag>;
      case 'cancelled':
        return <Tag color="error" icon={<StopOutlined />}>Đã hủy</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Mã Phiếu',
      dataIndex: 'code',
      key: 'code',
      width: 170,
      render: (code) => (
        <span
          style={{
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#1e3a8a',
            background: '#eff6ff',
            padding: '3px 8px',
            borderRadius: 6
          }}
        >
          {code}
        </span>
      )
    },
    {
      title: 'Nhà Cung Cấp',
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      width: 220,
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>{name}</div>
          {record.supplier_id?.phone && (
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              SĐT: {record.supplier_id.phone}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Ngày Lập / Nhập',
      key: 'dates',
      width: 160,
      sorter: (a, b) => new Date(a.order_date) - new Date(b.order_date),
      render: (_, record) => (
        <div>
          <div>
            <CalendarOutlined style={{ marginRight: 6, color: '#0d6e57' }} />
            {dayjs(record.order_date).format('DD/MM/YYYY')}
          </div>
          {record.received_date && (
            <div style={{ fontSize: 11, color: '#10b981' }}>
              Nhập: {dayjs(record.received_date).format('DD/MM/YYYY')}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Mặt Hàng',
      key: 'items_count',
      width: 130,
      render: (_, record) => (
        <Tag color="cyan">
          {record.items?.length || 0} sản phẩm
        </Tag>
      )
    },
    {
      title: 'Tổng Tiền',
      dataIndex: 'final_amount',
      key: 'final_amount',
      width: 160,
      sorter: (a, b) => (a.final_amount || 0) - (b.final_amount || 0),
      render: (val, record) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0d6e57', fontSize: 14 }}>
            {formatCurrency(val)}
          </div>
          {record.discount > 0 && (
            <div style={{ fontSize: 11, color: '#ef4444' }}>
              CK: -{formatCurrency(record.discount)}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Thanh toán',
      key: 'payment',
      width: 130,
      render: (_, record) => {
        const st = record.payment_status;
        if (st === 'paid') return <Tag color="green">Đã trả đủ</Tag>;
        if (st === 'partially_paid') return <Tag color="gold">Trả 1 phần</Tag>;
        return <Tag color="volcano">Chưa trả</Tag>;
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (st) => renderStatusTag(st)
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => {
        const isReceived = record.status === 'received';
        const isCancelled = record.status === 'cancelled';

        return (
          <Space size="small">
            <Tooltip title="Xem chi tiết phiếu nhập">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetail(record)}
                style={{ color: '#2563eb', borderColor: '#bfdbfe' }}
              />
            </Tooltip>

            {hasPermission(user, 'data_edit') && !isCancelled && (
              <Tooltip title="Chỉnh sửa phiếu nhập">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleOpenEditModal(record)}
                  style={{ color: '#0d6e57', borderColor: '#a7f3d0' }}
                />
              </Tooltip>
            )}

            {hasPermission(user, 'data_edit') && !isReceived && !isCancelled && (
              <Popconfirm
                title="Xác nhận nhập kho thực tế?"
                description="Hệ thống sẽ tự động tạo/cập nhật Lô hàng (ProductBatch), tăng tồn kho và ghi Sổ kho."
                onConfirm={() => handleReceiveOrder(record._id)}
                okText="Nhập Kho"
                cancelText="Hủy"
              >
                <Tooltip title="Nhập kho hàng vào hệ thống">
                  <Button
                    size="small"
                    type="primary"
                    style={{ background: '#10b981', borderColor: '#10b981' }}
                    icon={<InboxOutlined />}
                  >
                    Nhập kho
                  </Button>
                </Tooltip>
              </Popconfirm>
            )}

            {hasPermission(user, 'data_edit') && !isReceived && !isCancelled && (
              <Popconfirm
                title="Hủy phiếu nhập kho này?"
                onConfirm={() => handleCancelOrder(record._id)}
                okText="Đồng ý"
                cancelText="Quay lại"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Hủy phiếu">
                  <Button size="small" type="text" danger icon={<StopOutlined />} />
                </Tooltip>
              </Popconfirm>
            )}

            {hasPermission(user, 'data_delete') && (isCancelled || record.status === 'draft') && (
              <Popconfirm
                title="Xóa phiếu nhập kho?"
                onConfirm={() => handleDeleteOrder(record._id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Xóa phiếu">
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <DashboardLayout title="Nhập Kho">
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
            Quản Lý Phiếu Nhập Kho
          </Title>
          <Text type="secondary">
            Lập phiếu đặt hàng NCC, kiểm đếm hàng về, sinh mã Lô tự động và tăng tồn kho
          </Text>
        </div>

        {hasPermission(user, 'data_create') && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            style={{
              background: 'linear-gradient(135deg, #0d6e57 0%, #10b981 100%)',
              border: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(13, 110, 87, 0.25)'
            }}
            onClick={handleOpenCreateModal}
          >
            Tạo Phiếu Nhập Kho
          </Button>
        )}
      </div>

      {/* KPI METRIC CARDS */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
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
              title={<span style={{ color: '#4b5563', fontSize: 13 }}>Tổng phiếu nhập</span>}
              value={kpis.total}
              valueStyle={{ color: '#2563eb', fontWeight: 700 }}
              prefix={<FaWarehouse style={{ marginRight: 6 }} />}
              suffix={<span style={{ fontSize: 13, color: '#6b7280' }}>phiếu</span>}
            />
          </Card>
        </Col>
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
              title={<span style={{ color: '#4b5563', fontSize: 13 }}>Đã hoàn tất nhập kho</span>}
              value={kpis.receivedCount}
              valueStyle={{ color: '#10b981', fontWeight: 700 }}
              prefix={<CheckCircleOutlined />}
              suffix={<span style={{ fontSize: 13, color: '#6b7280' }}>thành công</span>}
            />
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
              title={<span style={{ color: '#4b5563', fontSize: 13 }}>Chờ nhập / Đang đặt</span>}
              value={kpis.pendingCount}
              valueStyle={{ color: '#d97706', fontWeight: 700 }}
              prefix={<ClockCircleOutlined />}
              suffix={<span style={{ fontSize: 13, color: '#6b7280' }}>đang chờ</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              borderLeft: '4px solid #0d6e57'
            }}
          >
            <Statistic
              title={<span style={{ color: '#4b5563', fontSize: 13 }}>Giá trị hàng đã nhập</span>}
              value={kpis.totalValue}
              formatter={(val) => formatCurrency(val)}
              valueStyle={{ color: '#0d6e57', fontWeight: 700, fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      {/* MAIN TABLE CARD */}
      <Card
        bordered={false}
        style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        bodyStyle={{ padding: 24 }}
      >
        {/* TOOLBAR */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input
            placeholder="Tìm theo mã phiếu, NCC, mã lô, tên SP..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            style={{ maxWidth: 360 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />

          <Select
            value={filterSupplier}
            onChange={setFilterSupplier}
            style={{ minWidth: 200, maxWidth: 260 }}
            placeholder="Nhà cung cấp"
          >
            <Select.Option value="all">Tất cả nhà cung cấp</Select.Option>
            {suppliers.map((s) => (
              <Select.Option key={s._id} value={s._id}>
                {s.name}
              </Select.Option>
            ))}
          </Select>

          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 170 }}
          >
            <Select.Option value="all">Tất cả trạng thái</Select.Option>
            <Select.Option value="received">Đã nhập kho</Select.Option>
            <Select.Option value="confirmed">Chờ giao hàng</Select.Option>
            <Select.Option value="draft">Bản nháp</Select.Option>
            <Select.Option value="cancelled">Đã hủy</Select.Option>
          </Select>

          {(search || filterSupplier !== 'all' || filterStatus !== 'all') && (
            <Button
              type="link"
              onClick={() => {
                setSearch('');
                setFilterSupplier('all');
                setFilterStatus('all');
              }}
            >
              Xóa bộ lọc
            </Button>
          )}

          {hasPermission(user, 'data_delete') && selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`Xác nhận xóa ${selectedRowKeys.length} phiếu nhập đã chọn?`}
              description="Lưu ý: Chỉ các phiếu ở trạng thái nháp hoặc đã hủy mới bị xóa (phiếu đã nhập kho sẽ được bỏ qua)."
              onConfirm={handleBulkDeleteOrders}
              okText="Xóa tất cả"
              cancelText="Hủy"
              okButtonProps={{ danger: true, loading: bulkDeleteLoading }}
            >
              <Button danger type="primary" icon={<DeleteOutlined />}>
                Xóa ({selectedRowKeys.length}) phiếu nhập đã chọn
              </Button>
            </Popconfirm>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={filteredOrders}
          rowKey="_id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} trên tổng ${total} phiếu nhập`
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* MODAL TẠO / SỬA PHIẾU NHẬP KHO */}
      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {editingOrder ? `Chỉnh Sửa Phiếu Nhập: ${editingOrder.code}` : 'Tạo Phiếu Nhập Kho Mới'}
          </div>
        }
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={handleCloseModal}
        okText={editingOrder ? 'Lưu Thay Đổi' : 'Xác Nhận Tạo Phiếu'}
        cancelText="Hủy"
        width={920}
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #0d6e57 0%, #10b981 100%)',
            border: 'none',
            fontWeight: 600
          }
        }}
      >
        {editingOrder?.status === 'received' && (
          <Alert
            type="info"
            showIcon
            message="Phiếu này đã hoàn tất nhập kho"
            description="Mọi điều chỉnh về số lượng, giá nhập, hạn sử dụng hoặc mã lô sẽ tự động đồng bộ trực tiếp vào Lô hàng (ProductBatch) và cập nhật lại tồn kho trong hệ thống."
            style={{ marginTop: 12, marginBottom: 8, borderRadius: 8 }}
          />
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveOrder}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item
                name="supplier_id"
                label={<span style={{ fontWeight: 600 }}>Nhà cung cấp</span>}
                rules={[{ required: true, message: 'Vui lòng chọn nhà cung cấp' }]}
              >
                <Select
                  size="large"
                  placeholder="Chọn nhà cung cấp"
                  showSearch
                  optionFilterProp="children"
                >
                  {suppliers.map((s) => (
                    <Select.Option key={s._id} value={s._id}>
                      {s.name} ({s.code || 'NCC'})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={7}>
              <Form.Item
                name="code"
                label={<span style={{ fontWeight: 600 }}>Mã phiếu nhập</span>}
                rules={[{ required: true, message: 'Vui lòng nhập mã phiếu' }]}
              >
                <Input size="large" disabled={!!editingOrder} />
              </Form.Item>
            </Col>

            <Col span={7}>
              <Form.Item
                name="order_date"
                label={<span style={{ fontWeight: 600 }}>Ngày lập phiếu</span>}
                rules={[{ required: true, message: 'Chọn ngày lập' }]}
              >
                <DatePicker size="large" format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '8px 0 16px 0', fontSize: 14 }}>
            Danh Sách Hàng Nhập Kho
          </Divider>

          {/* DYNAMIC ITEMS FORM LIST */}
          <Form.List name="items">
            {(fields) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {fields.map(({ key, name, ...restField }, idx) => (
                  <Card
                    key={key}
                    size="small"
                    style={{
                      background: '#f9fafb',
                      borderRadius: 10,
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: '#0d6e57' }}>
                        #{idx + 1}. Sản phẩm & Lô
                      </span>
                      {fields.length > 1 && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          onClick={() => handleRemoveItem(name)}
                          icon={<DeleteOutlined />}
                        >
                          Xóa dòng
                        </Button>
                      )}
                    </div>

                    <Row gutter={12}>
                      <Col span={10}>
                        <Form.Item
                          {...restField}
                          name={[name, 'product_id']}
                          label={<span style={{ fontSize: 12, fontWeight: 600 }}>Sản phẩm</span>}
                          rules={[{ required: true, message: 'Chọn sản phẩm' }]}
                        >
                          <Select
                            placeholder="Chọn sản phẩm"
                            showSearch
                            optionFilterProp="children"
                            onChange={(val) => handleProductSelect(val, name)}
                          >
                            {products.map((p) => (
                              <Select.Option key={p._id} value={p._id}>
                                {p.name} {p.sku ? `(${p.sku})` : ''}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>

                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'batch_number']}
                          label={<span style={{ fontSize: 12, fontWeight: 600 }}>Mã Lô Hàng</span>}
                          rules={[{ required: true, message: 'Nhập mã lô' }]}
                        >
                          <Input placeholder="VD: LOT-001" />
                        </Form.Item>
                      </Col>

                      <Col span={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          label={<span style={{ fontSize: 12, fontWeight: 600 }}>Số lượng</span>}
                          rules={[{ required: true, message: 'Nhập SL' }]}
                        >
                          <InputNumber
                            min={1}
                            style={{ width: '100%' }}
                            onChange={() => setOrderItems(form.getFieldValue('items'))}
                          />
                        </Form.Item>
                      </Col>

                      <Col span={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'cost_price']}
                          label={<span style={{ fontSize: 12, fontWeight: 600 }}>Giá nhập (đ)</span>}
                          rules={[{ required: true, message: 'Nhập giá' }]}
                        >
                          <InputNumber
                            min={0}
                            step={1000}
                            style={{ width: '100%' }}
                            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
                            onChange={() => setOrderItems(form.getFieldValue('items'))}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={10}>
                        <Form.Item
                          {...restField}
                          name={[name, 'manufacturing_date']}
                          label={<span style={{ fontSize: 12, color: '#6b7280' }}>Ngày sản xuất (NSX)</span>}
                        >
                          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn NSX" />
                        </Form.Item>
                      </Col>
                      <Col span={10}>
                        <Form.Item
                          {...restField}
                          name={[name, 'expiry_date']}
                          label={<span style={{ fontSize: 12, fontWeight: 600 }}>Hạn sử dụng (HSD)</span>}
                          rules={[{ required: true, message: 'Chọn HSD' }]}
                        >
                          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn HSD" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}

                <Button
                  type="dashed"
                  onClick={handleAddItem}
                  block
                  icon={<PlusOutlined />}
                  style={{ borderColor: '#0d6e57', color: '#0d6e57' }}
                >
                  Thêm mặt hàng nhập
                </Button>
              </div>
            )}
          </Form.List>

          <Divider style={{ margin: '16px 0' }} />

          {/* TOTALS & PAYMENT DETAILS */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="discount"
                label={<span style={{ fontWeight: 600 }}>Chiết khấu (VNĐ)</span>}
              >
                <InputNumber
                  min={0}
                  step={5000}
                  style={{ width: '100%' }}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
                  onChange={(v) => setDiscountVal(v || 0)}
                  addonAfter="đ"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="tax"
                label={<span style={{ fontWeight: 600 }}>Thuế VAT (VNĐ)</span>}
              >
                <InputNumber
                  min={0}
                  step={5000}
                  style={{ width: '100%' }}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
                  onChange={(v) => setTaxVal(v || 0)}
                  addonAfter="đ"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <div
                style={{
                  background: '#f0fdf4',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid #bbf7d0',
                  textAlign: 'right'
                }}
              >
                <div style={{ fontSize: 12, color: '#4b5563' }}>Tổng tiền phải trả:</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0d6e57' }}>
                  {formatCurrency(formCalculations.finalAmount)}
                </div>
              </div>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="payment_status"
                label={<span style={{ fontWeight: 600 }}>Thanh toán</span>}
              >
                <Select>
                  <Select.Option value="unpaid">Chưa thanh toán</Select.Option>
                  <Select.Option value="partially_paid">Thanh toán 1 phần</Select.Option>
                  <Select.Option value="paid">Đã thanh toán đủ</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="payment_method"
                label={<span style={{ fontWeight: 600 }}>Hình thức thanh toán</span>}
              >
                <Select>
                  <Select.Option value="bank_transfer">Chuyển khoản</Select.Option>
                  <Select.Option value="cash">Tiền mặt</Select.Option>
                  <Select.Option value="debt">Ghi nợ NCC</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="notes"
                label={<span style={{ fontWeight: 600 }}>Ghi chú phiếu</span>}
              >
                <Input placeholder="Số hóa đơn đỏ, số hợp đồng..." />
              </Form.Item>
            </Col>
          </Row>

          {(!editingOrder || editingOrder?.status !== 'received') && (
            <Form.Item name="auto_receive" valuePropName="checked">
              <Checkbox style={{ fontWeight: 600, color: '#0d6e57' }}>
                Xác nhận hàng đã về kho và kích hoạt nhập kho ngay (Tự động sinh Lô & tăng tồn kho)
              </Checkbox>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* DRAWER XEM CHI TIẾT PHIẾU NHẬP */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaWarehouse color="#0d6e57" />
            <span style={{ fontWeight: 700 }}>
              Chi Tiết Phiếu Nhập: {selectedOrderDetail?.code}
            </span>
          </div>
        }
        placement="right"
        width={720}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedOrderDetail(null);
        }}
      >
        {selectedOrderDetail && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Mã Phiếu">
                <strong style={{ fontFamily: 'monospace' }}>{selectedOrderDetail.code}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng Thái">
                {renderStatusTag(selectedOrderDetail.status)}
              </Descriptions.Item>
              <Descriptions.Item label="Nhà Cung Cấp">
                <strong>{selectedOrderDetail.supplier_name}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày Lập Phiếu">
                {dayjs(selectedOrderDetail.order_date).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày Nhập Kho">
                {selectedOrderDetail.received_date
                  ? dayjs(selectedOrderDetail.received_date).format('DD/MM/YYYY HH:mm')
                  : 'Chưa nhập kho'}
              </Descriptions.Item>
              <Descriptions.Item label="Người Lập">
                {selectedOrderDetail.created_by?.name || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng Tiền Hàng">
                {formatCurrency(selectedOrderDetail.total_amount)}
              </Descriptions.Item>
              <Descriptions.Item label="Chiết Khấu">
                -{formatCurrency(selectedOrderDetail.discount)}
              </Descriptions.Item>
              <Descriptions.Item label="Thuế VAT">
                +{formatCurrency(selectedOrderDetail.tax)}
              </Descriptions.Item>
              <Descriptions.Item label="Thực Trả">
                <span style={{ color: '#0d6e57', fontWeight: 700, fontSize: 15 }}>
                  {formatCurrency(selectedOrderDetail.final_amount)}
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '20px 0 16px 0' }} />

            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: '#111827' }}>
              Danh Sách Mặt Hàng & Lô Nhập ({selectedOrderDetail.items?.length || 0})
            </div>

            <Table
              dataSource={selectedOrderDetail.items || []}
              rowKey="_id"
              size="small"
              pagination={false}
              columns={[
                {
                  title: 'Sản Phẩm',
                  key: 'prod',
                  render: (_, r) => (
                    <div>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{r.product_name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        {r.sku ? `SKU: ${r.sku} • ` : ''}ĐVT: {r.unit || 'Cái'}
                      </div>
                    </div>
                  )
                },
                {
                  title: 'Mã Lô & HSD',
                  key: 'batch',
                  render: (_, r) => (
                    <div>
                      <Tag color="blue" style={{ fontFamily: 'monospace' }}>
                        {r.batch_number}
                      </Tag>
                      <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>
                        HSD: {dayjs(r.expiry_date).format('DD/MM/YYYY')}
                      </div>
                    </div>
                  )
                },
                {
                  title: 'Số Lượng',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  render: (q, r) => `${q} ${r.unit || 'Cái'}`
                },
                {
                  title: 'Giá Nhập',
                  dataIndex: 'cost_price',
                  key: 'cost_price',
                  render: (p) => formatCurrency(p)
                },
                {
                  title: 'Thành Tiền',
                  dataIndex: 'total_price',
                  key: 'total_price',
                  render: (p) => <strong>{formatCurrency(p)}</strong>
                }
              ]}
            />
          </div>
        )}
      </Drawer>
    </DashboardLayout>
  );
}
