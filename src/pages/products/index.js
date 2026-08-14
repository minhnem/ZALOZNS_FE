import React, { useState, useEffect } from 'react';
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
  InputNumber,
  Select,
  Popconfirm,
  App
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  SearchOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import handleAPI from '../../apis/handleAPI';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/hasPermission';

const { Title, Text } = Typography;

export default function ProductsPage() {
  const { user } = useSelector((state) => state.auth);
  const { message: messageApi } = App.useApp();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [form] = Form.useForm();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await handleAPI('/api/products', null, 'get');
      setProducts(res.map(item => ({ ...item, key: item._id })));
    } catch (error) {
      console.error(error);
      messageApi.error('Lấy dữ liệu sản phẩm thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (record = null) => {
    setEditingProduct(record);
    if (record) {
      form.setFieldsValue({
        name: record.name,
        category: record.category,
        usage_cycle_days: record.usage_cycle_days,
        status: record.status
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 'active', usage_cycle_days: 30 });
    }
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingProduct(null);
    form.resetFields();
  };

  const handleSave = async (values) => {
    try {
      if (editingProduct) {
        await handleAPI(`/api/products/${editingProduct._id}`, values, 'put');
        messageApi.success('Đã cập nhật sản phẩm thành công!');
      } else {
        await handleAPI('/api/products', values, 'post');
        messageApi.success('Đã thêm sản phẩm mới thành công!');
      }
      handleCloseModal();
      fetchProducts();
    } catch (error) {
      console.error(error);
      const msg = typeof error === 'string' ? error : (error?.message || 'Có lỗi xảy ra');
      messageApi.error(msg);
    }
  };

  const handleDelete = async (id) => {
    try {
      await handleAPI(`/api/products/${id}`, null, 'delete');
      messageApi.success('Đã xóa sản phẩm!');
      fetchProducts();
    } catch (error) {
      const msg = typeof error === 'string' ? error : (error?.message || 'Lỗi khi xóa sản phẩm');
      messageApi.error(msg);
    }
  };

  // Filtered data
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchText.toLowerCase());
    const matchCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const columns = [
    {
      title: 'Tên Sản Phẩm',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      render: (cat) => (
        <Tag color={cat === 'Bỉm - Tã' ? 'purple' : cat === 'Sữa công thức' ? 'blue' : 'default'}>
          {cat}
        </Tag>
      )
    },
    {
      title: 'Chu kỳ sử dụng ước tính',
      dataIndex: 'usage_cycle_days',
      key: 'usage_cycle_days',
      render: (days) => (
        <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
          {days} ngày
        </Tag>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'error'}>
          {status === 'active' ? 'Đang bán' : 'Ngừng bán'}
        </Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => {
              if (!hasPermission(user, 'data_edit')) return messageApi.warning('Bạn không có quyền sửa dữ liệu!');
              handleOpenModal(record);
            }}
            style={{ color: '#0d6e57' }}
          >
            Sửa chu kỳ
          </Button>
          {hasPermission(user, 'data_delete') ? (
            <Popconfirm
              title="Bạn có chắc chắn muốn xóa sản phẩm này?"
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
                messageApi.warning('Bạn không có quyền xóa dữ liệu!');
              }}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout title="Sản phẩm & Chu kỳ">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>Cấu hình Chu kỳ Sản phẩm</Title>
          <Text type="secondary">Quản lý vòng đời sử dụng để phục vụ cho các chiến dịch tự động (Refill)</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          style={{ background: '#0d6e57' }}
          onClick={() => {
            if (!hasPermission(user, 'data_create')) return messageApi.warning('Bạn không có quyền thêm mới dữ liệu!');
            handleOpenModal();
          }}
        >
          Thêm Sản phẩm
        </Button>
      </div>

      <Card 
        bordered={false} 
        style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ padding: 20, borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 16 }}>
          <Input 
            placeholder="Tìm kiếm tên sản phẩm..." 
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ maxWidth: 400 }}
            size="large"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select 
            value={filterCategory} 
            onChange={setFilterCategory} 
            size="large" 
            style={{ width: 180 }}
          >
            <Select.Option value="all">Tất cả danh mục</Select.Option>
            <Select.Option value="Bỉm - Tã">Bỉm - Tã</Select.Option>
            <Select.Option value="Sữa công thức">Sữa công thức</Select.Option>
            <Select.Option value="Đồ dùng vệ sinh">Đồ dùng vệ sinh</Select.Option>
          </Select>
        </div>

        <Table 
          columns={columns} 
          dataSource={filteredProducts} 
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Modal Thêm/Sửa */}
      <Modal
        title={editingProduct ? "Cập nhật Sản phẩm" : "Thêm Sản phẩm mới"}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={handleCloseModal}
        okText="Lưu lại"
        cancelText="Hủy"
        okButtonProps={{ style: { background: '#0d6e57' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          style={{ marginTop: 24 }}
        >
          <Form.Item 
            name="name" 
            label="Tên sản phẩm"
            rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}
          >
            <Input placeholder="VD: Bỉm Merries size S" size="large" />
          </Form.Item>
          
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item 
              name="category" 
              label="Danh mục"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Chọn danh mục' }]}
            >
              <Select size="large">
                <Select.Option value="Bỉm - Tã">Bỉm - Tã</Select.Option>
                <Select.Option value="Sữa công thức">Sữa công thức</Select.Option>
                <Select.Option value="Đồ dùng vệ sinh">Đồ dùng vệ sinh</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item 
              name="status" 
              label="Trạng thái"
              style={{ flex: 1 }}
            >
              <Select size="large">
                <Select.Option value="active">Đang bán</Select.Option>
                <Select.Option value="inactive">Ngừng bán</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item 
            name="usage_cycle_days" 
            label="Chu kỳ sử dụng ước tính (Ngày)"
            rules={[{ required: true, message: 'Vui lòng nhập chu kỳ' }]}
            extra="Số ngày dự kiến để khách hàng dùng hết sản phẩm này, phục vụ cho việc gửi ZNS tự động."
          >
            <InputNumber 
              min={1} 
              max={365} 
              size="large" 
              style={{ width: '100%' }}
              addonAfter="Ngày"
            />
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
