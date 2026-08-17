import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, Card, Button, Table, Tag, Space, Input, Modal, 
  Form, Select, InputNumber, Divider, Popconfirm, Tooltip, Row, Col, App
} from 'antd';
import { 
  SyncOutlined, SearchOutlined, EyeOutlined, PlusOutlined, 
  EditOutlined, DeleteOutlined, ThunderboltOutlined, MinusCircleOutlined, ClearOutlined
} from '@ant-design/icons';
import DashboardLayout from '../../layouts/DashboardLayout';
import handleAPI from '../../apis/handleAPI';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/hasPermission';
import { useRouter } from 'next/router';

const { Title, Text } = Typography;

// Known SYSTEM variables
const SYSTEM_VARS = {
  'customer_name': 'Tên khách hàng',
  'phone': 'Số điện thoại',
  'product_name': 'Tên sản phẩm',
  'refill_date': 'Ngày dự kiến hết',
  'baby_name': 'Tên bé'
};

const LIFECYCLE_VARS = {
  'stage_greetings': 'Lời chào theo giai đoạn',
  'care_content': 'Nội dung chăm sóc',
  'recommended_items': 'Gợi ý sản phẩm'
};

// Detect {param} patterns from content string
function detectParamsFromContent(content) {
  if (!content) return [];
  const matches = content.match(/\{(\w+)\}/g);
  if (!matches) return [];
  const names = [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
  return names.map(name => {
    if (SYSTEM_VARS[name]) return { name, label: SYSTEM_VARS[name], type: 'SYSTEM' };
    if (LIFECYCLE_VARS[name]) return { name, label: LIFECYCLE_VARS[name], type: 'LIFECYCLE' };
    return { name, label: name, type: 'CUSTOM' };
  });
}

// Shared component: param config table inside a form
function ParamConfigSection({ form }) {
  const handleDetectParams = () => {
    const content = form.getFieldValue('content');
    const detected = detectParamsFromContent(content);
    if (detected.length === 0) {
      message.info('Không tìm thấy biến {param} nào trong nội dung mẫu.');
      return;
    }
    // Merge with existing: keep existing config, add new ones
    const existing = form.getFieldValue('params') || [];
    const existingNames = existing.map(p => p.name);
    const merged = [
      ...existing,
      ...detected.filter(d => !existingNames.includes(d.name))
    ];
    form.setFieldsValue({ params: merged });
    messageApi.success(`Đã phát hiện ${detected.length} biến, thêm ${merged.length - existing.length} biến mới.`);
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text strong style={{ fontSize: 14 }}>Cấu hình biến động (Dynamic Fields):</Text>
        <Button 
          type="dashed" 
          icon={<ThunderboltOutlined />} 
          onClick={handleDetectParams}
          style={{ color: '#d97706' }}
        >
          Tự động detect biến từ nội dung
        </Button>
      </div>

      <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <Form.List name="params">
          {(fields, { add, remove }) => (
            <>
              {fields.length > 0 && (
                <Row gutter={8} style={{ marginBottom: 8, paddingLeft: 4 }}>
                  <Col span={7}><Text type="secondary" strong>Tên biến</Text></Col>
                  <Col span={7}><Text type="secondary" strong>Nhãn hiển thị</Text></Col>
                  <Col span={7}><Text type="secondary" strong>Loại</Text></Col>
                  <Col span={3}></Col>
                </Row>
              )}
              {fields.map(({ key, name, ...restField }) => (
                <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                  <Col span={7}>
                    <Form.Item {...restField} name={[name, 'name']} style={{ marginBottom: 0 }} rules={[{ required: true, message: 'Bắt buộc' }]}>
                      <Input placeholder="VD: voucher_code" />
                    </Form.Item>
                  </Col>
                  <Col span={7}>
                    <Form.Item {...restField} name={[name, 'label']} style={{ marginBottom: 0 }} rules={[{ required: true, message: 'Bắt buộc' }]}>
                      <Input placeholder="VD: Mã giảm giá" />
                    </Form.Item>
                  </Col>
                  <Col span={7}>
                    <Form.Item {...restField} name={[name, 'type']} style={{ marginBottom: 0 }} rules={[{ required: true }]}>
                      <Select options={[
                        { label: '🔒 SYSTEM (tự động)', value: 'SYSTEM' },
                        { label: '✏️ CUSTOM (nhập tay)', value: 'CUSTOM' },
                        { label: '🔄 LIFECYCLE (kịch bản)', value: 'LIFECYCLE' }
                      ]} />
                    </Form.Item>
                  </Col>
                  <Col span={3} style={{ textAlign: 'center' }}>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444', fontSize: 18 }} />
                  </Col>
                </Row>
              ))}
              <Button type="dashed" onClick={() => add({ name: '', label: '', type: 'CUSTOM' })} block icon={<PlusOutlined />} style={{ marginTop: 8 }}>
                Thêm biến
              </Button>
            </>
          )}
        </Form.List>
        {fields => fields?.length === 0 && (
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 16 }}>
            Chưa có biến nào. Nhập nội dung mẫu rồi bấm "Tự động detect" hoặc thêm thủ công.
          </Text>
        )}
      </div>
    </div>
  );
}

