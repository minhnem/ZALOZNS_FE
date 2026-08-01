import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, Tag, Space, Card, Typography, Radio, InputNumber, message, Popconfirm } from 'antd';
import handleAPI from '../../apis/handleAPI';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DashboardLayout from '../../layouts/DashboardLayout';

const { Title } = Typography;

// Dữ liệu sẽ được fetch từ API

const UsersPage = () => {
  const [data, setData] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [babyInputType, setBabyInputType] = useState('dob');
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await handleAPI('/api/customers', null, 'get');
      setData(res.map(item => ({ ...item, key: item._id })));
    } catch (error) {
      console.log(error);
      message.error('Lấy dữ liệu thất bại');
    }
  };

  const showModal = () => {
    setEditingId(null);
    form.resetFields();
    setBabyInputType('dob');
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record._id);
    
    let computedPregnancyWeeks = null;
    if (record.edd) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const edd = new Date(record.edd);
      edd.setHours(0, 0, 0, 0);
      const diffTime = edd.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      computedPregnancyWeeks = 40 - Math.floor(diffDays / 7);
      if (computedPregnancyWeeks < 0) computedPregnancyWeeks = 0;
    }

    // Khôi phục giá trị form
    const formValues = {
      name: record.name,
      phone: record.phone,
      baby_name: record.baby_name,
      status: record.status || 'active',
      pregnancy_weeks: computedPregnancyWeeks,
      baby_dob: record.baby_dob ? dayjs(record.baby_dob) : null,
    };
    
    setBabyInputType('dob');
    form.setFieldsValue(formValues);
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await handleAPI(`/api/customers/${id}`, null, 'delete');
      message.success('Xóa dữ liệu thành công!');
      fetchCustomers();
    } catch (error) {
      message.error('Lỗi khi xóa dữ liệu');
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setBabyInputType('dob');
    setEditingId(null);
  };

  const handleFinish = async (values) => {
    try {
      let finalBabyDob = null;
      let finalEdd = null;
      let isEstimatedDob = false;

      // Xử lý Baby DOB
      if (babyInputType === 'dob' && values.baby_dob) {
        finalBabyDob = values.baby_dob.format('YYYY-MM-DD');
      } else if (babyInputType === 'days' && values.baby_days !== undefined && values.baby_days !== null) {
        finalBabyDob = dayjs().subtract(values.baby_days, 'day').format('YYYY-MM-DD');
        isEstimatedDob = true;
      } else if (babyInputType === 'weeks' && values.baby_weeks !== undefined && values.baby_weeks !== null) {
        finalBabyDob = dayjs().subtract(values.baby_weeks, 'week').format('YYYY-MM-DD');
        isEstimatedDob = true;
      } else if (babyInputType === 'months' && values.baby_months !== undefined && values.baby_months !== null) {
        finalBabyDob = dayjs().subtract(values.baby_months, 'month').format('YYYY-MM-DD');
        isEstimatedDob = true;
      }

      // Xử lý Thai kỳ (Chỉ dùng tuần thai)
      if (values.pregnancy_weeks !== undefined && values.pregnancy_weeks !== null) {
        const weeksLeft = 40 - values.pregnancy_weeks;
        finalEdd = dayjs().add(weeksLeft, 'week').format('YYYY-MM-DD');
      }

      const payload = {
        name: values.name,
        phone: values.phone,
        baby_name: values.baby_name,
        baby_dob: finalBabyDob,
        is_estimated_dob: isEstimatedDob,
        edd: finalEdd,
        status: values.status
      };

      if (editingId) {
        await handleAPI(`/api/customers/${editingId}`, payload, 'put');
        message.success('Cập nhật dữ liệu thành công!');
      } else {
        await handleAPI('/api/customers', payload, 'post');
        message.success('Thêm dữ liệu thành công!');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      setBabyInputType('dob');
      setEditingId(null);
      fetchCustomers();
    } catch (error) {
      console.log(error);
      message.error(error?.message || 'Có lỗi xảy ra');
    }
  };

  const columns = [
    {
      title: 'Tên Mẹ',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text || 'Unknown'}</strong>,
    },
    {
      title: 'Tên Bé',
      dataIndex: 'baby_name',
      key: 'baby_name',
      render: (text) => text || <span className="text-gray-400">Trống</span>,
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => text || <span className="text-gray-400">Trống</span>,
    },
    {
      title: 'Ngày Sinh Bé',
      dataIndex: 'baby_dob',
      key: 'baby_dob',
      render: (text, record) => text ? (
        <Space>
          <span>{new Date(text).toLocaleDateString('vi-VN')}</span>
          {record.is_estimated_dob && <Tag color="warning" className="text-xs">Ước tính</Tag>}
        </Space>
      ) : <span className="text-gray-400">N/A</span>,
    },
    {
      title: 'Giai đoạn (Tuổi/Thai)',
      key: 'stageInfo',
      render: (_, record) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (record.baby_dob) {
          const dob = new Date(record.baby_dob);
          dob.setHours(0, 0, 0, 0);
          const diffTime = today.getTime() - dob.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays >= 0) {
            const months = Math.floor(diffDays / 30);
            return <Tag color="blue">{`Bé ${months} tháng tuổi`}</Tag>;
          }
        } else if (record.edd) {
          const edd = new Date(record.edd);
          edd.setHours(0, 0, 0, 0);
          const diffTime = edd.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          const currentWeek = 40 - Math.floor(diffDays / 7);
          const week = currentWeek < 0 ? 0 : currentWeek;

          return <Tag color="pink">{`Thai kỳ (Tuần ${week})`}</Tag>;
        }
        return <span className="text-gray-400">Chưa xác định</span>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = status === 'active' ? 'green' : 'red';
        let text = status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            className="text-blue-500" 
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa khách hàng này?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout title="Quản lý dữ liệu">
      <Card bordered={false} className="shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <Title level={4} style={{ margin: 0 }}>Quản lý dữ liệu Khách Hàng (Users)</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={showModal} size="large" className="bg-blue-600">
            Thêm dữ liệu
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingId ? "Sửa Thông Tin Khách Hàng" : "Thêm Khách Hàng Mới"}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ status: 'active' }}
          className="mt-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="name"
              label="Tên Mẹ"
            >
              <Input placeholder="Nhập tên mẹ (mặc định: Unknown)" />
            </Form.Item>

            <Form.Item
              name="phone"
              label="Số điện thoại"
            >
              <Input placeholder="Nhập số điện thoại..." />
            </Form.Item>

            <Form.Item
              name="baby_name"
              label="Tên Em Bé"
            >
              <Input placeholder="Nhập tên gọi ở nhà của bé..." />
            </Form.Item>

            <Form.Item
              name="status"
              label="Trạng thái"
              rules={[{ required: true }]}
            >
              <Select>
                <Select.Option value="active">Đang hoạt động</Select.Option>
                <Select.Option value="inactive">Ngừng hoạt động</Select.Option>
              </Select>
            </Form.Item>

            <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded border border-gray-200">
              <div className="mb-2 font-medium text-gray-700">Thông tin sinh của bé (Đã sinh)</div>

              <Form.Item name="babyInputType" initialValue="dob" className="mb-3">
                <Radio.Group onChange={(e) => setBabyInputType(e.target.value)} value={babyInputType}>
                  <Radio value="dob">Biết ngày sinh</Radio>
                  <Radio value="days">Nhập ngày tuổi</Radio>
                  <Radio value="weeks">Nhập tuần tuổi</Radio>
                  <Radio value="months">Nhập tháng tuổi</Radio>
                </Radio.Group>
              </Form.Item>

              {babyInputType === 'dob' ? (
                <Form.Item
                  name="baby_dob"
                  label="Ngày sinh"
                  className="mb-0"
                >
                  <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày sinh..." />
                </Form.Item>
              ) : babyInputType === 'days' ? (
                <Form.Item
                  name="baby_days"
                  label="Ngày tuổi hiện tại"
                  className="mb-0"
                >
                  <InputNumber min={0} max={1000} style={{ width: '100%' }} placeholder="Nhập số ngày tuổi..." addonAfter="ngày" />
                </Form.Item>
              ) : babyInputType === 'weeks' ? (
                <Form.Item
                  name="baby_weeks"
                  label="Tuần tuổi hiện tại"
                  className="mb-0"
                >
                  <InputNumber min={0} max={200} style={{ width: '100%' }} placeholder="Nhập số tuần tuổi..." addonAfter="tuần" />
                </Form.Item>
              ) : (
                <Form.Item
                  name="baby_months"
                  label="Tháng tuổi hiện tại"
                  className="mb-0"
                >
                  <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="Nhập số tháng tuổi..." addonAfter="tháng" />
                </Form.Item>
              )}
            </div>

            <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded border border-gray-200">
              <div className="mb-2 font-medium text-gray-700">Thông tin thai kỳ (Đang bầu)</div>
              <Form.Item
                name="pregnancy_weeks"
                label="Tuần thai hiện tại"
                className="mb-0"
              >
                <InputNumber min={0} max={42} style={{ width: '100%' }} placeholder="Nhập số tuần thai..." addonAfter="tuần" />
              </Form.Item>
            </div>
          </div>

          <Form.Item className="flex justify-end mt-4 mb-0">
            <Space>
              <Button onClick={handleCancel}>Hủy</Button>
              <Button type="primary" htmlType="submit" className="bg-blue-600">
                Lưu dữ liệu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
};

export default UsersPage;
