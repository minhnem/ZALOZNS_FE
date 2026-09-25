import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Checkbox, Space, Popconfirm, Tag, Row, Col, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import handleAPI from '../../apis/handleAPI';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/hasPermission';

const PERMISSION_GROUPS = [
  {
    title: 'Hệ thống (System)',
    permissions: [
      { label: 'Toàn quyền (Admin)', value: '*' },
      { label: 'Xem cài đặt hệ thống', value: 'system_view' },
      { label: 'Tạo nhóm quyền mới', value: 'system_create' },
      { label: 'Quản trị (Tạo User, Phân quyền)', value: 'system_edit' },
      { label: 'Xóa dữ liệu (User, Vai trò)', value: 'system_delete' },
    ]
  },
  {
    title: 'Dữ liệu (Data)',
    permissions: [
      { label: 'Xem dữ liệu', value: 'data_view' },
      { label: 'Thêm dữ liệu', value: 'data_create' },
      { label: 'Sửa dữ liệu', value: 'data_edit' },
      { label: 'Xóa dữ liệu', value: 'data_delete' },
    ]
  },
  {
    title: 'Zalo ZNS',
    permissions: [
      { label: 'Xem mẫu ZNS', value: 'zns_view' },
      { label: 'Tạo mẫu ZNS', value: 'zns_create' },
      { label: 'Sửa mẫu ZNS', value: 'zns_edit' },
      { label: 'Xóa mẫu ZNS', value: 'zns_delete' },
    ]
  },
  {
    title: 'Chiến dịch (Campaign)',
    permissions: [
      { label: 'Xem chiến dịch', value: 'campaign_view' },
      { label: 'Tạo chiến dịch', value: 'campaign_create' },
      { label: 'Sửa chiến dịch', value: 'campaign_edit' },
      { label: 'Xóa chiến dịch', value: 'campaign_delete' },
    ]
  },
  {
    title: 'Báo cáo (Dashboard)',
    permissions: [
      { label: 'Xem báo cáo', value: 'dashboard_view' },
    ]
  },
  {
    title: 'Tự động hóa (Automation)',
    permissions: [
      { label: 'Thực hiện tự động hóa', value: 'automation_execute' },
    ]
  }
];

const PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions);

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form] = Form.useForm();

  const { message: messageApi } = App.useApp();

  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await handleAPI('/api/roles', null, 'get');
      setRoles(res || []);
    } catch (error) {
      messageApi.error('Lỗi lấy danh sách vai trò');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role = null) => {
    setEditingRole(role);
    if (role) {
      form.setFieldsValue({
        name: role.name,
        description: role.description,
        permissions: role.permissions || [],
      });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleSave = async (values) => {
    try {
      if (editingRole) {
        await handleAPI(`/api/roles/${editingRole._id}`, values, 'put');
        messageApi.success('Cập nhật vai trò thành công');
      } else {
        await handleAPI('/api/roles', values, 'post');
        messageApi.success('Tạo vai trò thành công');
      }
      setIsModalVisible(false);
      fetchRoles();
    } catch (error) {
      messageApi.error('Lỗi khi lưu vai trò');
    }
  };

  const handleDelete = async (id) => {
    try {
      await handleAPI(`/api/roles/${id}`, null, 'delete');
      messageApi.success('Đã xóa vai trò');
      fetchRoles();
    } catch (error) {
      messageApi.error('Lỗi xóa vai trò');
    }
  };

  const columns = [
    { title: 'Tên Vai Trò', dataIndex: 'name', key: 'name', render: text => <strong>{text}</strong> },
    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
    {
      title: 'Quyền hạn',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (_, record) => {
        if (!record.permissions || record.permissions.length === 0) return <Tag>Không có quyền</Tag>;
        if (record.permissions.includes('*')) return <Tag color="red">Toàn quyền (Admin)</Tag>;
        return record.permissions.map(p => <Tag key={p} color="blue">{PERMISSIONS.find(x => x.value === p)?.label || p}</Tag>);
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              if (!hasPermission(user, 'system_edit')) {
                return messageApi.warning('Bạn không có quyền sửa vai trò!');
              }
              handleOpenModal(record);
            }}
          />
          {hasPermission(user, 'system_delete') ? (
            <Popconfirm
              title="Xóa vai trò này?"
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
                messageApi.warning('Bạn không có quyền xóa vai trò!');
              }}
            />
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            if (!hasPermission(user, 'system_create')) {
              return messageApi.warning('Bạn không có quyền thêm mới vai trò!');
            }
            handleOpenModal();
          }}
        >
          Tạo Vai Trò Mới
        </Button>
      </div>

      <Table columns={columns} dataSource={roles} rowKey="_id" loading={loading} />

      <Modal
        title={editingRole ? 'Sửa Vai Trò' : 'Tạo Vai Trò Mới'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Tên vai trò" rules={[{ required: true, message: 'Nhập tên vai trò' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="permissions" label="Quyền hạn">
            <Checkbox.Group style={{ width: '100%' }}>
              <Row gutter={[24, 24]}>
                {PERMISSION_GROUPS.map(group => (
                  <Col span={8} key={group.title}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#0e7a44' }}>{group.title}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {group.permissions.map(p => (
                        <Checkbox key={p.value} value={p.value}>{p.label}</Checkbox>
                      ))}
                    </div>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