export default function ZnsTemplatesPage() {
  const { user } = useSelector((state) => state.auth);
  const { message: messageApi } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [templates, setTemplates] = useState([]);
  
  const router = useRouter();

  // Modal states
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!user) return; // Do nothing if logging out
    if (!hasPermission(user, 'zns_view')) {
      messageApi.warning('Bạn không có quyền xem mẫu ZNS!');
      router.replace('/dashboard');
      return;
    }
    fetchTemplates();
  }, [user, router, messageApi]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await handleAPI('/api/zns-templates', null, 'get');
      setTemplates(res.map(item => ({ ...item, key: item._id })));
    } catch (error) {
      messageApi.error('Lấy danh sách template thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncLoading(true);
      const res = await handleAPI('/api/zns-templates/sync', null, 'post');
      messageApi.success(res.message || 'Đồng bộ thành công!');
      fetchTemplates();
    } catch (error) {
      messageApi.error(error.message || 'Lỗi đồng bộ từ Zalo OA');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleView = (record) => {
    setSelectedTemplate(record);
    setIsViewModalVisible(true);
  };

  const handleAddTemplate = async (values) => {
    try {
      await handleAPI('/api/zns-templates', values, 'post');
      messageApi.success('Thêm template thành công!');
      setIsAddModalVisible(false);
      addForm.resetFields();
      fetchTemplates();
    } catch (error) {
      messageApi.error(error.message || 'Lỗi khi thêm template');
    }
  };

  const handleOpenEdit = (record) => {
    setEditingId(record._id);
    editForm.setFieldsValue({
      template_id: record.template_id,
      name: record.name,
      type: record.type,
      price: record.price,
      status: record.status,
      content: record.content,
      params: record.params || []
    });
    setIsEditModalVisible(true);
  };

  const handleEditTemplate = async (values) => {
    try {
      await handleAPI(`/api/zns-templates/${editingId}`, values, 'put');
      messageApi.success('Cập nhật template thành công!');
      setIsEditModalVisible(false);
      editForm.resetFields();
      fetchTemplates();
    } catch (error) {
      messageApi.error(error.message || 'Lỗi khi cập nhật template');
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await handleAPI(`/api/zns-templates/${id}`, null, 'delete');
      messageApi.success('Xóa template thành công!');
      fetchTemplates();
    } catch (error) {
      messageApi.error(error.message || 'Lỗi khi xóa template');
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchSearch = !searchText || t.name?.toLowerCase().includes(searchText.toLowerCase()) || String(t.template_id).includes(searchText);
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    {
      title: 'Template ID',
      dataIndex: 'template_id',
      key: 'template_id',
      width: 120,
      render: (text) => <Text strong style={{ color: '#0d6e57' }}>{text}</Text>
    },
    {
      title: 'Tên Template',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: 'Loại ZNS',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (text) => <Tag>{text}</Tag>
    },
    {
      title: 'Biến động',
      dataIndex: 'params',
      key: 'params',
      width: 120,
      render: (params) => {
        if (!params || params.length === 0) return <Text type="secondary">—</Text>;
        const system = params.filter(p => p.type === 'SYSTEM').length;
        const custom = params.filter(p => p.type === 'CUSTOM').length;
        const lifecycle = params.filter(p => p.type === 'LIFECYCLE').length;
        return (
          <Space direction="vertical" size={0}>
            {system > 0 && <Tag color="blue">{system} SYSTEM</Tag>}
            {custom > 0 && <Tag color="orange">{custom} CUSTOM</Tag>}
            {lifecycle > 0 && <Tag color="purple">{lifecycle} LIFECYCLE</Tag>}
          </Space>
        );
      }
    },
    {
      title: 'Giá/Tin',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price) => `${(price || 0).toLocaleString('vi-VN')} VNĐ`
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => {
        if (status === 'APPROVED') return <Tag color="green">Đã duyệt</Tag>;
        if (status === 'PENDING') return <Tag color="orange">Đang chờ</Tag>;
        if (status === 'REJECTED') return <Tag color="red">Từ chối</Tag>;
        return <Tag>{status}</Tag>;
      }
    },
    {
      title: 'Người tạo / Cập nhật',
      key: 'audit',
      width: 200,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div style={{ marginBottom: 4 }}><Text type="secondary">Tạo:</Text> <Text strong>{record.created_by?.fullName || 'Hệ thống'}</Text></div>
          <div><Text type="secondary">Sửa:</Text> <Text strong>{record.updated_by?.fullName || 'Hệ thống'}</Text></div>
        </div>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Tooltip title="Xem chi tiết">
            <Button type="text" style={{ color: '#0ea5e9' }} icon={<EyeOutlined />} size="small" onClick={() => handleView(record)}>Xem</Button>
          </Tooltip>
          <Tooltip title="Sửa template">
            <Button type="text" icon={<EditOutlined />} size="small" style={{ color: '#d97706' }} onClick={() => {
              if (!hasPermission(user, 'zns_edit')) return messageApi.warning('Bạn không có quyền sửa template!');
              handleOpenEdit(record);
            }}>Sửa</Button>
          </Tooltip>
          {hasPermission(user, 'zns_delete') ? (
            <Popconfirm title="Bạn có chắc chắn muốn xóa?" onConfirm={() => handleDeleteTemplate(record._id)} okText="Xóa" cancelText="Hủy">
              <Button type="text" icon={<DeleteOutlined />} size="small" danger>Xóa</Button>
            </Popconfirm>
          ) : (
            <Button type="text" icon={<DeleteOutlined />} size="small" danger onClick={(e) => {
              e.stopPropagation();
              messageApi.warning('Bạn không có quyền xóa template!');
            }}>Xóa</Button>
          )}
        </Space>
      )
    }
  ];

  // Template Form Fields
  const TemplateFormFields = ({ form }) => (
    <>
      <Form.Item label="Template ID" name="template_id" rules={[{ required: true, message: 'Vui lòng nhập Template ID' }]}>
        <Input size="large" placeholder="Nhập ID template từ Zalo OA" />
      </Form.Item>
      <Form.Item label="Tên Template" name="name" rules={[{ required: true, message: 'Vui lòng nhập tên template' }]}>
        <Input size="large" placeholder="Tên mẫu tin nhắn" />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Loại ZNS" name="type" initialValue="CSKH">
            <Select size="large" options={[
              { label: 'CSKH', value: 'CSKH' },
              { label: 'Khuyến mãi', value: 'Khuyến mãi' },
              { label: 'OTP', value: 'OTP' },
              { label: 'Giao dịch', value: 'Giao dịch' }
            ]} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Trạng thái" name="status" initialValue="PENDING">
            <Select size="large" options={[
              { label: 'Đã duyệt', value: 'APPROVED' },
              { label: 'Đang chờ duyệt', value: 'PENDING' },
              { label: 'Từ chối', value: 'REJECTED' }
            ]} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="Giá cước / tin (VNĐ)" name="price" initialValue={0}>
        <InputNumber size="large" style={{ width: '100%' }} min={0} step={50}
          formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={v => v.replace(/\$\s?|(,*)/g, '')}
        />
      </Form.Item>
      <Form.Item 
        label="Nội dung mẫu" 
        name="content"
        extra="Sử dụng {tên_biến} để đánh dấu biến động. VD: Chào {customer_name}, mã giảm giá {voucher_code}"
      >
        <Input.TextArea rows={5} placeholder="Chào mẹ {customer_name}, bé nhà mình sắp hết bỉm rồi đấy ạ! Nhập mã {voucher_code} để được giảm 10%..." />
      </Form.Item>

      <Divider style={{ margin: '12px 0' }} />
      <ParamConfigSection form={form} />
    </>
  );

  return (
    <DashboardLayout title="Quản lý Template ZNS">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Title level={3} style={{ margin: 0, color: '#111827' }}>QUẢN LÝ TEMPLATE ZNS</Title>
            <Text type="secondary">Đồng bộ và quản lý các mẫu tin nhắn từ Zalo OA</Text>
          </div>
          <Space>
            <Button icon={<PlusOutlined />} size="large" onClick={() => {
              if (!hasPermission(user, 'zns_create')) return messageApi.warning('Bạn không có quyền thêm mới template!');
              setIsAddModalVisible(true);
            }}>Thêm Template</Button>
            <Button 
              type="primary" icon={<SyncOutlined spin={syncLoading} />} 
              onClick={() => {
                if (!hasPermission(user, 'zns_create') && !hasPermission(user, 'zns_edit')) return messageApi.warning('Bạn không có quyền đồng bộ template!');
                handleSync();
              }} 
              loading={syncLoading} size="large"
              style={{ background: '#0d6e57', borderColor: '#0d6e57' }}
            >
              Đồng bộ từ Zalo OA
            </Button>
          </Space>
        </div>

        <Card style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
            <Input 
              placeholder="Tìm kiếm theo ID hoặc Tên template..." 
              prefix={<SearchOutlined />} style={{ width: 350 }} size="large"
              value={searchText} onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Select 
              placeholder="Lọc trạng thái" size="large" style={{ width: 200 }}
              value={statusFilter} onChange={(val) => setStatusFilter(val)} allowClear
              options={[
                { label: 'Đã duyệt', value: 'APPROVED' },
                { label: 'Đang chờ duyệt', value: 'PENDING' },
                { label: 'Từ chối', value: 'REJECTED' }
              ]}
            />
            {(searchText || statusFilter) && (
              <Button 
                size="large"
                icon={<ClearOutlined />} 
                onClick={() => {
                  setSearchText('');
                  setStatusFilter(null);
                }}
              >
                Hủy lọc
              </Button>
            )}
          </div>
          <Table columns={columns} dataSource={filteredTemplates} loading={loading} rowKey="_id" pagination={{ pageSize: 10 }} bordered />
        </Card>
      </div>

      {/* VIEW DETAIL MODAL */}
      <Modal
        title={<span style={{ color: '#0d6e57' }}>Chi tiết Template: {selectedTemplate?.name}</span>}
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[<Button key="close" onClick={() => setIsViewModalVisible(false)}>Đóng</Button>]}
        width={650}
      >
        {selectedTemplate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
              <Text type="secondary">Template ID:</Text>
              <Text strong>{selectedTemplate.template_id}</Text>
              
              <Text type="secondary">Trạng thái:</Text>
              <div>
                {selectedTemplate.status === 'APPROVED' && <Tag color="green">Đã duyệt</Tag>}
                {selectedTemplate.status === 'PENDING' && <Tag color="orange">Đang chờ duyệt</Tag>}
                {selectedTemplate.status === 'REJECTED' && <Tag color="red">Từ chối</Tag>}
              </div>

              <Text type="secondary">Loại ZNS:</Text>
              <Text>{selectedTemplate.type}</Text>

              <Text type="secondary">Giá cước/tin:</Text>
              <Text>{(selectedTemplate.price || 0).toLocaleString('vi-VN')} VNĐ</Text>

              <Text type="secondary">Đồng bộ lần cuối:</Text>
              <Text>{selectedTemplate.last_synced_at ? new Date(selectedTemplate.last_synced_at).toLocaleString('vi-VN') : 'Chưa đồng bộ'}</Text>
            </div>
            
            <Divider style={{ margin: '8px 0' }} />

            {/* Params table */}
            {selectedTemplate.params && selectedTemplate.params.length > 0 && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Biến động ({selectedTemplate.params.length} biến):</Text>
                <div style={{ background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 13, color: '#6b7280' }}>Tên biến</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 13, color: '#6b7280' }}>Nhãn</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 13, color: '#6b7280' }}>Loại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTemplate.params.map((p, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '8px 12px' }}><code style={{ background: '#ecfdf5', padding: '2px 6px', borderRadius: 4 }}>{`{${p.name}}`}</code></td>
                          <td style={{ padding: '8px 12px' }}>{p.label}</td>
                          <td style={{ padding: '8px 12px' }}>
                            {p.type === 'SYSTEM' && <Tag color="blue">🔒 SYSTEM</Tag>}
                            {p.type === 'CUSTOM' && <Tag color="orange">✏️ CUSTOM</Tag>}
                            {p.type === 'LIFECYCLE' && <Tag color="purple">🔄 LIFECYCLE</Tag>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Divider style={{ margin: '8px 0' }} />
            
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Nội dung mẫu:</Text>
              <div style={{ 
                background: '#f3f4f6', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap',
                border: '1px solid #e5e7eb', fontFamily: 'monospace'
              }}>
                {selectedTemplate.content || 'Không có nội dung'}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ADD TEMPLATE MODAL */}
      <Modal
        title="Thêm Template Mới"
        open={isAddModalVisible}
        onCancel={() => { setIsAddModalVisible(false); addForm.resetFields(); }}
        footer={null}
        destroyOnClose
        width={700}
      >
        <Form form={addForm} layout="vertical" onFinish={handleAddTemplate} style={{ marginTop: 24 }}>
          <TemplateFormFields form={addForm} />
          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0, marginTop: 32 }}>
            <Space>
              <Button onClick={() => { setIsAddModalVisible(false); addForm.resetFields(); }}>Hủy bỏ</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#0d6e57' }}>Lưu Template</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* EDIT TEMPLATE MODAL */}
      <Modal
        title="Sửa Template"
        open={isEditModalVisible}
        onCancel={() => { setIsEditModalVisible(false); editForm.resetFields(); }}
        footer={null}
        destroyOnClose
        width={700}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditTemplate} style={{ marginTop: 24 }}>
          <TemplateFormFields form={editForm} />
          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0, marginTop: 32 }}>
            <Space>
              <Button onClick={() => { setIsEditModalVisible(false); editForm.resetFields(); }}>Hủy bỏ</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#0d6e57' }}>Cập nhật</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
