import React, { useState, useEffect } from 'react';
import { Typography, Card, Table, Tag, Space, Button, Select, App, Row, Col, Statistic, Layout, Modal, Form, Input, Result, Descriptions, Popconfirm } from 'antd';
import { ShopOutlined, UserOutlined, MessageOutlined, ShoppingCartOutlined, LogoutOutlined, PlusOutlined, CopyOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import axiosClient from '../../apis/axiosClient';

const { Title, Text } = Typography;
const { Header, Content } = Layout;
const { Option } = Select;

export default function SuperAdminDashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { message } = App.useApp();
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  // State cho modal tạo shop
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState(null); // Kết quả sau khi tạo thành công
  const [createForm] = Form.useForm();

  // State cho modal sửa shop
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [editForm] = Form.useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, tenantsRes] = await Promise.all([
        axiosClient.get('/api/super-admin/stats'),
        axiosClient.get('/api/super-admin/tenants')
      ]);
      setStats(statsRes);
      setTenants(tenantsRes);
    } catch (error) {
      message.error('Lỗi khi tải dữ liệu Super Admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await axiosClient.put(`/api/super-admin/tenants/${id}/status`, { status });
      message.success('Cập nhật trạng thái thành công');
      fetchData();
    } catch (error) {
      message.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleUpdatePlan = async (id, plan) => {
    try {
      await axiosClient.put(`/api/super-admin/tenants/${id}/plan`, { plan });
      message.success('Cập nhật gói cước thành công');
      fetchData();
    } catch (error) {
      message.error('Lỗi khi cập nhật gói cước');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  // === Xử lý tạo Shop mới ===
  const handleCreateShop = async (values) => {
    setCreateLoading(true);
    try {
      const res = await axiosClient.post('/api/super-admin/tenants', values);
      setCreateResult({
        shopName: values.shopName,
        email: values.email,
        password: values.password,
        tenant: res.tenant,
        admin: res.admin,
      });
      message.success(res.message || 'Tạo Shop thành công!');
      fetchData(); // Refresh danh sách
    } catch (error) {
      message.error(error?.message || 'Lỗi khi tạo Shop');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalVisible(false);
    setCreateResult(null);
    createForm.resetFields();
  };

  const handleCopyCredentials = () => {
    if (!createResult) return;
    const text = `Thông tin đăng nhập Shop: ${createResult.shopName}\nEmail: ${createResult.email}\nMật khẩu: ${createResult.password}\nĐăng nhập tại: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text).then(() => {
      message.success('Đã copy thông tin đăng nhập!');
    }).catch(() => {
      message.error('Không thể copy, vui lòng copy thủ công.');
    });
  };

  const handleEditClick = (record) => {
    setEditingTenant(record);
    editForm.setFieldsValue({
      name: record.name,
      phone: record.phone,
      address: record.address,
      plan: record.plan,
      status: record.status,
      max_users: record.max_users,
      max_customers: record.max_customers,
      max_zns_per_month: record.max_zns_per_month,
    });
    setIsEditModalVisible(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalVisible(false);
    setEditingTenant(null);
    editForm.resetFields();
  };

  const handleUpdateShop = async (values) => {
    setEditLoading(true);
    try {
      await axiosClient.put(`/api/super-admin/tenants/${editingTenant._id}`, values);
      message.success('Cập nhật thông tin Shop thành công!');
      fetchData();
      handleCloseEditModal();
    } catch (error) {
      message.error(error?.message || 'Lỗi khi cập nhật Shop');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteShop = async (id) => {
    try {
      await axiosClient.delete(`/api/super-admin/tenants/${id}`);
      message.success('Đã xoá Shop thành công');
      fetchData();
    } catch (error) {
      message.error(error?.message || 'Lỗi khi xoá Shop');
    }
  };

  const columns = [
    {
      title: 'Tên Shop',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Chủ Shop (Owner)',
      key: 'owner',
      render: (_, record) => record.owner_id ? (
        <Space direction="vertical" size={0}>
          <Text>{record.owner_id.fullName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.owner_id.email}</Text>
        </Space>
      ) : <Text type="secondary">N/A</Text>
    },
    {
      title: 'Gói cước (Plan)',
      dataIndex: 'plan',
      key: 'plan',
      render: (plan, record) => (
        <Select 
          value={plan} 
          style={{ width: 120 }} 
          onChange={(val) => handleUpdatePlan(record._id, val)}
        >
          <Option value="free">Free</Option>
          <Option value="basic">Basic</Option>
          <Option value="pro">Pro</Option>
          <Option value="enterprise">Enterprise</Option>
        </Select>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Select 
          value={status} 
          style={{ width: 120 }} 
          onChange={(val) => handleUpdateStatus(record._id, val)}
        >
          <Option value="active"><Tag color="success">Hoạt động</Tag></Option>
          <Option value="trial"><Tag color="processing">Dùng thử</Tag></Option>
          <Option value="suspended"><Tag color="error">Tạm khóa</Tag></Option>
          <Option value="expired"><Tag color="default">Hết hạn</Tag></Option>
        </Select>
      )
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEditClick(record)} 
            title="Chỉnh sửa" 
          />
          <Popconfirm
            title="Xác nhận xóa"
            description={<>Bạn có chắc muốn xóa Shop <b>{record.name}</b>?<br/>Tài khoản Admin của Shop cũng sẽ bị xóa!</>}
            onConfirm={() => handleDeleteShop(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button 
              type="text" 
              danger
              icon={<DeleteOutlined />} 
              title="Xóa" 
            />
          </Popconfirm>
        </Space>
      ),
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Header style={{ backgroundColor: '#0d6e57', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img 
            src="/logo mobyflow2-01.png" 
            alt="MobyFlow Logo" 
            style={{ height: '36px', filter: 'brightness(0) invert(1)' }} // Chuyển logo thành màu trắng để nổi bật trên nền xanh
          />
          <Title level={4} style={{ color: '#ffffff', margin: 0, borderLeft: '1px solid rgba(255,255,255,0.3)', paddingLeft: '16px' }}>
            Super Admin Dashboard
          </Title>
        </div>
        <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleLogout} style={{ borderRadius: 6 }}>
          Đăng xuất
        </Button>
      </Header>
      
      <Content style={{ padding: '24px 50px' }}>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic title="Tổng số Shop" value={stats?.totalTenants || 0} prefix={<ShopOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Shop đang hoạt động" value={stats?.activeTenants || 0} valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Tổng số User" value={stats?.totalUsers || 0} prefix={<UserOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Chiến dịch đã tạo" value={stats?.totalCampaigns || 0} prefix={<MessageOutlined />} />
            </Card>
          </Col>
        </Row>

        <Card 
          title="Quản lý danh sách Cửa hàng (Tenants)" 
          bordered={false} 
          style={{ borderRadius: 8 }}
          extra={
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setIsCreateModalVisible(true)}
              style={{ background: '#0d6e57', borderColor: '#0d6e57' }}
            >
              Tạo Shop mới
            </Button>
          }
        >
          <Table 
            columns={columns} 
            dataSource={tenants} 
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Content>

      {/* Modal Tạo Shop Mới */}
      <Modal
        title={createResult ? null : "🏪 Tạo Cửa Hàng (Shop) Mới"}
        open={isCreateModalVisible}
        onCancel={handleCloseCreateModal}
        footer={createResult ? (
          <Space>
            <Button icon={<CopyOutlined />} onClick={handleCopyCredentials}>
              Copy thông tin đăng nhập
            </Button>
            <Button type="primary" onClick={handleCloseCreateModal} style={{ background: '#0d6e57' }}>
              Đóng
            </Button>
          </Space>
        ) : null}
        width={600}
        destroyOnClose
      >
        {createResult ? (
          // === HIỂN THỊ KẾT QUẢ SAU KHI TẠO THÀNH CÔNG ===
          <Result
            status="success"
            title={`Tạo Shop "${createResult.shopName}" thành công!`}
            subTitle="Gửi thông tin đăng nhập bên dưới cho chủ Shop."
          >
            <Descriptions 
              bordered 
              column={1} 
              size="small"
              style={{ 
                background: '#f6ffed', 
                borderRadius: 8, 
                padding: 16,
              }}
            >
              <Descriptions.Item label="Tên Shop">
                <Text strong>{createResult.shopName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tên chủ Shop">
                <Text>{createResult.admin?.fullName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Email đăng nhập">
                <Text code copyable>{createResult.email}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Mật khẩu">
                <Text code copyable>{createResult.password}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Link đăng nhập">
                <Text code copyable>{typeof window !== 'undefined' ? window.location.origin : ''}/login</Text>
              </Descriptions.Item>
            </Descriptions>
          </Result>
        ) : (
          // === FORM TẠO SHOP ===
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreateShop}
            requiredMark={false}
            style={{ marginTop: 8 }}
            initialValues={{ plan: 'free', status: 'active' }}
          >
            <div style={{ background: '#f0f9f6', padding: 16, borderRadius: 8, marginBottom: 20, border: '1px solid #b7e4d7' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Tạo Shop mới sẽ đồng thời tạo tài khoản Admin (toàn quyền) cho chủ Shop. 
                Chủ Shop sẽ dùng email và mật khẩu bên dưới để đăng nhập.
              </Text>
            </div>

            <Form.Item 
              label={<span style={{ fontWeight: 600 }}>Tên Cửa hàng (Shop)</span>} 
              name="shopName" 
              rules={[{ required: true, message: 'Vui lòng nhập tên shop' }]}
            >
              <Input size="large" placeholder="VD: Mẹ & Bé Hà Nội" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  label={<span style={{ fontWeight: 600 }}>Họ tên chủ Shop</span>} 
                  name="fullName" 
                  rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                >
                  <Input size="large" placeholder="Nguyễn Văn A" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  label={<span style={{ fontWeight: 600 }}>SĐT liên hệ</span>} 
                  name="phone"
                >
                  <Input size="large" placeholder="0912345678" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item 
              label={<span style={{ fontWeight: 600 }}>Email đăng nhập</span>} 
              name="email" 
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Định dạng email không hợp lệ' }
              ]}
            >
              <Input size="large" placeholder="admin@shop.com" />
            </Form.Item>

            <Form.Item 
              label={<span style={{ fontWeight: 600 }}>Mật khẩu đăng nhập</span>} 
              name="password" 
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu' },
                { min: 8, message: 'Mật khẩu ít nhất 8 ký tự' }
              ]}
            >
              <Input.Password size="large" placeholder="Ít nhất 8 ký tự" />
            </Form.Item>

            <Form.Item 
              label={<span style={{ fontWeight: 600 }}>Địa chỉ</span>} 
              name="address"
            >
              <Input size="large" placeholder="Số 10, đường ABC, quận XYZ" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  label={<span style={{ fontWeight: 600 }}>Gói cước</span>} 
                  name="plan"
                >
                  <Select size="large">
                    <Option value="free">Free</Option>
                    <Option value="basic">Basic</Option>
                    <Option value="pro">Pro</Option>
                    <Option value="enterprise">Enterprise</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  label={<span style={{ fontWeight: 600 }}>Trạng thái</span>} 
                  name="status"
                >
                  <Select size="large">
                    <Option value="active">Hoạt động</Option>
                    <Option value="trial">Dùng thử</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ marginBottom: 0, marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button size="large" onClick={handleCloseCreateModal}>Hủy bỏ</Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="large" 
                  loading={createLoading}
                  style={{ background: '#0d6e57', borderColor: '#0d6e57', fontWeight: 600 }}
                >
                  Tạo Shop + Tài khoản Admin
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Modal Sửa Shop */}
      <Modal
        title="✏️ Cập nhật Cửa Hàng (Shop)"
        open={isEditModalVisible}
        onCancel={handleCloseEditModal}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateShop}
          requiredMark={false}
        >
          <Form.Item 
            label={<span style={{ fontWeight: 600 }}>Tên Cửa hàng (Shop)</span>} 
            name="name" 
            rules={[{ required: true, message: 'Vui lòng nhập tên shop' }]}
          >
            <Input size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={{ fontWeight: 600 }}>SĐT liên hệ</span>} name="phone">
                <Input size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={{ fontWeight: 600 }}>Địa chỉ</span>} name="address">
                <Input size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={{ fontWeight: 600 }}>Gói cước</span>} name="plan">
                <Select size="large">
                  <Option value="free">Free</Option>
                  <Option value="basic">Basic</Option>
                  <Option value="pro">Pro</Option>
                  <Option value="enterprise">Enterprise</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={{ fontWeight: 600 }}>Trạng thái</span>} name="status">
                <Select size="large">
                  <Option value="active">Hoạt động</Option>
                  <Option value="trial">Dùng thử</Option>
                  <Option value="suspended">Tạm khóa</Option>
                  <Option value="expired">Hết hạn</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label={<span style={{ fontWeight: 600 }}>Giới hạn User</span>} name="max_users">
                <Input type="number" size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={<span style={{ fontWeight: 600 }}>Giới hạn KH</span>} name="max_customers">
                <Input type="number" size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={<span style={{ fontWeight: 600 }}>Giới hạn ZNS</span>} name="max_zns_per_month">
                <Input type="number" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <Space>
              <Button size="large" onClick={handleCloseEditModal}>Hủy bỏ</Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                loading={editLoading}
                style={{ background: '#0d6e57', borderColor: '#0d6e57', fontWeight: 600 }}
              >
                Lưu thay đổi
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
