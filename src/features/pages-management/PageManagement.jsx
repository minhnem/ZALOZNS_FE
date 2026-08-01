import React, { useState } from 'react';
import { Table, Tag, Button, Modal, Form, Input, Upload, message, Space, Badge, Popconfirm, Switch } from 'antd';
import { PlusOutlined, UploadOutlined, LinkOutlined, FilePdfOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import PageTitle from '@/components/PageTitle';

const PageManagement = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null);

  const [form] = Form.useForm();
  const [tokenForm] = Form.useForm();

  // Mock data for the table
  const [data, setData] = useState([
    {
      key: '1',
      source: 'web',
      customerName: 'Công Ty ABC',
      pageUrl: 'https://facebook.com/abc',
      pdfName: 'kich_ban_abc.pdf',
      status: 'active',
      pageId: '102062945533916',
    },
    {
      key: '2',
      source: 'admin',
      customerName: 'Shop Quần Áo XYZ',
      pageUrl: 'https://facebook.com/xyz',
      pdfName: 'kich_ban_xyz.pdf',
      status: 'pending',
      pageId: '',
    },
  ]);

  const openTokenModal = (record) => {
    setSelectedPage(record);
    tokenForm.setFieldsValue({
      pageId: record.pageId || '',
      pageToken: '',
      isActive: record.status === 'active',
    });
    setIsTokenModalOpen(true);
  };

  const closeTokenModal = () => {
    setIsTokenModalOpen(false);
    setSelectedPage(null);
    tokenForm.resetFields();
  };

  const handleTokenSubmit = (values) => {
    setData((prevData) =>
      prevData.map((item) =>
        item.key === selectedPage.key
          ? { ...item, status: values.isActive ? 'active' : 'pending', pageId: values.pageId }
          : item
      )
    );
    message.success('Cấu hình Token thành công! Trang đã chuyển sang trạng thái Hoạt động.');
    closeTokenModal();
  };

  const handleDelete = (key) => {
    setData((prev) => prev.filter(item => item.key !== key));
    message.success('Đã xóa cấu hình Fanpage.');
  };

  const columns = [
    {
      title: 'Nguồn đăng ký',
      dataIndex: 'source',
      key: 'source',
      render: (text) => (
        <Tag color={text === 'web' ? 'blue' : 'green'}>
          {text === 'web' ? 'Khách Đăng Ký' : 'Admin Thêm'}
        </Tag>
      ),
    },
    {
      title: 'Tên Khách Hàng / Doanh Nghiệp',
      dataIndex: 'customerName',
      key: 'customerName',
      className: 'font-semibold',
    },
    {
      title: 'URL Fanpage',
      dataIndex: 'pageUrl',
      key: 'pageUrl',
      render: (text) => (
        <a href={text} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          <LinkOutlined className="mr-1" /> Fanpage
        </a>
      ),
    },
    {
      title: 'Kịch bản PDF',
      dataIndex: 'pdfName',
      key: 'pdfName',
      render: (text) => (
        <Tag icon={<FilePdfOutlined />} color="default">
          {text}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge 
          status={status === 'active' ? 'success' : 'warning'} 
          text={status === 'active' ? 'Đang Hoạt Động' : 'Chờ Token'} 
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="primary" size="small" icon={<KeyOutlined />} onClick={() => openTokenModal(record)}>
            Cấu hình Token
          </Button>
          <Button type="text" size="small" icon={<EditOutlined />} className="text-blue-500" />
          <Popconfirm title="Bạn có chắc chắn muốn xóa cấu hình này?" onConfirm={() => handleDelete(record.key)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const onFinish = (values) => {
    console.log('Form Submitted:', values);
    message.success('Thêm mới cấu hình Fanpage thành công!');
    setIsModalVisible(false);
    form.resetFields();
  };

  const uploadProps = {
    beforeUpload: (file) => {
      const isPdf = file.type === 'application/pdf';
      if (!isPdf) {
        message.error('Bạn chỉ có thể tải lên file PDF!');
      }
      return false; // Prevent automatic upload
    },
    accept: '.pdf',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <PageTitle title="Quản Lý Đăng Ký & Kịch Bản Fanpage" />
        <Button type="primary" icon={<PlusOutlined />} onClick={showModal} size="large">
          Thêm Mới Cấu Hình
        </Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={data} 
        pagination={{ pageSize: 10 }}
        className="w-full overflow-x-auto"
      />

      {/* Add New Configuration Modal */}
      <Modal
        title="Thêm Mới Cấu Hình Fanpage"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
        forceRender
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="mt-4"
        >
          <Form.Item
            name="customerName"
            label="Tên Khách Hàng / Doanh Nghiệp"
            rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng hoặc doanh nghiệp!' }]}
          >
            <Input placeholder="Nhập tên khách hàng" />
          </Form.Item>

          <Form.Item
            name="pageUrl"
            label="URL Fanpage"
            rules={[
              { required: true, message: 'Vui lòng nhập URL Fanpage!' },
              { type: 'url', message: 'URL không hợp lệ!' }
            ]}
          >
            <Input placeholder="https://facebook.com/..." />
          </Form.Item>

          <Form.Item
            name="pdfFile"
            label="Kịch bản PDF"
            rules={[{ required: true, message: 'Vui lòng tải lên kịch bản PDF!' }]}
          >
            <Upload {...uploadProps} maxCount={1}>
              <Button icon={<UploadOutlined />}>Click để Tải lên (.pdf)</Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="pageToken"
            label="Page Access Token"
          >
            <Input.TextArea rows={4} placeholder="Nhập Page Access Token (Nếu có sẵn)" />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={handleCancel}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Lưu Cấu Hình
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Token Configuration Modal */}
      <Modal
        title={`Cấu hình Page Access Token - ${selectedPage?.customerName || ''}`}
        open={isTokenModalOpen}
        onCancel={closeTokenModal}
        footer={null}
        width={600}
        forceRender
      >
        {selectedPage && (
          <div className="mb-4 p-4 bg-gray-50 rounded-md text-sm">
            <p><strong>URL Fanpage:</strong> <a href={selectedPage.pageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500">{selectedPage.pageUrl}</a></p>
            <p className="mt-2"><strong>Trạng thái hiện tại:</strong> {selectedPage.status === 'active' ? <span className="text-green-600 font-semibold">Đang Hoạt Động</span> : <span className="text-yellow-600 font-semibold">Chờ Token</span>}</p>
          </div>
        )}

        <Form
          form={tokenForm}
          layout="vertical"
          onFinish={handleTokenSubmit}
        >
          <Form.Item
            name="pageId"
            label="Page ID"
            rules={[{ required: true, message: 'Vui lòng nhập Page ID!' }]}
          >
            <Input placeholder="VD: 102062945533916" />
          </Form.Item>

          <Form.Item
            name="pageToken"
            label="Page Access Token"
            rules={[{ required: true, message: 'Vui lòng nhập Page Access Token!' }]}
          >
            <Input.TextArea rows={5} placeholder="Nhập chuỗi token dài từ Meta Developer..." />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Trạng thái hoạt động"
            valuePropName="checked"
          >
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm dừng" />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={closeTokenModal}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Cập nhật Token
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default PageManagement;
