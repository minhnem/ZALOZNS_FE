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
  Drawer,
  Divider,
  Descriptions
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  SearchOutlined,
  DeleteOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  UserOutlined,
  ShoppingOutlined,
  CheckCircleOutlined,
  StopOutlined,
  EyeOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { FaTruck } from 'react-icons/fa';
import dayjs from 'dayjs';
import handleAPI from '../../apis/handleAPI';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/hasPermission';

const { Title, Text } = Typography;

export default function SuppliersPage() {
  const { user } = useSelector((state) => state.auth);
  const { message: messageApi } = App.useApp();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Drawer xem chi tiết NCC & lịch sử nhập
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState(null);
  const [supplierOrders, setSupplierOrders] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const formatCurrency = (val) => {
    if (!val || isNaN(val)) return '0 đ';
    return Number(val).toLocaleString('vi-VN') + ' đ';
  };

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await handleAPI('/api/suppliers', null, 'get');
      setSuppliers(res.map((item) => ({ ...item, key: item._id })));
    } catch (error) {
      console.error(error);
      messageApi.error('Lấy danh sách nhà cung cấp thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (record = null) => {
    setEditingSupplier(record);
    if (record) {
      form.setFieldsValue({
        name: record.name,
        code: record.code,
        phone: record.phone,
        email: record.email,
        address: record.address,
        tax_code: record.tax_code,
        contact_person: record.contact_person,
        notes: record.notes,
        status: record.status || 'active'
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 'active' });
    }
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingSupplier(null);
    form.resetFields();
  };

  const handleSave = async (values) => {
    try {
      if (editingSupplier) {
        await handleAPI(`/api/suppliers/${editingSupplier._id}`, values, 'put');
        messageApi.success('Cập nhật thông tin nhà cung cấp thành công!');
      } else {
        await handleAPI('/api/suppliers', values, 'post');
        messageApi.success('Thêm nhà cung cấp mới thành công!');
      }
      handleCloseModal();
      fetchSuppliers();
    } catch (error) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      messageApi.error(msg);
    }
  };

  const handleDelete = async (id) => {
    try {
      await handleAPI(`/api/suppliers/${id}`, null, 'delete');
      messageApi.success('Đã xóa nhà cung cấp!');
      setSelectedRowKeys((prev) => prev.filter((k) => k !== id));
      fetchSuppliers();
    } catch (error) {
      const msg = typeof error === 'string' ? error : error?.message || 'Lỗi khi xóa nhà cung cấp';
      messageApi.error(msg);
    }
  };

  const handleBulkDeleteSuppliers = async () => {
    if (selectedRowKeys.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      const res = await handleAPI('/api/suppliers/bulk-delete', { ids: selectedRowKeys }, 'post');
      messageApi.success(res?.message || `Đã xóa ${selectedRowKeys.length} nhà cung cấp!`);
      setSelectedRowKeys([]);
      fetchSuppliers();
    } catch (error) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || 'Lỗi khi xóa nhiều NCC';
      messageApi.error(msg);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleViewDetail = async (supplier) => {
    setSelectedSupplierDetail(supplier);
    setDrawerVisible(true);
    setLoadingDetail(true);
    try {
      const res = await handleAPI(`/api/suppliers/${supplier._id}`, null, 'get');
      setSelectedSupplierDetail(res.supplier);
      setSupplierOrders(res.recentOrders || []);
    } catch (error) {
      messageApi.error('Không thể lấy chi tiết nhà cung cấp');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.contact_person?.toLowerCase().includes(q);

      const matchStatus = filterStatus === 'all' || s.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [suppliers, search, filterStatus]);

  // KPIs
  const kpis = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter((s) => s.status === 'active').length;
    const totalPurchasedValue = suppliers.reduce((sum, s) => sum + (s.total_purchases || 0), 0);
    const totalPurchasedOrders = suppliers.reduce((sum, s) => sum + (s.purchase_count || 0), 0);
    return { total, active, totalPurchasedValue, totalPurchasedOrders };
  }, [suppliers]);

  const columns = [
    {
      title: 'Mã & Tên Nhà Cung Cấp',
      key: 'name_code',
      width: 260,
      render: (_, record) => (
        <div>
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#0d6e57',
              background: '#f0fdf4',
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 12
            }}
          >
            {record.code || 'N/A'}
          </span>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginTop: 4 }}>
            {record.name}
          </div>
          {record.tax_code && (
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              MST: {record.tax_code}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Người liên hệ & SĐT',
      key: 'contact',
      width: 220,
      render: (_, record) => (
        <div>
          {record.contact_person ? (
            <div style={{ fontWeight: 500, color: '#374151' }}>
              <UserOutlined style={{ marginRight: 6, color: '#0d6e57' }} />
              {record.contact_person}
            </div>
          ) : (
            <Text type="secondary">Chưa có người đại diện</Text>
          )}
          {record.phone && (
            <div style={{ fontSize: 12, color: '#2563eb', marginTop: 2 }}>
              <PhoneOutlined style={{ marginRight: 6 }} />
              {record.phone}
            </div>
          )}
          {record.email && (
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              <MailOutlined style={{ marginRight: 6 }} />
              {record.email}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      width: 200,
      ellipsis: true,
      render: (addr) =>
        addr ? (
          <span style={{ fontSize: 13, color: '#4b5563' }}>
            <EnvironmentOutlined style={{ marginRight: 4, color: '#ef4444' }} />
            {addr}
          </span>
        ) : (
          <Text type="secondary">-</Text>
        )
    },
    {
      title: 'Lịch sử nhập hàng',
      key: 'purchases',
      width: 180,
      sorter: (a, b) => (a.total_purchases || 0) - (b.total_purchases || 0),
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0d6e57' }}>
            {formatCurrency(record.total_purchases)}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {record.purchase_count || 0} lần nhập kho
          </div>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? 'Đang hợp tác' : 'Ngừng hợp tác'}
        </Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 170,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết & lịch sử nhập hàng">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
              style={{ color: '#2563eb', borderColor: '#bfdbfe' }}
            />
          </Tooltip>

          {hasPermission(user, 'data_edit') && (
            <Tooltip title="Chỉnh sửa thông tin">
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleOpenModal(record)}
                style={{ color: '#0d6e57' }}
              />
            </Tooltip>
          )}

          {hasPermission(user, 'data_delete') && (
            <Popconfirm
              title="Xóa nhà cung cấp?"
              description="Chỉ có thể xóa NCC nếu chưa có phiếu nhập kho nào liên kết."
              onConfirm={() => handleDelete(record._id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa nhà cung cấp">
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <DashboardLayout title="Nhà Cung Cấp">
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
            Quản Lý Nhà Cung Cấp
          </Title>
          <Text type="secondary">
            Danh mục đối tác cung ứng hàng hóa, thông tin liên hệ và tổng giá trị nhập kho
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
            onClick={() => handleOpenModal()}
          >
            Thêm Nhà Cung Cấp
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
              borderLeft: '4px solid #0d6e57'
            }}
          >
            <Statistic
              title={<span style={{ color: '#4b5563', fontSize: 13 }}>Tổng nhà cung cấp</span>}
              value={kpis.total}
              valueStyle={{ color: '#0d6e57', fontWeight: 700 }}
              prefix={<FaTruck style={{ marginRight: 6 }} />}
              suffix={<span style={{ fontSize: 13, color: '#6b7280' }}>đối tác</span>}
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
              title={<span style={{ color: '#4b5563', fontSize: 13 }}>Đang hợp tác</span>}
              value={kpis.active}
              valueStyle={{ color: '#10b981', fontWeight: 700 }}
              prefix={<CheckCircleOutlined />}
              suffix={<span style={{ fontSize: 13, color: '#6b7280' }}>active</span>}
            />
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
              title={<span style={{ color: '#4b5563', fontSize: 13 }}>Tổng lần nhập kho</span>}
              value={kpis.totalPurchasedOrders}
              valueStyle={{ color: '#2563eb', fontWeight: 700 }}
              prefix={<ShoppingOutlined />}
              suffix={<span style={{ fontSize: 13, color: '#6b7280' }}>đơn</span>}
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
              title={<span style={{ color: '#4b5563', fontSize: 13 }}>Tổng giá trị nhập</span>}
              value={kpis.totalPurchasedValue}
              formatter={(val) => formatCurrency(val)}
              valueStyle={{ color: '#d97706', fontWeight: 700, fontSize: 20 }}
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
            placeholder="Tìm tên NCC, mã NCC, SĐT, người liên hệ..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            style={{ maxWidth: 360 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />

          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 170 }}
          >
            <Select.Option value="all">Tất cả trạng thái</Select.Option>
            <Select.Option value="active">Đang hợp tác</Select.Option>
            <Select.Option value="inactive">Ngừng hợp tác</Select.Option>
          </Select>

          {(search || filterStatus !== 'all') && (
            <Button
              type="link"
              onClick={() => {
                setSearch('');
                setFilterStatus('all');
              }}
            >
              Xóa bộ lọc
            </Button>
          )}

          {hasPermission(user, 'data_delete') && selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`Xác nhận xóa ${selectedRowKeys.length} nhà cung cấp đã chọn?`}
              description="Lưu ý: Chỉ NCC chưa có phiếu nhập kho liên kết mới có thể bị xóa."
              onConfirm={handleBulkDeleteSuppliers}
              okText="Xóa tất cả"
              cancelText="Hủy"
              okButtonProps={{ danger: true, loading: bulkDeleteLoading }}
            >
              <Button danger type="primary" icon={<DeleteOutlined />}>
                Xóa ({selectedRowKeys.length}) nhà cung cấp đã chọn
              </Button>
            </Popconfirm>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={filteredSuppliers}
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
            showTotal: (total, range) => `${range[0]}-${range[1]} trên tổng ${total} đối tác`
          }}
          scroll={{ x: 1100 }}
        />
      </Card>

      {/* MODAL THÊM / SỬA NCC */}
      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {editingSupplier ? 'Chỉnh Sửa Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp Mới'}
          </div>
        }
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={handleCloseModal}
        okText="Lưu Nhà Cung Cấp"
        cancelText="Hủy"
        width={680}
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #0d6e57 0%, #10b981 100%)',
            border: 'none',
            fontWeight: 600
          }
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 20 }}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="name"
                label={<span style={{ fontWeight: 600 }}>Tên nhà cung cấp / Công ty</span>}
                rules={[{ required: true, message: 'Vui lòng nhập tên nhà cung cấp' }]}
              >
                <Input placeholder="VD: Công ty TNHH Phân Phối Merries Việt Nam" size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="code"
                label={<span style={{ fontWeight: 600 }}>Mã NCC</span>}
                extra="Để trống để tự sinh mã (NCC-xxx)"
              >
                <Input placeholder="VD: NCC-MERRIES" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contact_person"
                label={<span style={{ fontWeight: 600 }}>Người liên hệ đại diện</span>}
              >
                <Input placeholder="VD: Nguyễn Văn A (Quản lý vùng)" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label={<span style={{ fontWeight: 600 }}>Số điện thoại</span>}
              >
                <Input placeholder="VD: 0987654321" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label={<span style={{ fontWeight: 600 }}>Email</span>}
              >
                <Input placeholder="VD: sales@merries.vn" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tax_code"
                label={<span style={{ fontWeight: 600 }}>Mã số thuế</span>}
              >
                <Input placeholder="VD: 0101234567" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label={<span style={{ fontWeight: 600 }}>Địa chỉ trụ sở / kho hàng</span>}
          >
            <Input placeholder="VD: Tòa nhà Discovery, 302 Cầu Giấy, Hà Nội" size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label={<span style={{ fontWeight: 600 }}>Trạng thái hợp tác</span>}
              >
                <Select size="large">
                  <Select.Option value="active">Đang hợp tác</Select.Option>
                  <Select.Option value="inactive">Ngừng hợp tác</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="notes"
                label={<span style={{ fontWeight: 600 }}>Ghi chú điều khoản / chính sách</span>}
              >
                <Input placeholder="Chiết khấu đại lý, hạn mức công nợ..." size="large" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* DRAWER XEM CHI TIẾT NCC */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaTruck color="#0d6e57" />
            <span style={{ fontWeight: 700 }}>Hồ Sơ Nhà Cung Cấp</span>
          </div>
        }
        placement="right"
        width={580}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedSupplierDetail(null);
          setSupplierOrders([]);
        }}
      >
        {selectedSupplierDetail && (
          <div>
            <Descriptions title="Thông tin chung" bordered column={1} size="small">
              <Descriptions.Item label="Mã NCC">
                <Tag color="green">{selectedSupplierDetail.code}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tên công ty">
                <strong>{selectedSupplierDetail.name}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Người liên hệ">
                {selectedSupplierDetail.contact_person || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {selectedSupplierDetail.phone || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {selectedSupplierDetail.email || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ">
                {selectedSupplierDetail.address || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Mã số thuế">
                {selectedSupplierDetail.tax_code || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng đã mua">
                <span style={{ color: '#0d6e57', fontWeight: 700 }}>
                  {formatCurrency(selectedSupplierDetail.total_purchases)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú">
                {selectedSupplierDetail.notes || 'Không có ghi chú'}
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '20px 0 16px 0' }} />

            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: '#111827' }}>
              Phiếu Nhập Gần Đây ({supplierOrders.length})
            </div>

            {supplierOrders.length > 0 ? (
              <Table
                dataSource={supplierOrders}
                rowKey="_id"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: 'Mã Phiếu',
                    dataIndex: 'code',
                    key: 'code',
                    render: (c) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c}</span>
                  },
                  {
                    title: 'Ngày',
                    dataIndex: 'order_date',
                    key: 'order_date',
                    render: (d) => dayjs(d).format('DD/MM/YYYY')
                  },
                  {
                    title: 'Tổng tiền',
                    dataIndex: 'final_amount',
                    key: 'final_amount',
                    render: (v) => formatCurrency(v)
                  },
                  {
                    title: 'Trạng thái',
                    dataIndex: 'status',
                    key: 'status',
                    render: (st) => {
                      let col = 'default';
                      let txt = st;
                      if (st === 'received') { col = 'success'; txt = 'Đã nhập'; }
                      else if (st === 'confirmed') { col = 'processing'; txt = 'Đã duyệt'; }
                      else if (st === 'draft') { col = 'warning'; txt = 'Nháp'; }
                      else if (st === 'cancelled') { col = 'error'; txt = 'Hủy'; }
                      return <Tag color={col}>{txt}</Tag>;
                    }
                  }
                ]}
              />
            ) : (
              <Text type="secondary">Chưa có giao dịch nhập kho nào với nhà cung cấp này.</Text>
            )}
          </div>
        )}
      </Drawer>
    </DashboardLayout>
  );
}
