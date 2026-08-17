import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, Tag, Space, Card, Typography, Radio, InputNumber, Popconfirm, AutoComplete, Upload, App } from 'antd';
import handleAPI from '../../apis/handleAPI';
import { PlusOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined, ImportOutlined, InboxOutlined, DownloadOutlined, ClearOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/hasPermission';

const { Title } = Typography;

// Dữ liệu sẽ được fetch từ API

const UsersPage = () => {
  const { user } = useSelector((state) => state.auth);
  const { message: messageApi } = App.useApp();
  const [data, setData] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [babyInputType, setBabyInputType] = useState('dob');
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();
  
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const { Dragger } = Upload;

  const handleDownloadTemplate = () => {
    const csvContent = "\uFEFFSố điện thoại,Tên khách hàng,Ngày dự sinh,Ngày sinh bé,Tên sản phẩm mua,Số lượng,Ngày mua\n0912345678,Mẹ Lan,15/09/2026,,Bỉm Merries M58,2,10/08/2026\n0912345678,Mẹ Lan,,,Sữa Meiji số 0,1,10/08/2026";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Zalo_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importProps = {
    name: 'file',
    multiple: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        setImportLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        const res = await handleAPI('/api/customers/import', formData, 'post', {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        messageApi.success(`Import thành công! Đã xử lý: ${res?.data?.totalRowsProcessed || 0} dòng. Khách mới: ${res?.data?.newCustomers || 0}, Đơn mới: ${res?.data?.newOrders || 0}.`);
        onSuccess(res, file);
        setIsImportModalVisible(false);
        fetchCustomers();
      } catch (error) {
        console.error(error);
        const msg = typeof error === 'string' ? error : (error?.message || 'Lỗi khi import dữ liệu');
        messageApi.error(msg);
        onError(error);
      } finally {
        setImportLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await handleAPI('/api/products', null, 'get');
      setProducts(res || []);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await handleAPI('/api/customers', null, 'get');
      setData(res.map(item => ({ ...item, key: item._id })));
    } catch (error) {
      console.log(error);
      messageApi.error('Lấy dữ liệu thất bại');
    } finally {
      setLoading(false);
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
      orders: record.orders && record.orders.length > 0 
        ? record.orders.map(o => ({
            product_name: o.product_name,
            purchase_date: o.purchase_date ? dayjs(o.purchase_date) : null,
            quantity: o.quantity || 1
          }))
        : [{ product_name: undefined, purchase_date: undefined, quantity: 1 }]
    };

    setBabyInputType('dob');
    form.setFieldsValue(formValues);
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await handleAPI(`/api/customers/${id}`, null, 'delete');
      messageApi.success('Xóa dữ liệu thành công!');
      fetchCustomers();
    } catch (error) {
      const msg = typeof error === 'string' ? error : (error?.message || 'Lỗi khi xóa dữ liệu');
      messageApi.error(msg);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setBabyInputType('dob');
    setEditingId(null);
  };

  const handleFinish = async (values) => {
    setSubmitLoading(true);
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

      // Xử lý Orders array
      const processedOrders = values.orders 
        ? values.orders
            .filter(o => o && o.product_name)
            .map(o => ({
              product_name: o.product_name.trim(),
              purchase_date: o.purchase_date ? o.purchase_date.toISOString() : null,
              quantity: o.quantity || 1
            }))
        : [];

      const payload = {
        name: values.name,
        phone: values.phone,
        baby_name: values.baby_name,
        baby_dob: finalBabyDob,
        is_estimated_dob: isEstimatedDob,
        edd: finalEdd,
        status: values.status,
        orders: processedOrders
      };

      if (editingId) {
        await handleAPI(`/api/customers/${editingId}`, payload, 'put');
        messageApi.success('Cập nhật dữ liệu thành công!');
      } else {
        await handleAPI('/api/customers', payload, 'post');
        messageApi.success('Thêm dữ liệu thành công!');
      }

      setIsModalVisible(false);
      form.resetFields();
      setBabyInputType('dob');
      setEditingId(null);
      fetchCustomers();
    } catch (error) {
      console.log(error);
      messageApi.error(error?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitLoading(false);
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
      title: 'Sản phẩm theo dõi',
      key: 'products',
      render: (_, record) => {
        if (!record.purchased_products || record.purchased_products.length === 0) {
          return <span className="text-gray-400">Chưa có đơn</span>;
        }
        return (
          <ul className="pl-4 m-0">
            {record.purchased_products.map((p, idx) => (
              <li key={idx} className="mb-1">
                <strong>{p.product_name}</strong>
                {p.expected_refill_date && (
                  <div className="text-xs text-gray-500">
                    Dự kiến hết: {new Date(p.expected_refill_date).toLocaleDateString('vi-VN')}
                  </div>
                )}
              </li>
            ))}
          </ul>
        );
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
            onClick={() => {
              if (!hasPermission(user, 'data_edit')) return messageApi.warning('Bạn không có quyền sửa dữ liệu!');
              handleEdit(record);
            }}
          />
          {hasPermission(user, 'data_delete') ? (
            <Popconfirm
              title="Bạn có chắc chắn muốn xóa khách hàng này?"
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

  const filteredData = data.filter(item => {
    // 1. Lọc theo Số điện thoại
    if (searchPhone && !item.phone?.includes(searchPhone)) return false;
    
    // 2. Lọc theo Sản phẩm
    if (filterProduct !== 'all') {
      const hasProduct = item.purchased_products?.some(p => p.product_name === filterProduct);
      if (!hasProduct) return false;
    }

    // 3. Lọc theo Giai đoạn (Đã sinh / Đang bầu)
    if (filterStage !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let isBorn = false;
      let isPregnant = false;

      if (item.baby_dob) {
        const dob = new Date(item.baby_dob);
        dob.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - dob.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) isBorn = true;
      } 
      
      if (!isBorn && item.edd) {
        isPregnant = true;
      }

      if (filterStage === 'born' && !isBorn) return false;
      if (filterStage === 'pregnant' && !isPregnant) return false;
    }

    return true;
  });

  return (
    <DashboardLayout title="Quản lý dữ liệu">
      <Card bordered={false} className="shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <Title level={4} style={{ margin: 0 }}>Quản lý dữ liệu tiềm năng</Title>
          <Space>
            <Button icon={<ImportOutlined />} size="large" onClick={() => {
              if (!hasPermission(user, 'data_create')) return messageApi.warning('Bạn không có quyền thêm mới dữ liệu!');
              setIsImportModalVisible(true);
            }}>
              Nhập từ Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} size="large" style={{ backgroundColor: '#0d6e57', borderColor: '#0d6e57' }} onClick={() => {
              if (!hasPermission(user, 'data_create')) return messageApi.warning('Bạn không có quyền thêm mới dữ liệu!');
              showModal();
            }}>
              Thêm dữ liệu
            </Button>
          </Space>
        </div>

        <div className="flex gap-4 mb-6 flex-wrap">
          <Input.Search
            placeholder="Tìm theo số điện thoại..."
            allowClear
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            style={{ width: 250 }}
          />
          <Select
            value={filterProduct}
            onChange={setFilterProduct}
            style={{ width: 250 }}
            showSearch
            options={[
              { value: 'all', label: 'Tất cả sản phẩm' },
              ...products.map(p => ({ value: p.name, label: p.name }))
            ]}
          />
          <Select
            value={filterStage}
            onChange={setFilterStage}
            style={{ width: 200 }}
            options={[
              { value: 'all', label: 'Tất cả giai đoạn' },
              { value: 'born', label: 'Đã sinh bé' },
              { value: 'pregnant', label: 'Đang mang bầu' }
            ]}
          />
          {(searchPhone || filterProduct !== 'all' || filterStage !== 'all') && (
            <Button 
              icon={<ClearOutlined />} 
              onClick={() => {
                setSearchPhone('');
                setFilterProduct('all');
                setFilterStage('all');
              }}
            >
              Hủy lọc
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          loading={loading}
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
          initialValues={{ status: 'active', orders: [{ product_name: undefined, purchase_date: undefined }] }}
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
            
            <div className="col-span-1 md:col-span-2 bg-blue-50 p-4 rounded border border-blue-200">
              <div className="mb-2 font-medium text-blue-800">Sản phẩm khách đã mua (Tùy chọn)</div>
              
              <Form.List name="orders">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <div key={key} className="flex gap-4 items-start mb-4">
                        <Form.Item
                          {...restField}
                          name={[name, 'product_name']}
                          label={name === 0 ? "Tên Sản phẩm" : ""}
                          className="mb-0 flex-1"
                          tooltip={name === 0 ? "Bạn có thể gõ tên sản phẩm mới, hệ thống tự động lưu." : ""}
                        >
                          <AutoComplete
                            placeholder="VD: Bỉm Moony Blue M"
                            allowClear
                            options={products.map(p => ({ value: p.name, label: p.name }))}
                            filterOption={(inputValue, option) =>
                              option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                            }
                          />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'purchase_date']}
                          label={name === 0 ? "Ngày mua hàng" : ""}
                          className="mb-0 flex-1"
                        >
                          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Ngày mua (Mặc định: Hôm nay)" />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          label={name === 0 ? "Số lượng" : ""}
                          className="mb-0 w-24"
                        >
                          <InputNumber min={1} style={{ width: '100%' }} placeholder="SL" />
                        </Form.Item>
                        <div className={name === 0 ? "mt-8" : "mt-1"}>
                          <MinusCircleOutlined className="text-red-500 text-lg cursor-pointer" onClick={() => remove(name)} />
                        </div>
                      </div>
                    ))}
                    <Form.Item className="mb-0">
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Thêm sản phẩm
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </div>
          </div>

          <Form.Item className="flex justify-end mt-4 mb-0">
            <Space>
              <Button onClick={handleCancel}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitLoading} style={{ backgroundColor: '#0d6e57', borderColor: '#0d6e57' }}>
                Lưu dữ liệu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Nhập Dữ Liệu Khách Hàng & Đơn Hàng từ Excel"
        open={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Typography.Text>Hệ thống hỗ trợ nhập liệu thông qua file Excel hoặc CSV. Vui lòng tải file mẫu để xem định dạng chuẩn.</Typography.Text>
          <div style={{ marginTop: 12, marginBottom: 24 }}>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate} style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>
              Tải file mẫu (.csv)
            </Button>
          </div>
        </div>
        <Dragger {...importProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: '#0d6e57' }} />
          </p>
          <p className="ant-upload-text">Kéo thả file vào khu vực này hoặc nhấp để chọn file</p>
          <p className="ant-upload-hint">
            Hỗ trợ file định dạng .xlsx, .xls, .csv. File không được vượt quá 10MB.
          </p>
        </Dragger>
      </Modal>
    </DashboardLayout>
  );
};

export default UsersPage;
