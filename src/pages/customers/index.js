import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  Button, 
  Table, 
  Badge, 
  Tag, 
  Input, 
  Select, 
  Space, 
  Row, 
  Col, 
  Checkbox, 
  Statistic,
  Avatar,
  message,
  Modal,
  Form,
  DatePicker,
  Popconfirm
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  ImportOutlined, 
  ReloadOutlined, 
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined
} from '@ant-design/icons';
import { FaUsers, FaBoxOpen, FaExclamationTriangle } from 'react-icons/fa';
import DashboardLayout from '../../layouts/DashboardLayout';
import handleAPI from '../../apis/handleAPI';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function CustomersPage() {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [products, setProducts] = useState([]);
  const [form] = Form.useForm();
  
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [editingCustomerId, setEditingCustomerId] = useState(null);

  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [isEditOrderVisible, setIsEditOrderVisible] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editOrderForm] = Form.useForm();

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await handleAPI('/api/products', null, 'get');
      setProducts(res.map(p => ({ label: p.name, value: p._id })));
    } catch (error) {
      console.error('Lỗi khi lấy sản phẩm', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await handleAPI('/api/customers?type=BUYER', null, 'get');
      setCustomers(res.map(item => ({ ...item, key: item._id })));
    } catch (error) {
      message.error('Lấy dữ liệu khách hàng thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (values) => {
    try {
      const payload = {
        ...values,
        purchase_date: values.purchase_date ? values.purchase_date.toISOString() : null
      };
      await handleAPI('/api/customers', payload, 'post');
      message.success('Thêm khách hàng thành công!');
      setIsModalVisible(false);
      form.resetFields();
      fetchCustomers();
    } catch (error) {
      message.error(error.message || 'Lỗi khi thêm khách hàng');
    }
  };

  const handleOpenEdit = (record) => {
    setEditingCustomerId(record._id);
    editForm.setFieldsValue({
      phone: record.phone
    });
    setIsEditModalVisible(true);
  };

  const handleOpenDetails = async (record) => {
    setSelectedCustomer(record);
    setIsDetailsModalVisible(true);
    fetchCustomerOrders(record._id);
  };

  const fetchCustomerOrders = async (customerId) => {
    try {
      setOrdersLoading(true);
      const res = await handleAPI(`/api/orders?customer_id=${customerId}`, null, 'get');
      setCustomerOrders(res.map(item => ({ ...item, key: item._id })));
    } catch (error) {
      message.error('Lỗi khi lấy danh sách đơn hàng');
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      await handleAPI(`/api/orders/${orderId}`, null, 'delete');
      message.success('Xóa đơn hàng thành công!');
      if (selectedCustomer) fetchCustomerOrders(selectedCustomer._id);
      fetchCustomers();
    } catch (error) {
      message.error(error.message || 'Lỗi khi xóa đơn hàng');
    }
  };

  const handleOpenEditOrder = (record) => {
    setEditingOrderId(record._id);
    editOrderForm.setFieldsValue({
      purchase_date: record.purchase_date ? dayjs(record.purchase_date) : null,
      expected_refill_date: record.expected_refill_date ? dayjs(record.expected_refill_date) : null,
    });
    setIsEditOrderVisible(true);
  };

  const handleEditOrder = async (values) => {
    try {
      const payload = {
        purchase_date: values.purchase_date ? values.purchase_date.toISOString() : null
      };
      await handleAPI(`/api/orders/${editingOrderId}`, payload, 'put');
      message.success('Cập nhật đơn hàng thành công!');
      setIsEditOrderVisible(false);
      editOrderForm.resetFields();
      if (selectedCustomer) fetchCustomerOrders(selectedCustomer._id);
      fetchCustomers();
    } catch (error) {
      message.error(error.message || 'Lỗi khi cập nhật đơn hàng');
    }
  };

  const handleEditCustomer = async (values) => {
    try {
      const payload = {
        ...values,
        purchase_date: values.purchase_date ? values.purchase_date.toISOString() : null
      };
      await handleAPI(`/api/customers/${editingCustomerId}`, payload, 'put');
      message.success('Cập nhật khách hàng thành công!');
      setIsEditModalVisible(false);
      editForm.resetFields();
      fetchCustomers();
    } catch (error) {
      message.error(error.message || 'Lỗi khi cập nhật khách hàng');
    }
  };

  const handleDeleteCustomer = async (id) => {
    try {
      await handleAPI(`/api/customers/${id}`, null, 'delete');
      message.success('Xóa khách hàng thành công!');
      fetchCustomers();
    } catch (error) {
      message.error(error.message || 'Lỗi khi xóa khách hàng');
    }
  };

  const columns = [
    {
      title: 'Mã Khách Hàng',
      dataIndex: '_id',
      key: 'id',
      render: (text) => <Text strong style={{ color: '#0d6e57' }}>{text ? text.toString().slice(-6).toUpperCase() : 'UNKNOWN'}</Text>,
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => <Text strong>{text || 'Chưa cập nhật'}</Text>
    },
    {
      title: 'Sản phẩm theo dõi & Dự kiến hết bỉm',
      key: 'products',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {record.purchased_products && record.purchased_products.length > 0 ? (
            record.purchased_products.map((prod, index) => (
              <div key={index} style={{ fontSize: 13, marginBottom: 4 }}>
                <Text strong>• {prod.product_name}</Text>
                <br/>
                <Text type="secondary" style={{ paddingLeft: 10 }}>
                  Dự kiến hết: {prod.expected_refill_date ? new Date(prod.expected_refill_date).toLocaleDateString('vi-VN') : 'Không rõ'}
                </Text>
              </div>
            ))
          ) : record.last_purchased_product ? (
            <div style={{ fontSize: 13 }}>
              <Text strong>• {record.last_purchased_product}</Text>
              <br/>
              <Text type="secondary" style={{ paddingLeft: 10 }}>
                Dự kiến hết: {record.next_refill_date ? new Date(record.next_refill_date).toLocaleDateString('vi-VN') : 'Không rõ'}
              </Text>
            </div>
          ) : (
            <Text type="secondary" style={{ fontSize: 13 }}>Chưa mua sản phẩm nào</Text>
          )}
        </div>
      )
    },
    {
      title: 'Trạng thái ZNS',
      key: 'znsStatus',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          {record.zns_enabled !== false ? (
            <>
              <Tag color="green">Hoạt động</Tag>
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>(Tự động ZNS)</Text>
            </>
          ) : (
            <>
              <Tag color="red">Tắt ZNS</Tag>
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>(Khách chặn)</Text>
            </>
          )}
        </div>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#0ea5e9' }} onClick={() => handleOpenDetails(record)}>Chi tiết</Button>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#d97706' }} onClick={() => handleOpenEdit(record)}>Sửa SĐT</Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa khách hàng này?"
            onConfirm={() => handleDeleteCustomer(record._id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="text" size="small" icon={<DeleteOutlined />} danger>Xóa</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <DashboardLayout title="Quản lý Khách hàng">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 12, background: '#ecfdf5', borderRadius: 8 }}>
              <FaUsers size={24} color="#0d6e57" />
            </div>
            <div>
              <Title level={3} style={{ margin: 0, color: '#111827' }}>QUẢN LÝ KHÁCH HÀNG (CUSTOMERS)</Title>
              <Text type="secondary">Danh sách khách hàng và lịch trình chăm sóc tự động</Text>
            </div>
          </div>
          <Space>
            <Button icon={<ImportOutlined />} size="large">Import Đơn</Button>
            <Button type="primary" icon={<PlusOutlined />} size="large" style={{ background: '#0d6e57' }} onClick={() => setIsModalVisible(true)}>
              Thêm Khách Hàng
            </Button>
          </Space>
        </div>

        {/* 1. SUMMARY CARDS */}
        <Row gutter={16}>
          <Col span={8}>
            <Card style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderLeft: '4px solid #3b82f6' }}>
              <Statistic 
                title="Tổng Khách Hàng" 
                value={1250} 
                prefix={<FaUsers style={{ color: '#3b82f6', marginRight: 8 }} />}
                valueStyle={{ color: '#111827', fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
              <Statistic 
                title="Đang theo dõi Refill" 
                value={890} 
                prefix={<FaBoxOpen style={{ color: '#10b981', marginRight: 8 }} />}
                valueStyle={{ color: '#10b981', fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
              <Statistic 
                title="Sắp hết bỉm/sữa (7 ngày)" 
                value={45} 
                prefix={<FaExclamationTriangle style={{ color: '#f59e0b', marginRight: 8 }} />}
                valueStyle={{ color: '#f59e0b', fontWeight: 600 }}
              />
            </Card>
          </Col>
        </Row>

        {/* 2. SMART FILTERS */}
        <Card 
          title={<span style={{ color: '#0d6e57', fontWeight: 600 }}>2. BỘ LỌC DỮ LIỆU KHÁCH HÀNG (SMART FILTERS)</span>} 
          style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Input 
                size="large" 
                placeholder="Tìm theo Tên mẹ, SĐT, Mã KH..." 
                prefix={<SearchOutlined />} 
                allowClear
              />
            </Col>
            <Col span={12}>
              <Select 
                size="large" 
                style={{ width: '100%' }} 
                defaultValue="all"
                options={[
                  { value: 'all', label: 'Nhóm tuổi bé: Tất cả (0 - 36 tháng)' },
                  { value: 'pregnancy', label: 'Mang thai' },
                  { value: '0-3', label: 'Sơ sinh (0 - 3 tháng)' },
                  { value: '4-6', label: '4 - 6 tháng' }
                ]}
              />
            </Col>
            <Col span={12}>
              <Select 
                size="large" 
                style={{ width: '100%' }} 
                defaultValue="all"
                options={[
                  { value: 'all', label: 'Sản phẩm theo dõi: Tất cả (Bỉm, Sữa...)' },
                  { value: 'diaper', label: 'Bỉm các loại' },
                  { value: 'milk', label: 'Sữa công thức' }
                ]}
              />
            </Col>
            <Col span={12}>
              <Select 
                size="large" 
                style={{ width: '100%' }} 
                defaultValue="soon"
                options={[
                  { value: 'all', label: 'Trạng thái Refill: Tất cả' },
                  { value: 'soon', label: '🟢 Sắp đến ngày refill' },
                  { value: 'late', label: '🔴 Đã quá ngày refill' }
                ]}
              />
            </Col>
            <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <Checkbox>Chỉ hiện khách có lịch gửi ZNS trong tuần này</Checkbox>
              <Space>
                <Button icon={<ReloadOutlined />}>Xóa bộ lọc</Button>
                <Button type="primary" icon={<FilterOutlined />} style={{ background: '#0d6e57' }}>
                  LỌC DỮ LIỆU
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 3. BẢNG DANH SÁCH */}
        <Card style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <Table 
            columns={columns} 
            dataSource={customers} 
            loading={loading}
            pagination={{ pageSize: 10 }}
            bordered
            size="middle"
          />
        </Card>

      </div>

      <Modal
        title="Thêm Khách Hàng Mới"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleAddCustomer} style={{ marginTop: 24 }}>
          <Form.Item 
            label="Số điện thoại" 
            name="phone" 
            rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
          >
            <Input size="large" placeholder="Nhập số điện thoại khách hàng" />
          </Form.Item>

          <Form.Item 
            label="Sản phẩm đã mua (Tuỳ chọn)" 
            name="product_id"
            extra="Nếu bạn chọn sản phẩm, khách hàng sẽ lập tức trở thành người mua (BUYER) và tự động tính ngày hết bỉm."
          >
            <Select size="large" placeholder="Chọn sản phẩm khách mua" options={products} allowClear />
          </Form.Item>
          
          <Form.Item 
            label="Ngày mua (Tùy chọn)" 
            name="purchase_date"
            extra="Nếu không chọn, hệ thống sẽ lấy ngày hiện tại làm ngày mua."
          >
            <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" placeholder="Chọn ngày mua" />
          </Form.Item>

          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0, marginTop: 32 }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>Hủy bỏ</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#0d6e57' }}>Lưu Khách Hàng</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Sửa Khách Hàng"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditCustomer} style={{ marginTop: 24 }}>
          <Form.Item 
            label="Số điện thoại" 
            name="phone" 
            rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
          >
            <Input size="large" placeholder="Nhập số điện thoại khách hàng" />
          </Form.Item>

          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0, marginTop: 32 }}>
            <Space>
              <Button onClick={() => setIsEditModalVisible(false)}>Hủy bỏ</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#0d6e57' }}>Lưu Khách Hàng</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Chi tiết Khách hàng: ${selectedCustomer?.phone || ''}`}
        open={isDetailsModalVisible}
        onCancel={() => setIsDetailsModalVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Danh sách sản phẩm đã mua & Lịch nhắc nhở (ZNS)</Text>
        </div>
        <Table 
          dataSource={customerOrders} 
          loading={ordersLoading}
          pagination={false}
          bordered
          size="small"
          columns={[
            {
              title: 'Sản phẩm',
              dataIndex: ['product_id', 'name'],
              render: (text, record) => record.product_name || text
            },
            {
              title: 'Ngày mua',
              dataIndex: 'purchase_date',
              render: (text) => text ? new Date(text).toLocaleDateString('vi-VN') : ''
            },
            {
              title: 'Dự kiến hết (Refill)',
              dataIndex: 'expected_refill_date',
              render: (text) => text ? <Text strong style={{ color: '#f59e0b' }}>{new Date(text).toLocaleDateString('vi-VN')}</Text> : 'Không rõ'
            },
            {
              title: 'Thao tác',
              key: 'action',
              render: (_, record) => (
                <Space>
                  <Button type="text" style={{ color: '#d97706' }} icon={<EditOutlined />} onClick={() => handleOpenEditOrder(record)}>Sửa</Button>
                  <Popconfirm
                    title="Xóa đơn hàng này sẽ hủy lịch gửi ZNS nhắc nhở tương ứng. Bạn chắc chứ?"
                    onConfirm={() => handleDeleteOrder(record._id)}
                    okText="Xóa Đơn"
                    cancelText="Hủy"
                  >
                    <Button type="text" danger icon={<DeleteOutlined />}>Xóa</Button>
                  </Popconfirm>
                </Space>
              )
            }
          ]}
        />
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" style={{ background: '#0d6e57' }} onClick={() => {
              setIsDetailsModalVisible(false);
              form.setFieldsValue({ phone: selectedCustomer?.phone });
              setIsModalVisible(true);
          }}>+ Thêm đơn hàng mới</Button>
        </div>
      </Modal>

      <Modal
        title="Sửa Đơn Hàng"
        open={isEditOrderVisible}
        onCancel={() => setIsEditOrderVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={editOrderForm} layout="vertical" onFinish={handleEditOrder} style={{ marginTop: 24 }}>
          <Form.Item 
            label="Ngày mua hàng" 
            name="purchase_date"
            extra="Hệ thống sẽ tự động tính lại ngày hết bỉm dựa theo chu kỳ của sản phẩm khi bạn thay đổi ngày mua."
          >
            <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" placeholder="Chọn ngày mua" />
          </Form.Item>

          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0, marginTop: 32 }}>
            <Space>
              <Button onClick={() => setIsEditOrderVisible(false)}>Hủy bỏ</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#0d6e57' }}>Lưu Đơn Hàng</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
