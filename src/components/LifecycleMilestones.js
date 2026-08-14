import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Space, Popconfirm, Card, Typography, App } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import zaloZnsApi from '../apis/zaloZnsApi'; // adjust path
import { useSelector } from 'react-redux';
import { hasPermission } from '../utils/hasPermission';

const { Title } = Typography;
const { Option } = Select;

const LifecycleMilestones = () => {
  const { user } = useSelector((state) => state.auth);
  const { message: messageApi } = App.useApp();
  const [config, setConfig] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await zaloZnsApi.getConfig();
      setConfig(data);
      setMilestones(data.scriptMilestones || []);
    } catch (error) {
      messageApi.error("Lỗi khi tải dữ liệu cấu hình ZNS");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Add/Edit Form Submit
  const handleFinish = async (values) => {
    try {
      if (editingId) {
        await zaloZnsApi.editMilestone(editingId, values);
        messageApi.success("Cập nhật kịch bản thành công!");
      } else {
        await zaloZnsApi.addMilestone(values);
        messageApi.success("Thêm mới kịch bản thành công!");
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchData(); // Reload table
    } catch (error) {
      messageApi.error(error.message || "Có lỗi xảy ra, vui lòng thử lại!");
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    try {
      await zaloZnsApi.deleteMilestone(id);
      messageApi.success("Xóa kịch bản thành công!");
      fetchData();
    } catch (error) {
      messageApi.error("Lỗi khi xóa kịch bản!");
    }
  };

  // Open Modal for Edit
  const handleEdit = (record) => {
    setEditingId(record._id);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  // Open Modal for Add
  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const columns = [
    {
      title: 'Giai đoạn',
      dataIndex: 'stage',
      key: 'stage',
      render: (text) => (text === 'PREGNANCY' ? 'Thai Kỳ' : 'Sau Sinh (Baby)'),
      width: 120,
    },
    {
      title: 'Tuần tuổi',
      dataIndex: 'weekAge',
      key: 'weekAge',
      width: 100,
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: 'Lời chào',
      dataIndex: 'stage_greetings',
      key: 'stage_greetings',
      ellipsis: true,
    },
    {
      title: 'Nội dung',
      dataIndex: 'care_content',
      key: 'care_content',
      ellipsis: true,
    },
    {
      title: 'Gợi ý sản phẩm',
      dataIndex: 'recommended_items',
      key: 'recommended_items',
      ellipsis: true,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => {
              if (!hasPermission(user, 'campaign_edit')) return messageApi.warning('Bạn không có quyền sửa kịch bản!');
              handleEdit(record);
            }} 
          />
          {hasPermission(user, 'campaign_delete') ? (
            <Popconfirm
              title="Bạn có chắc chắn muốn xóa kịch bản này?"
              onConfirm={() => handleDelete(record._id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button type="primary" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          ) : (
            <Button type="primary" danger icon={<DeleteOutlined />} size="small" onClick={(e) => {
              e.stopPropagation();
              messageApi.warning('Bạn không có quyền xóa kịch bản!');
            }}/>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card bordered={false} className="shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <Title level={4} style={{ margin: 0 }}>Quản lý Kịch bản Zalo ZNS</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            if (!hasPermission(user, 'campaign_create')) return messageApi.warning('Bạn không có quyền thêm kịch bản mới!');
            handleAdd();
          }} size="large" className="bg-blue-600">
            Thêm Kịch Bản Mới
          </Button>
        </div>

        <Table 
          columns={columns} 
          dataSource={milestones} 
          rowKey="_id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingId ? "Cập Nhật Kịch Bản" : "Thêm Kịch Bản Mới"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          className="mt-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="stage"
              label="Giai đoạn"
              rules={[{ required: true, message: 'Vui lòng chọn giai đoạn!' }]}
            >
              <Select placeholder="Chọn giai đoạn">
                <Option value="PREGNANCY">Thai Kỳ</Option>
                <Option value="BABY">Sau Sinh (Baby)</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="weekAge"
              label="Tuần tuổi (mốc gửi)"
              rules={[{ required: true, message: 'Vui lòng nhập số tuần!' }]}
            >
              <InputNumber min={0} className="w-full" placeholder="Ví dụ: 12" />
            </Form.Item>
          </div>

          <Form.Item
            name="title"
            label="Tiêu đề tin nhắn"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
          >
            <Input placeholder="Ví dụ: Khám thai tuần 12" maxLength={50} showCount />
          </Form.Item>

          <Form.Item
            name="stage_greetings"
            label="Lời chào (stage_greetings)"
            rules={[{ required: true, message: 'Vui lòng nhập lời chào!' }]}
          >
            <Input.TextArea rows={2} placeholder="Ví dụ: Chào mẹ, chúc mẹ tuần mới vui vẻ!" maxLength={100} showCount />
          </Form.Item>

          <Form.Item
            name="care_content"
            label="Nội dung chăm sóc (care_content)"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung!' }]}
          >
            <Input.TextArea rows={3} placeholder="Ví dụ: Tuần 12 là thời điểm vàng để đo độ mờ da gáy..." maxLength={200} showCount />
          </Form.Item>

          <Form.Item
            name="recommended_items"
            label="Gợi ý sản phẩm (recommended_items)"
            rules={[{ required: true, message: 'Vui lòng nhập gợi ý sản phẩm!' }]}
          >
            <Input.TextArea rows={2} placeholder="Ví dụ: Mẹ tiếp tục uống axit folic và sắt nha." maxLength={150} showCount />
          </Form.Item>

          <Form.Item className="text-right mb-0">
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">
                {editingId ? "Lưu Thay Đổi" : "Thêm Mới"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default LifecycleMilestones;
