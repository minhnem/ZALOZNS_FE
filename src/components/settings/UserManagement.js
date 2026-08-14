import React, { useState, useEffect } from 'react';
import { Table, Button, Select, Space, Popconfirm, Tag, App, Modal, Form, Input, Row, Col } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import handleAPI from '../../apis/handleAPI';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/hasPermission';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();

  const { user } = useSelector((state) => state.auth);
  const { message: messageApi } = App.useApp();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        handleAPI('/api/users', null, 'get'),
        handleAPI('/api/roles', null, 'get')
      ]);
      setUsers(usersRes || []);
      setRoles(rolesRes || []);
    } catch (error) {
      messageApi.error('Lỗi lấy dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId, roleId) => {
    try {
      await handleAPI(`/api/users/${userId}/role`, { role_id: roleId }, 'put');
      messageApi.success('Cập nhật vai trò thành công');
      fetchData();
    } catch (error) {
      messageApi.error('Lỗi cập nhật vai trò');
    }
  };

  const handleAddUser = async (values) => {
    try {
      await handleAPI('/api/users', values, 'post');
      messageApi.success('Tạo tài khoản thành công!');
      setIsAddModalVisible(false);
      addForm.resetFields();
      fetchData();
    } catch (error) {
      messageApi.error(error.message || 'Lỗi khi tạo tài khoản');
    }
  };

  const handleDelete = async (id) => {
    try {
      await handleAPI(`/api/users/${id}`, null, 'delete');
      messageApi.success('Đã xóa người dùng');
      fetchData();
    } catch (error) {
      messageApi.error('Lỗi xóa người dùng');
    }
  };

  const columns = [
    { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { 
      title: 'Vai trò (Role)', 
      key: 'role',
      render: (_, record) => (
        <Select
          style={{ width: 200 }}
          value={record.role_id?._id}
          onChange={(val) => {
            if (!hasPermission(user, 'system_edit')) {
              return messageApi.warning('Bạn không có quyền sửa vai trò!');
            }
            handleChangeRole(record._id, val);
          }}
          options={roles.map(r => ({ value: r._id, label: r.name }))}
          placeholder="Chọn vai trò"
        />
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space>
          {hasPermission(user, 'system_delete') ? (
            <Popconfirm 
              title="Xóa tài khoản này?" 
              onConfirm={() => handleDelete(record._id)}
            >
              <Button danger icon={<DeleteOutlined />} />
            </Popconfirm>
          ) : (
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              onClick={(e) => {
                e.stopPropagation();
                messageApi.warning('Bạn không có quyền xóa tài khoản!');
              }}
            />
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => {
            if (!hasPermission(user, 'system_edit')) {
              return messageApi.warning('Bạn không có quyền thêm tài khoản!');
            }
            setIsAddModalVisible(true);
          }}
          style={{ background: '#0d6e57' }}
        >
          Thêm tài khoản
        </Button>
      </div>

      <Table columns={columns} dataSource={users} rowKey="_id" loading={loading} />

      <Modal
        title="Thêm tài khoản nhân sự"
        open={isAddModalVisible}
        onCancel={() => { setIsAddModalVisible(false); addForm.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" onFinish={handleAddUser} style={{ marginTop: 24 }}>
          <Form.Item label="Họ tên" name="fullName" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
            <Input size="large" placeholder="Nhập họ và tên" />
          </Form.Item>
          
          <Form.Item label="Email đăng nhập" name="email" rules={[{ required: true, message: 'Vui lòng nhập email', type: 'email' }]}>
            <Input size="large" placeholder="Nhập email" />
          </Form.Item>

          <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu (ít nhất 8 ký tự)', min: 8 }]}>
            <Input.Password size="large" placeholder="Nhập mật khẩu" />
          </Form.Item>

          <Form.Item label="Vai trò" name="role_id">
            <Select size="large" placeholder="Chọn vai trò (có thể để trống)">
              {roles.map(r => (
                <Select.Option key={r._id} value={r._id}>{r.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0, marginTop: 32 }}>
            <Space>
              <Button onClick={() => { setIsAddModalVisible(false); addForm.resetFields(); }}>Hủy bỏ</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#0d6e57' }}>Tạo tài khoản</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
