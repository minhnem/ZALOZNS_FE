import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Card,
  Table,
  Button,
  Input,
  Space,
  Form,
  TreeSelect,
  Popconfirm,
  App,
  Row,
  Col,
  Tooltip,
  Tag
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FolderOutlined,
  SearchOutlined
} from '@ant-design/icons';
import handleAPI from '../../apis/handleAPI';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/hasPermission';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function CategoriesPage() {
  const { user } = useSelector((state) => state.auth);
  const { message: messageApi } = App.useApp();

  const [categoriesTree, setCategoriesTree] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Editing state
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await handleAPI('/api/categories?tree=true', null, 'get');
      if (res && res.tree) {
        // Gán key = _id cho Table
        const addKeys = (nodes) =>
          nodes.map((node) => ({
            ...node,
            key: node._id,
            children: node.children && node.children.length > 0 ? addKeys(node.children) : undefined
          }));

        setCategoriesTree(addKeys(res.tree));
        setFlatCategories(res.flat || []);
      } else if (Array.isArray(res)) {
        setFlatCategories(res);
      }
    } catch (error) {
      console.error(error);
      messageApi.error('Lấy danh sách danh mục thất bại');
    } finally {
      setLoading(false);
    }
  };

  // Chuẩn bị dữ liệu cho TreeSelect chọn danh mục cha (để trống nếu là danh mục gốc)
  const treeSelectData = useMemo(() => {
    const buildSelectNodes = (nodes) =>
      nodes.map((n) => {
        // Nếu đang sửa 1 danh mục thì disable chính nó để không chọn nhầm làm cha
        const isSelf = editingCategory && String(editingCategory._id) === String(n._id);
        return {
          title: n.name,
          label: n.name,
          value: n._id,
          key: n._id,
          disabled: isSelf,
          children: n.children && n.children.length > 0 ? buildSelectNodes(n.children) : undefined
        };
      });

    return buildSelectNodes(categoriesTree);
  }, [categoriesTree, editingCategory]);

  // Click vào nút Sửa ở bảng bên phải -> Điền vào form bên trái
  const handleSelectToEdit = (record) => {
    setEditingCategory(record);
    form.setFieldsValue({
      parent_id: record.parent_id?._id || record.parent_id || undefined,
      name: record.name,
      description: record.description || ''
    });
  };

  // Reset form về trạng thái thêm mới
  const handleResetForm = () => {
    setEditingCategory(null);
    form.resetFields();
  };

  // Submit tạo mới hoặc cập nhật
  const handleSubmit = async (values) => {
    try {
      const payload = {
        name: values.name.trim(),
        parent_id: values.parent_id || null, // Nếu trống thì là danh mục gốc
        description: values.description || ''
      };

      if (editingCategory) {
        await handleAPI(`/api/categories/${editingCategory._id}`, payload, 'put');
        messageApi.success(`Cập nhật danh mục "${payload.name}" thành công!`);
      } else {
        await handleAPI('/api/categories', payload, 'post');
        messageApi.success(`Thêm mới danh mục "${payload.name}" thành công!`);
      }

      handleResetForm();
      fetchCategories();
    } catch (error) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      messageApi.error(msg);
    }
  };

  // Xóa danh mục
  const handleDeleteCategory = async (id) => {
    try {
      await handleAPI(`/api/categories/${id}`, null, 'delete');
      messageApi.success('Đã xóa danh mục thành công!');
      setSelectedCategoryKeys((prev) => prev.filter((k) => k !== id));
      if (editingCategory && editingCategory._id === id) {
        handleResetForm();
      }
      fetchCategories();
    } catch (error) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || 'Không thể xóa danh mục';
      messageApi.error(msg);
    }
  };

  // Xóa nhiều danh mục đã chọn
  const handleBulkDeleteCategories = async () => {
    if (selectedCategoryKeys.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      const res = await handleAPI('/api/categories/bulk-delete', { ids: selectedCategoryKeys }, 'post');
      messageApi.success(res?.message || `Đã xóa ${selectedCategoryKeys.length} danh mục!`);
      setSelectedCategoryKeys([]);
      fetchCategories();
    } catch (error) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || 'Lỗi khi xóa nhiều danh mục';
      messageApi.error(msg);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Lọc cây danh mục realtime theo từ khóa tìm kiếm
  const filteredCategoriesTree = useMemo(() => {
    if (!searchText.trim()) return categoriesTree;
    const q = searchText.toLowerCase().trim();

    const filterNodes = (nodes) => {
      const result = [];
      for (const node of nodes) {
        const matchSelf =
          node.name?.toLowerCase().includes(q) ||
          node.description?.toLowerCase().includes(q);

        const filteredChildren =
          node.children && node.children.length > 0 ? filterNodes(node.children) : [];

        if (matchSelf || filteredChildren.length > 0) {
          result.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : undefined
          });
        }
      }
      return result;
    };

    return filterNodes(categoriesTree);
  }, [categoriesTree, searchText]);


  // Cột bảng danh mục bên phải
  const columns = [
    {
      title: 'Tên danh mục',
      dataIndex: 'name',
      key: 'name',
      width: '38%',
      render: (text, record) => {
        const hasChildren = record.children && record.children.length > 0;
        return (
          <span style={{ fontWeight: hasChildren ? 600 : 400, color: '#111827', fontSize: 14 }}>
            {hasChildren ? (
              <FolderOutlined style={{ marginRight: 6, color: '#0d6e57' }} />
            ) : (
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#9ca3af',
                  marginRight: 10,
                  verticalAlign: 'middle'
                }}
              />
            )}
            {text}
          </span>
        );
      }
    },
    {
      title: 'Số sản phẩm',
      dataIndex: 'product_count',
      key: 'product_count',
      width: '18%',
      align: 'center',
      render: (count) => {
        const num = count || 0;
        return (
          <Tag color={num > 0 ? 'blue' : 'default'} style={{ borderRadius: 12, padding: '1px 10px', fontWeight: 500 }}>
            {num} sản phẩm
          </Tag>
        );
      }
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      width: '30%',
      render: (desc) => (
        <span style={{ color: '#4b5563', fontSize: 13 }}>
          {desc || 'Danh mục này chưa có mô tả'}
        </span>
      )
    },
    {
      title: 'Lựa chọn',
      key: 'actions',
      width: '14%',
      align: 'right',
      render: (_, record) => (
        <Space size="middle">
          {hasPermission(user, 'data_edit') && (
            <Tooltip title="Chỉnh sửa danh mục này">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined style={{ color: '#1890ff', fontSize: 16 }} />}
                onClick={() => handleSelectToEdit(record)}
              />
            </Tooltip>
          )}

          {hasPermission(user, 'data_delete') && (
            <Popconfirm
              title="Xóa danh mục này?"
              description="Chỉ có thể xóa khi danh mục không có danh mục con và không có sản phẩm liên kết."
              onConfirm={() => handleDeleteCategory(record._id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa danh mục">
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <DashboardLayout title="Danh Mục Sản Phẩm">
      {/* HEADER SECTION */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827', fontWeight: 700 }}>
            Quản Lý Danh Mục
          </Title>
          <Text type="secondary">
            Phân loại hàng hóa theo cây danh mục cha - con đa tầng
          </Text>
        </div>

        <Space size="middle">
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchCategories();
              messageApi.info('Đã làm mới danh mục');
            }}
          >
            Làm mới
          </Button>
        </Space>
      </div>

      {/* 2-COLUMN LAYOUT */}
      <Row gutter={24}>
        {/* CỘT TRÁI: FORM THÊM MỚI / CẬP NHẬT */}
        <Col xs={24} lg={8} style={{ marginBottom: 20 }}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              background: '#ffffff'
            }}
            bodyStyle={{ padding: 24 }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 20 }}>
              {editingCategory ? 'Cập nhật danh mục' : 'Thêm mới danh mục'}
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Form.Item
                name="parent_id"
                label={<span style={{ fontWeight: 500, color: '#374151' }}>Chọn danh mục cha</span>}
                extra="Nếu để trống, hệ thống sẽ tự động tạo là danh mục gốc (Cấp 1)."
              >
                <TreeSelect
                  showSearch
                  style={{ width: '100%' }}
                  dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                  placeholder="Chọn danh mục cha"
                  allowClear
                  treeDefaultExpandAll
                  treeData={treeSelectData}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="name"
                label={<span style={{ fontWeight: 500, color: '#374151' }}>Tên danh mục</span>}
                rules={[{ required: true, message: 'Vui lòng nhập tên danh mục' }]}
              >
                <Input placeholder="Nhập tên danh mục" size="large" />
              </Form.Item>

              <Form.Item
                name="description"
                label={<span style={{ fontWeight: 500, color: '#374151' }}>Mô tả</span>}
              >
                <TextArea
                  rows={4}
                  placeholder="Nhập mô tả cho danh mục này..."
                  style={{ resize: 'vertical' }}
                />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <Button size="large" onClick={handleResetForm}>
                  Làm mới
                </Button>

                {editingCategory ? (
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => form.submit()}
                    style={{
                      background: '#0d6e57',
                      borderColor: '#0d6e57',
                      color: '#ffffff',
                      fontWeight: 600,
                      boxShadow: '0 2px 6px rgba(13, 110, 87, 0.25)'
                    }}
                  >
                    Sửa
                  </Button>
                ) : (
                  <Button size="large" disabled style={{ background: '#f3f4f6', color: '#9ca3af' }}>
                    Sửa
                  </Button>
                )}

                {!editingCategory && hasPermission(user, 'data_create') && (
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => form.submit()}
                    style={{
                      background: '#0d6e57', // Đồng nhất màu xanh thương hiệu hệ thống
                      borderColor: '#0d6e57',
                      color: '#ffffff',
                      fontWeight: 600,
                      boxShadow: '0 2px 6px rgba(13, 110, 87, 0.25)'
                    }}
                  >
                    Thêm mới
                  </Button>
                )}
              </div>
            </Form>
          </Card>
        </Col>

        {/* CỘT PHẢI: BẢNG DANH MỤC */}
        <Col xs={24} lg={16}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              background: '#ffffff'
            }}
            bodyStyle={{ padding: 24 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>
                  Bảng danh mục
                </span>
                {hasPermission(user, 'data_delete') && selectedCategoryKeys.length > 0 && (
                  <Popconfirm
                    title={`Xác nhận xóa ${selectedCategoryKeys.length} danh mục đã chọn?`}
                    description="Lưu ý: Chỉ danh mục không có con và không có sản phẩm liên kết mới bị xóa."
                    onConfirm={handleBulkDeleteCategories}
                    okText="Xóa tất cả"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true, loading: bulkDeleteLoading }}
                  >
                    <Button danger type="primary" size="small" icon={<DeleteOutlined />}>
                      Xóa ({selectedCategoryKeys.length}) danh mục
                    </Button>
                  </Popconfirm>
                )}
              </div>

              <Input
                placeholder="Tìm kiếm danh mục..."
                prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                style={{ maxWidth: 280 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </div>

            <Table
              columns={columns}
              dataSource={filteredCategoriesTree}
              rowKey="_id"
              loading={loading}
              rowSelection={{
                selectedRowKeys: selectedCategoryKeys,
                onChange: (keys) => setSelectedCategoryKeys(keys),
                checkStrictly: false
              }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} danh mục`
              }}
              expandable={{
                defaultExpandAllRows: true,
                expandIcon: ({ expanded, onExpand, record }) => {
                  if (!record.children || record.children.length === 0) {
                    return <span style={{ display: 'inline-block', width: 20 }} />;
                  }
                  return (
                    <span
                      onClick={(e) => onExpand(record, e)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 18,
                        height: 18,
                        marginRight: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#4b5563',
                        userSelect: 'none'
                      }}
                    >
                      {expanded ? '−' : '+'}
                    </span>
                  );
                }
              }}
            />
          </Card>
        </Col>
      </Row>
    </DashboardLayout>
  );
}
