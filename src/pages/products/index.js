import React, { useState, useEffect, useMemo } from 'react';
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
  TreeSelect,
  Popconfirm,
  App,
  Tabs,
  Row,
  Col,
  Statistic,
  Tooltip,
  DatePicker,
  Progress,
  Divider,
  Alert
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  SearchOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CalendarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  AppstoreOutlined,
  BarcodeOutlined,
  FilterOutlined,
  StopOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import handleAPI from '../../apis/handleAPI';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/hasPermission';

const { Title, Text } = Typography;

const DEFAULT_CATEGORIES = [
  'Bỉm - Tã',
  'Sữa công thức',
  'Đồ ăn dặm',
  'Bình sữa & Phụ kiện',
  'Đồ dùng vệ sinh & Tắm gội',
  'Quần áo & Phụ kiện Mẹ & Bé',
  'Đồ chơi & Giáo dục',
  'Thực phẩm bổ sung & Vitamin',
  'Khác'
];

const DEFAULT_UNITS = ['Cái', 'Hộp', 'Lon', 'Gói', 'Bịch', 'Chai', 'Túi', 'Tuýp', 'Bộ', 'Thùng'];

export default function ProductsPage() {
  const { user } = useSelector((state) => state.auth);
  const { message: messageApi, modal: modalApi } = App.useApp();
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'batches'

  // Products state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterProductStatus, setFilterProductStatus] = useState('all');
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProductKeys, setSelectedProductKeys] = useState([]);

  // Batches state
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchSearch, setBatchSearch] = useState('');
  const [filterBatchProduct, setFilterBatchProduct] = useState('all');
  const [filterBatchStatus, setFilterBatchStatus] = useState('all');
  const [isBatchModalVisible, setIsBatchModalVisible] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [presetProductForBatch, setPresetProductForBatch] = useState(null);
  const [scanningExpiry, setScanningExpiry] = useState(false);
  const [selectedBatchKeys, setSelectedBatchKeys] = useState([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Expiry overview state
  const [expiryStats, setExpiryStats] = useState(null);
  const [dbCategories, setDbCategories] = useState([]);
  const [categoriesTree, setCategoriesTree] = useState([]);

  const [formProduct] = Form.useForm();
  const [formBatch] = Form.useForm();

  // Load products on mount
  useEffect(() => {
    fetchProducts();
    fetchBatches();
    fetchExpiryOverview();
    fetchCategories();
  }, []);

  // Xử lý query param từ Dashboard hoặc trang khác (chuyển thẳng sang tab Lô hàng)
  useEffect(() => {
    if (router.query.tab === 'batches') {
      setActiveTab('batches');
    }
    if (router.query.filterStatus) {
      setFilterBatchStatus(router.query.filterStatus);
    }
  }, [router.query]);

  // Quét kiểm tra HSD tức thì
  const handleScanExpiry = async () => {
    setScanningExpiry(true);
    try {
      const res = await handleAPI('/api/product-batches/scan-expiry', null, 'post');
      messageApi.success(res.message || 'Quét hạn sử dụng hoàn tất');
      fetchBatches(filterBatchProduct);
      fetchExpiryOverview();
    } catch (err) {
      console.error(err);
      messageApi.error(err.response?.data?.message || 'Lỗi khi quét hạn sử dụng');
    } finally {
      setScanningExpiry(false);
    }
  };

  // 1-Click: Tạo chiến dịch ZNS xả hàng cận date
  const handleCreateClearanceCampaign = (record) => {
    const prodId = record.product_id?._id || record.product_id;
    const prodName = record.product_id?.name || '';
    router.push({
      pathname: '/marketing/create',
      query: {
        clearance: '1',
        productId: prodId,
        productName: prodName,
        batchNumber: record.batch_number
      }
    });
  };

  // Format currency
  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '0 đ';
    return Number(val).toLocaleString('vi-VN') + ' đ';
  };

  // ═══════════════════════════════════════════════
  // API FETCHERS
  // ═══════════════════════════════════════════════
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await handleAPI('/api/products', null, 'get');
      setProducts(res.map((item) => ({ ...item, key: item._id })));
    } catch (error) {
      console.error(error);
      messageApi.error('Lấy dữ liệu sản phẩm thất bại');
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchBatches = async (productId = null) => {
    setLoadingBatches(true);
    try {
      let url = '/api/product-batches';
      if (productId && productId !== 'all') {
        url += `?product_id=${productId}`;
      }
      const res = await handleAPI(url, null, 'get');
      setBatches(res.map((item) => ({ ...item, key: item._id })));
    } catch (error) {
      console.error(error);
      messageApi.error('Lấy danh sách lô hàng thất bại');
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchExpiryOverview = async () => {
    try {
      const res = await handleAPI('/api/product-batches/expiry-overview', null, 'get');
      setExpiryStats(res);
    } catch (error) {
      console.error('Lỗi lấy expiry overview:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await handleAPI('/api/categories?tree=true', null, 'get');
      if (res && res.tree) {
        setCategoriesTree(res.tree);
        setDbCategories(res.flat || []);
      } else if (Array.isArray(res)) {
        setDbCategories(res);
      }
    } catch (error) {
      console.error('Lỗi lấy categories:', error);
    }
  };

  // ═══════════════════════════════════════════════
  // PRODUCT ACTIONS
  // ═══════════════════════════════════════════════
  const handleOpenProductModal = (record = null) => {
    setEditingProduct(record);
    if (record) {
      const catId = record.category_id?._id || record.category_id;
      formProduct.setFieldsValue({
        name: record.name,
        category_id: catId || undefined,
        category: record.category_id?.name || record.category || 'Khác',
        sku: record.sku || '',
        barcode: record.barcode || '',
        unit: record.unit || 'Cái',
        sell_price: record.sell_price || 0,
        cost_price: record.cost_price || 0,
        usage_cycle_days: record.usage_cycle_days || 30,
        near_expiry_days: record.near_expiry_days || 90,
        status: record.status || 'active',
        description: record.description || ''
      });
    } else {
      formProduct.resetFields();
      const defaultCat = dbCategories.find(c => c.name === 'Khác') || dbCategories[0];
      formProduct.setFieldsValue({
        status: 'active',
        category_id: defaultCat?._id || undefined,
        category: defaultCat?.name || 'Khác',
        unit: 'Cái',
        usage_cycle_days: 30,
        near_expiry_days: 90,
        sell_price: 0,
        cost_price: 0
      });
    }
    setIsProductModalVisible(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalVisible(false);
    setEditingProduct(null);
    formProduct.resetFields();
  };

  const handleSaveProduct = async (values) => {
    try {
      // Tìm tên danh mục từ category_id đã chọn
      let categoryName = values.category;
      if (values.category_id) {
        const found = dbCategories.find(c => String(c._id) === String(values.category_id));
        if (found) {
          categoryName = found.name;
        }
      }
      const payload = {
        ...values,
        category: categoryName || 'Khác'
      };

      if (editingProduct) {
        await handleAPI(`/api/products/${editingProduct._id}`, payload, 'put');
        messageApi.success('Cập nhật sản phẩm thành công!');
      } else {
        await handleAPI('/api/products', payload, 'post');
        messageApi.success('Thêm sản phẩm mới thành công!');
      }
      handleCloseProductModal();
      fetchProducts();
      fetchCategories();
    } catch (error) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      messageApi.error(msg);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await handleAPI(`/api/products/${id}`, null, 'delete');
      messageApi.success('Đã xóa sản phẩm!');
      setSelectedProductKeys((prev) => prev.filter((k) => k !== id));
      fetchProducts();
      fetchBatches();
    } catch (error) {
      const msg = typeof error === 'string' ? error : error?.message || 'Lỗi khi xóa sản phẩm';
      messageApi.error(msg);
    }
  };

  const handleBulkDeleteProducts = async () => {
    if (selectedProductKeys.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      const res = await handleAPI('/api/products/bulk-delete', { ids: selectedProductKeys }, 'post');
      messageApi.success(res?.message || `Đã xóa ${selectedProductKeys.length} sản phẩm thành công!`);
      setSelectedProductKeys([]);
      fetchProducts();
      fetchBatches();
      fetchCategories();
    } catch (error) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || 'Lỗi khi xóa nhiều sản phẩm';
      messageApi.error(msg);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // ═══════════════════════════════════════════════
  // BATCH ACTIONS
  // ═══════════════════════════════════════════════
  const handleOpenBatchModal = (batch = null, defaultProductId = null) => {
    setEditingBatch(batch);
    setPresetProductForBatch(defaultProductId);

    if (batch) {
      formBatch.setFieldsValue({
        product_id: batch.product_id?._id || batch.product_id,
        batch_number: batch.batch_number,
        manufacturing_date: batch.manufacturing_date ? dayjs(batch.manufacturing_date) : null,
        expiry_date: batch.expiry_date ? dayjs(batch.expiry_date) : null,
        quantity_received: batch.quantity_received,
        quantity_in_stock: batch.quantity_in_stock,
        cost_price: batch.cost_price || 0,
        notes: batch.notes || '',
        status: batch.status || 'active'
      });
    } else {
      formBatch.resetFields();
      const initialProductId = defaultProductId || (products.length > 0 ? products[0]._id : undefined);
      // Gợi ý mã lô dựa trên thời gian
      const suggestedBatchNumber = `LOT-${dayjs().format('YYYYMMDD')}-${Math.floor(100 + Math.random() * 900)}`;

      formBatch.setFieldsValue({
        product_id: initialProductId,
        batch_number: suggestedBatchNumber,
        manufacturing_date: dayjs(),
        expiry_date: dayjs().add(1, 'year'),
        quantity_received: 10,
        cost_price: 0,
        notes: ''
      });
    }
    setIsBatchModalVisible(true);
  };

  const handleCloseBatchModal = () => {
    setIsBatchModalVisible(false);
    setEditingBatch(null);
    setPresetProductForBatch(null);
    formBatch.resetFields();
  };

  const handleSaveBatch = async (values) => {
    try {
      const payload = {
        ...values,
        manufacturing_date: values.manufacturing_date ? values.manufacturing_date.toISOString() : null,
        expiry_date: values.expiry_date ? values.expiry_date.toISOString() : null
      };

      if (editingBatch) {
        await handleAPI(`/api/product-batches/${editingBatch._id}`, payload, 'put');
        messageApi.success('Cập nhật lô hàng thành công!');
      } else {
        await handleAPI('/api/product-batches', payload, 'post');
        messageApi.success('Nhập lô hàng mới thành công!');
      }

      handleCloseBatchModal();
      fetchBatches(filterBatchProduct);
      fetchProducts(); // Tồn kho tổng của Product đã được hook tự động cập nhật
      fetchExpiryOverview();
    } catch (error) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || 'Có lỗi khi lưu lô hàng';
      messageApi.error(msg);
    }
  };

  const handleDeleteBatch = async (id) => {
    try {
      await handleAPI(`/api/product-batches/${id}`, null, 'delete');
      messageApi.success('Đã xóa lô hàng!');
      setSelectedBatchKeys((prev) => prev.filter((k) => k !== id));
      fetchBatches(filterBatchProduct);
      fetchProducts();
      fetchExpiryOverview();
    } catch (error) {
      const msg = typeof error === 'string' ? error : error?.message || 'Lỗi khi xóa lô';
      messageApi.error(msg);
    }
  };

  const handleBulkDeleteBatches = async () => {
    if (selectedBatchKeys.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      const res = await handleAPI('/api/product-batches/bulk-delete', { ids: selectedBatchKeys }, 'post');
      messageApi.success(res?.message || `Đã xóa ${selectedBatchKeys.length} lô hàng thành công!`);
      setSelectedBatchKeys([]);
      fetchBatches(filterBatchProduct);
      fetchProducts();
      fetchExpiryOverview();
    } catch (error) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || 'Lỗi khi xóa nhiều lô';
      messageApi.error(msg);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleDestroyBatch = (batch) => {
    modalApi.confirm({
      title: `Xác nhận hủy lô hàng "${batch.batch_number}"?`,
      icon: <WarningOutlined style={{ color: '#ef4444' }} />,
      content: 'Lô hàng sẽ được đánh dấu là "Đã hủy" và không còn được tính vào tồn kho bán hàng.',
      okText: 'Xác nhận hủy',
      okType: 'danger',
      cancelText: 'Quay lại',
      onOk: async () => {
        try {
          await handleAPI(`/api/product-batches/${batch._id}`, { status: 'destroyed' }, 'put');
          messageApi.success('Đã chuyển trạng thái lô sang ĐÃ HỦY');
          fetchBatches(filterBatchProduct);
          fetchProducts();
          fetchExpiryOverview();
        } catch (error) {
          messageApi.error('Lỗi khi hủy lô');
        }
      }
    });
  };

  const handleRefreshProductBatches = async (productId) => {
    try {
      const res = await handleAPI(`/api/product-batches/refresh-status/${productId}`, null, 'post');
      messageApi.success(res.message || 'Đã cập nhật trạng thái lô hàng');
      fetchBatches(filterBatchProduct);
      fetchExpiryOverview();
    } catch (error) {
      messageApi.error('Lỗi khi quét trạng thái lô');
    }
  };

  // Xem danh sách lô của 1 sản phẩm cụ thể
  const handleViewBatchesForProduct = (productId) => {
    setFilterBatchProduct(productId);
    setActiveTab('batches');
    fetchBatches(productId);
  };

  // ═══════════════════════════════════════════════
  // FILTERED DATA
  // ═══════════════════════════════════════════════
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = productSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.kiotviet_code?.toLowerCase().includes(q);

      const pCatName = p.category_id?.name || p.category;
      const pCatId = p.category_id?._id ? String(p.category_id._id) : (p.category_id ? String(p.category_id) : '');

      const matchCategory =
        filterCategory === 'all' ||
        pCatName === filterCategory ||
        pCatId === filterCategory ||
        p.category === filterCategory;

      const matchStatus = filterProductStatus === 'all' || p.status === filterProductStatus;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, productSearch, filterCategory, filterProductStatus]);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const q = batchSearch.toLowerCase().trim();
      const productName = b.product_id?.name?.toLowerCase() || '';
      const batchNo = b.batch_number?.toLowerCase() || '';
      const matchSearch = !q || productName.includes(q) || batchNo.includes(q);

      const matchProduct = filterBatchProduct === 'all' || (b.product_id?._id || b.product_id) === filterBatchProduct;
      const effectiveStatus = b.computed_status || b.status;
      const matchStatus = filterBatchStatus === 'all' || effectiveStatus === filterBatchStatus;

      return matchSearch && matchProduct && matchStatus;
    });
  }, [batches, batchSearch, filterBatchProduct, filterBatchStatus]);

  // Cấu trúc cây cho TreeSelect trong form thêm / sửa sản phẩm
  const categoryTreeSelectData = useMemo(() => {
    const buildNodes = (nodes) =>
      nodes.map((n) => ({
        title: n.name,
        value: n._id,
        key: n._id,
        children: n.children && n.children.length > 0 ? buildNodes(n.children) : undefined
      }));
    return buildNodes(categoriesTree);
  }, [categoriesTree]);

  // Danh sách danh mục đầy đủ từ DB và sản phẩm để hiển thị dropdown lọc
  const allCategories = useMemo(() => {
    const list = [];
    const seen = new Set();
    dbCategories.forEach((c) => {
      if (c.name && !seen.has(c.name)) {
        seen.add(c.name);
        list.push({ id: c._id, name: c.name });
      }
    });
    products.forEach((p) => {
      const name = p.category_id?.name || p.category;
      if (name && !seen.has(name)) {
        seen.add(name);
        list.push({ id: p.category_id?._id || name, name });
      }
    });
    return list;
  }, [products, dbCategories]);

  // KPI calculations
  const productKpis = useMemo(() => {
    const totalCount = products.length;
    const activeCount = products.filter((p) => p.status === 'active').length;
    const totalStock = products.reduce((sum, p) => sum + (p.total_stock || 0), 0);
    const totalInventoryValue = products.reduce(
      (sum, p) => sum + (p.total_stock || 0) * (p.cost_price || 0),
      0
    );
    return { totalCount, activeCount, totalStock, totalInventoryValue };
  }, [products]);

  const batchKpis = useMemo(() => {
    const total = batches.length;
    let active = 0;
    let nearExpiry = 0;
    let expired = 0;
    let soldOut = 0;
    let totalStock = 0;

    batches.forEach((b) => {
      const st = b.computed_status || b.status;
      if (st === 'active') active++;
      else if (st === 'near_expiry') nearExpiry++;
      else if (st === 'expired') expired++;
      else if (st === 'sold_out') soldOut++;
      totalStock += b.quantity_in_stock || 0;
    });

    return { total, active, nearExpiry, expired, soldOut, totalStock };
  }, [batches]);

  // ═══════════════════════════════════════════════
  // STATUS RENDER HELPERS
  // ═══════════════════════════════════════════════
  const renderBatchStatusTag = (status, daysUntilExpiry) => {
    switch (status) {
      case 'active':
        return (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Còn hạn {daysUntilExpiry !== null && daysUntilExpiry !== undefined ? `(${daysUntilExpiry} ngày)` : ''}
          </Tag>
        );
      case 'near_expiry':
        return (
          <Tag color="warning" icon={<ClockCircleOutlined />}>
            Cận date {daysUntilExpiry !== null && daysUntilExpiry !== undefined ? `(còn ${daysUntilExpiry} ngày)` : ''}
          </Tag>
        );
      case 'expired':
        return (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Hết hạn {daysUntilExpiry !== null && daysUntilExpiry < 0 ? `(${Math.abs(daysUntilExpiry)} ngày trước)` : ''}
          </Tag>
        );
      case 'sold_out':
        return <Tag color="default">Đã hết hàng</Tag>;
      case 'destroyed':
        return <Tag color="magenta" icon={<StopOutlined />}>Đã hủy</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // ═══════════════════════════════════════════════
  // COLUMNS: PRODUCT TABLE
  // ═══════════════════════════════════════════════
  const productColumns = [
    {
      title: 'Sản phẩm',
      key: 'product_info',
      width: 280,
      render: (_, record) => (
        <div>
          <Text strong style={{ fontSize: 14, color: '#111827' }}>
            {record.name}
          </Text>
          <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {record.sku && (
              <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                SKU: {record.sku}
              </Tag>
            )}
            {record.barcode && (
              <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>
                <BarcodeOutlined /> {record.barcode}
              </Tag>
            )}
            {record.kiotviet_code && (
              <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>
                KV: {record.kiotviet_code}
              </Tag>
            )}
            <Tag style={{ margin: 0, fontSize: 11 }}>{record.unit || 'Cái'}</Tag>
          </div>
        </div>
      )
    },
    {
      title: 'Danh mục',
      key: 'category',
      width: 165,
      render: (_, record) => {
        const catName = record.category_id?.name || record.category || 'Khác';
        return (
          <Tooltip title={catName} placement="topLeft">
            <Tag
              color="geekblue"
              style={{
                fontWeight: 500,
                maxWidth: 145,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'inline-block',
                verticalAlign: 'middle',
                margin: 0
              }}
            >
              {catName}
            </Tag>
          </Tooltip>
        );
      }
    },
    {
      title: 'Giá bán / Giá vốn',
      key: 'prices',
      width: 160,
      render: (_, record) => (
        <div style={{ whiteSpace: 'nowrap' }}>
          <div style={{ fontWeight: 600, color: '#0d6e57' }}>
            {formatCurrency(record.sell_price)}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Vốn: {formatCurrency(record.cost_price)}
          </div>
        </div>
      )
    },
    {
      title: 'Tồn kho tổng',
      dataIndex: 'total_stock',
      key: 'total_stock',
      width: 140,
      sorter: (a, b) => (a.total_stock || 0) - (b.total_stock || 0),
      render: (stock, record) => {
        const num = stock || 0;
        let color = '#10b981';
        if (num === 0) color = '#ef4444';
        else if (num <= 5) color = '#f59e0b';

        return (
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color }}>
              {num}
            </span>{' '}
            <span style={{ fontSize: 12, color: '#6b7280' }}>{record.unit || 'Cái'}</span>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              {num === 0 ? 'Hết hàng' : num <= 5 ? 'Sắp hết' : 'Đủ tồn'}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Chu kỳ ZNS (Refill)',
      dataIndex: 'usage_cycle_days',
      key: 'usage_cycle_days',
      width: 140,
      render: (days) => (
        <Tooltip title="Số ngày khách dùng hết để tự động gửi Zalo ZNS nhắc mua lại">
          <Tag color="cyan" style={{ fontSize: 13, padding: '3px 10px', borderRadius: 6 }}>
            {days} ngày
          </Tag>
        </Tooltip>
      )
    },
    {
      title: 'Cảnh báo HSD',
      dataIndex: 'near_expiry_days',
      key: 'near_expiry_days',
      width: 120,
      render: (days) => (
        <span style={{ fontSize: 12, color: '#4b5563' }}>
          &le; {days || 90} ngày
        </span>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? 'Đang bán' : 'Ngừng bán'}
        </Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="Xem tất cả lô hàng của sản phẩm này">
            <Button
              size="small"
              icon={<InboxOutlined />}
              onClick={() => handleViewBatchesForProduct(record._id)}
              style={{ color: '#2563eb', borderColor: '#bfdbfe' }}
            >
              Xem Lô
            </Button>
          </Tooltip>

          {hasPermission(user, 'data_create') && (
            <Tooltip title="Nhập lô hàng mới cho sản phẩm này">
              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => handleOpenBatchModal(null, record._id)}
                style={{ color: '#0d6e57', borderColor: '#a7f3d0' }}
              >
                + Lô
              </Button>
            </Tooltip>
          )}

          {hasPermission(user, 'data_edit') && (
            <Tooltip title="Chỉnh sửa sản phẩm">
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleOpenProductModal(record)}
                style={{ color: '#4b5563' }}
              />
            </Tooltip>
          )}

          {hasPermission(user, 'data_delete') && (
            <Popconfirm
              title="Xóa sản phẩm này?"
              description="Toàn bộ thông tin sản phẩm sẽ bị xóa. Lô hàng liên quan vẫn giữ trong hệ thống."
              onConfirm={() => handleDeleteProduct(record._id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa sản phẩm">
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  // ═══════════════════════════════════════════════
  // COLUMNS: BATCH TABLE
  // ═══════════════════════════════════════════════
  const batchColumns = [
    {
      title: 'Mã Lô',
      dataIndex: 'batch_number',
      key: 'batch_number',
      width: 150,
      render: (batchNo) => (
        <span
          style={{
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#1e3a8a',
            background: '#eff6ff',
            padding: '3px 8px',
            borderRadius: 6,
            display: 'inline-block'
          }}
        >
          {batchNo}
        </span>
      )
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'product_id',
      key: 'product_id',
      width: 240,
      render: (prod) => {
        if (!prod) return <Text type="secondary">N/A</Text>;
        return (
          <div>
            <Text strong style={{ color: '#111827' }}>
              {prod.name}
            </Text>
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              {prod.sku ? `SKU: ${prod.sku} • ` : ''}ĐVT: {prod.unit || 'Cái'}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Hạn sử dụng',
      key: 'expiry_info',
      width: 170,
      sorter: (a, b) => new Date(a.expiry_date) - new Date(b.expiry_date),
      render: (_, record) => {
        const exp = record.expiry_date ? dayjs(record.expiry_date).format('DD/MM/YYYY') : 'N/A';
        const mfg = record.manufacturing_date ? dayjs(record.manufacturing_date).format('DD/MM/YYYY') : null;
        return (
          <div>
            <div style={{ fontWeight: 600, color: '#111827' }}>
              <CalendarOutlined style={{ marginRight: 6, color: '#0d6e57' }} />
              {exp}
            </div>
            {mfg && (
              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                NSX: {mfg}
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Tình trạng HSD',
      key: 'expiry_status',
      width: 170,
      render: (_, record) => {
        const st = record.computed_status || record.status;
        return renderBatchStatusTag(st, record.days_until_expiry);
      }
    },
    {
      title: 'Tồn kho / Nhập',
      key: 'stock',
      width: 180,
      sorter: (a, b) => a.quantity_in_stock - b.quantity_in_stock,
      render: (_, record) => {
        const inStock = record.quantity_in_stock || 0;
        const received = record.quantity_received || 1;
        const percent = Math.min(100, Math.round((inStock / received) * 100));

        let strokeColor = '#10b981';
        if (inStock === 0) strokeColor = '#9ca3af';
        else if (percent <= 20) strokeColor = '#ef4444';
        else if (percent <= 50) strokeColor = '#f59e0b';

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontWeight: 700, color: inStock > 0 ? '#111827' : '#9ca3af' }}>
                {inStock}
              </span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                / {received} {record.product_id?.unit || 'Cái'}
              </span>
            </div>
            <Progress percent={percent} size="small" strokeColor={strokeColor} showInfo={false} />
          </div>
        );
      }
    },
    {
      title: 'Giá nhập',
      dataIndex: 'cost_price',
      key: 'cost_price',
      width: 120,
      render: (price) => formatCurrency(price)
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      width: 140,
      ellipsis: true,
      render: (notes) => notes ? <span style={{ fontSize: 12, color: '#6b7280' }}>{notes}</span> : '-'
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_, record) => {
        const isDestroyed = record.status === 'destroyed';
        const isNearExpiry = (record.computed_status === 'near_expiry' || record.status === 'near_expiry' || (record.days_until_expiry !== undefined && record.days_until_expiry <= 90 && record.days_until_expiry > 0));

        return (
          <Space size="small">
            {/* Nút 1-Click: Xả hàng ZNS */}
            {hasPermission(user, 'campaign_create') && !isDestroyed && record.quantity_in_stock > 0 && isNearExpiry && (
              <Tooltip title="Tạo chiến dịch ZNS xả hàng giảm giá cho lô cận date này">
                <Button
                  size="small"
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={() => handleCreateClearanceCampaign(record)}
                  style={{
                    background: '#f59e0b',
                    borderColor: '#f59e0b',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: 12,
                    borderRadius: 6
                  }}
                >
                  Xả hàng
                </Button>
              </Tooltip>
            )}

            {hasPermission(user, 'data_edit') && (
              <Tooltip title="Chỉnh sửa lô">
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleOpenBatchModal(record)}
                  disabled={isDestroyed}
                  style={{ color: '#0d6e57' }}
                />
              </Tooltip>
            )}

            {hasPermission(user, 'data_edit') && !isDestroyed && (
              <Tooltip title="Hủy lô (không bán nữa)">
                <Button
                  size="small"
                  type="text"
                  icon={<StopOutlined />}
                  onClick={() => handleDestroyBatch(record)}
                  style={{ color: '#f59e0b' }}
                />
              </Tooltip>
            )}

            {hasPermission(user, 'data_delete') && (
              <Popconfirm
                title="Xóa lô hàng này?"
                description="Hành động này sẽ xóa vĩnh viễn dữ liệu lô hàng và tự động cập nhật lại tồn kho của sản phẩm."
                onConfirm={() => handleDeleteBatch(record._id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Xóa lô">
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <DashboardLayout title="Quản lý Sản phẩm & Lô hàng">
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
            Hàng Hóa & Quản Lý Lô - Hạn Sử Dụng
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Theo dõi danh mục sản phẩm, chu kỳ refill ZNS tự động và quản lý chi tiết từng lô hạn sử dụng (FEFO)
          </Text>
        </div>

        <Space size="middle">
          {activeTab === 'batches' && (
            <>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchBatches(filterBatchProduct);
                  fetchExpiryOverview();
                  messageApi.info('Đã làm mới danh sách lô');
                }}
                loading={loadingBatches}
              >
                Làm mới
              </Button>
              {hasPermission(user, 'data_edit') && (
                <Tooltip title="Chạy thuật toán kiểm tra lại HSD tất cả các lô và đồng bộ cảnh báo">
                  <Button
                    icon={<ClockCircleOutlined />}
                    onClick={handleScanExpiry}
                    loading={scanningExpiry}
                    style={{ borderColor: '#f59e0b', color: '#b45309', fontWeight: 600 }}
                  >
                    Quét HSD ngay
                  </Button>
                </Tooltip>
              )}
            </>
          )}

          {activeTab === 'products' ? (
            hasPermission(user, 'data_create') && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                style={{
                  background: 'linear-gradient(135deg, #0d6e57 0%, #10b981 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(13, 110, 87, 0.25)',
                  fontWeight: 600
                }}
                onClick={() => handleOpenProductModal()}
              >
                Thêm Sản phẩm Mới
              </Button>
            )
          ) : (
            hasPermission(user, 'data_create') && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                style={{
                  background: 'linear-gradient(135deg, #0d6e57 0%, #10b981 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(13, 110, 87, 0.25)',
                  fontWeight: 600
                }}
                onClick={() => handleOpenBatchModal()}
              >
                Nhập Lô Hàng Mới
              </Button>
            )
          )}
        </Space>
      </div>

      {/* KPI METRIC CARDS */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {activeTab === 'products' ? (
          <>
            <Col xs={12} sm={6} lg={6}>
              <Card
                bordered={false}
                style={{
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                  borderLeft: '4px solid #10b981'
                }}
              >
                <Statistic
                  title={<span style={{ color: '#4b5563', fontSize: 13 }}>Tổng sản phẩm</span>}
                  value={productKpis.totalCount}
                  valueStyle={{ color: '#0d6e57', fontWeight: 700 }}
                  prefix={<AppstoreOutlined />}
                  suffix={<span style={{ fontSize: 13, color: '#6b7280' }}>mặt hàng</span>}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6} lg={6}>
              <Card
                bordered={false}
                style={{
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
                  borderLeft: '4px solid #3b82f6'
                }}
              >
                <Statistic
                  title={<span style={{ color: '#4b5563', fontSize: 13 }}>Đang kinh doanh</span>}
                  value={productKpis.activeCount}
                  valueStyle={{ color: '#2563eb', fontWeight: 700 }}
                  prefix={<CheckCircleOutlined />}
                  suffix={<span style={{ fontSize: 13, color: '#6b7280' }}>active</span>}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6} lg={6}>
              <Card
                bordered={false}
                style={{
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #ffffff 100%)',
                  borderLeft: '4px solid #f59e0b'
                }}
              >
                <Statistic
                  title={<span style={{ color: '#4b5563', fontSize: 13 }}>Tổng số lượng tồn</span>}
                  value={productKpis.totalStock}
                  valueStyle={{ color: '#d97706', fontWeight: 700 }}
                  prefix={<InboxOutlined />}
                  suffix={<span style={{ fontSize: 13, color: '#6b7280' }}>đơn vị</span>}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6} lg={6}>
              <Card
                bordered={false}
                style={{
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  background: 'linear-gradient(135deg, #fdf2f8 0%, #ffffff 100%)',
                  borderLeft: '4px solid #ec4899'
                }}
              >
                <Statistic
                  title={<span style={{ color: '#4b5563', fontSize: 13 }}>Giá trị tồn (vốn)</span>}
                  value={productKpis.totalInventoryValue}
                  formatter={(val) => formatCurrency(val)}
                  valueStyle={{ color: '#be185d', fontWeight: 700, fontSize: 20 }}
                />
              </Card>
            </Col>
          </>
        ) : (
          <>
            <Col xs={12} sm={4} lg={4}>
              <Card
                bordered={false}
                style={{
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  borderLeft: '4px solid #3b82f6'
                }}
              >
                <Statistic
                  title={<span style={{ color: '#4b5563', fontSize: 12 }}>Tổng số lô</span>}
                  value={batchKpis.total}
                  valueStyle={{ color: '#2563eb', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={5} lg={5}>
              <Card
                bordered={false}
                style={{
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  borderLeft: '4px solid #10b981'
                }}
              >
                <Statistic
                  title={<span style={{ color: '#4b5563', fontSize: 12 }}>Lô an toàn (còn hạn)</span>}
                  value={batchKpis.active}
                  valueStyle={{ color: '#10b981', fontWeight: 700 }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={5} lg={5}>
              <Card
                bordered={false}
                style={{
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  borderLeft: '4px solid #f59e0b',
                  background: batchKpis.nearExpiry > 0 ? '#fffbeb' : '#ffffff'
                }}
              >
                <Statistic
                  title={<span style={{ color: '#4b5563', fontSize: 12 }}>Cận date (sắp hết)</span>}
                  value={batchKpis.nearExpiry}
                  valueStyle={{ color: '#d97706', fontWeight: 700 }}
                  prefix={<WarningOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={5} lg={5}>
              <Card
                bordered={false}
                style={{
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  borderLeft: '4px solid #ef4444',
                  background: batchKpis.expired > 0 ? '#fef2f2' : '#ffffff'
                }}
              >
                <Statistic
                  title={<span style={{ color: '#4b5563', fontSize: 12 }}>Đã hết hạn</span>}
                  value={batchKpis.expired}
                  valueStyle={{ color: '#dc2626', fontWeight: 700 }}
                  prefix={<CloseCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={5} lg={5}>
              <Card
                bordered={false}
                style={{
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  borderLeft: '4px solid #6b7280'
                }}
              >
                <Statistic
                  title={<span style={{ color: '#4b5563', fontSize: 12 }}>Tổng tồn trong lô</span>}
                  value={batchKpis.totalStock}
                  valueStyle={{ color: '#374151', fontWeight: 700 }}
                  prefix={<InboxOutlined />}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      {/* CẢNH BÁO CẬN DATE NẾU CÓ */}
      {expiryStats?.expired?.count > 0 && (
        <Alert
          message={
            <span>
              <strong>Cảnh báo tồn kho:</strong> Có <strong>{expiryStats.expired.count}</strong> lô hàng đã hết hạn sử dụng nhưng vẫn còn tồn kho! Vui lòng kiểm tra và xử lý hủy hoặc hoàn trả.
            </span>
          }
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16, borderRadius: 10 }}
        />
      )}

      {/* MAIN CONTENT CARD WITH TABS */}
      <Card
        bordered={false}
        style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        bodyStyle={{ padding: '0 24px 24px 24px' }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            if (key === 'batches' && batches.length === 0) {
              fetchBatches();
            }
          }}
          size="large"
          tabBarStyle={{ marginBottom: 20 }}
          items={[
            {
              key: 'products',
              label: (
                <span style={{ fontWeight: 600, fontSize: 15 }}>
                  <AppstoreOutlined style={{ marginRight: 8 }} />
                  Danh Mục Hàng Hóa ({products.length})
                </span>
              ),
              children: (
                <div>
                  {/* FILTERS TOOLBAR */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      marginBottom: 16,
                      flexWrap: 'wrap',
                      alignItems: 'center'
                    }}
                  >
                    <Input
                      placeholder="Tìm tên sản phẩm, SKU, Barcode, KiotViet..."
                      prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                      style={{ maxWidth: 360 }}
                      size="middle"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      allowClear
                    />

                    <Select
                      value={filterCategory}
                      onChange={setFilterCategory}
                      style={{ minWidth: 200 }}
                      placeholder="Tất cả danh mục"
                      showSearch
                      optionFilterProp="children"
                    >
                      <Select.Option value="all">Tất cả danh mục ({products.length})</Select.Option>
                      {allCategories.map((c) => {
                        const count = products.filter(p => (p.category_id?.name || p.category) === c.name).length;
                        return (
                          <Select.Option key={c.id || c.name} value={c.name}>
                            {c.name} {count > 0 ? `(${count})` : ''}
                          </Select.Option>
                        );
                      })}
                    </Select>

                    <Select
                      value={filterProductStatus}
                      onChange={setFilterProductStatus}
                      style={{ width: 150 }}
                      placeholder="Trạng thái"
                    >
                      <Select.Option value="all">Tất cả trạng thái</Select.Option>
                      <Select.Option value="active">Đang bán</Select.Option>
                      <Select.Option value="inactive">Ngừng bán</Select.Option>
                    </Select>

                    {(productSearch || filterCategory !== 'all' || filterProductStatus !== 'all') && (
                      <Button
                        type="link"
                        onClick={() => {
                          setProductSearch('');
                          setFilterCategory('all');
                          setFilterProductStatus('all');
                        }}
                      >
                        Xóa bộ lọc
                      </Button>
                    )}

                    {hasPermission(user, 'data_delete') && selectedProductKeys.length > 0 && (
                      <Popconfirm
                        title={`Xác nhận xóa ${selectedProductKeys.length} sản phẩm đã chọn?`}
                        description="Hành động này sẽ xóa các sản phẩm được chọn khỏi hệ thống."
                        onConfirm={handleBulkDeleteProducts}
                        okText="Xóa tất cả"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true, loading: bulkDeleteLoading }}
                      >
                        <Button
                          danger
                          type="primary"
                          icon={<DeleteOutlined />}
                        >
                          Xóa ({selectedProductKeys.length}) sản phẩm đã chọn
                        </Button>
                      </Popconfirm>
                    )}
                  </div>

                  {/* PRODUCTS TABLE */}
                  <Table
                    columns={productColumns}
                    dataSource={filteredProducts}
                    rowKey="_id"
                    loading={loadingProducts}
                    rowSelection={{
                      selectedRowKeys: selectedProductKeys,
                      onChange: (keys) => setSelectedProductKeys(keys)
                    }}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50'],
                      showTotal: (total, range) => `${range[0]}-${range[1]} trên tổng ${total} sản phẩm`
                    }}
                    scroll={{ x: 1300 }}
                  />
                </div>
              )
            },
            {
              key: 'batches',
              label: (
                <span style={{ fontWeight: 600, fontSize: 15 }}>
                  <CalendarOutlined style={{ marginRight: 8 }} />
                  Quản Lý Lô - Hạn Sử Dụng ({batches.length})
                </span>
              ),
              children: (
                <div>
                  {/* BATCH FILTERS TOOLBAR */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      marginBottom: 16,
                      flexWrap: 'wrap',
                      alignItems: 'center'
                    }}
                  >
                    <Input
                      placeholder="Tìm theo mã lô hoặc tên sản phẩm..."
                      prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                      style={{ maxWidth: 320 }}
                      size="middle"
                      value={batchSearch}
                      onChange={(e) => setBatchSearch(e.target.value)}
                      allowClear
                    />

                    <Select
                      value={filterBatchProduct}
                      onChange={(val) => {
                        setFilterBatchProduct(val);
                        fetchBatches(val);
                      }}
                      style={{ minWidth: 240, maxWidth: 320 }}
                      showSearch
                      optionFilterProp="children"
                      placeholder="Chọn sản phẩm để lọc"
                    >
                      <Select.Option value="all">Tất cả sản phẩm</Select.Option>
                      {products.map((p) => (
                        <Select.Option key={p._id} value={p._id}>
                          {p.name} {p.sku ? `(${p.sku})` : ''}
                        </Select.Option>
                      ))}
                    </Select>

                    <Select
                      value={filterBatchStatus}
                      onChange={setFilterBatchStatus}
                      style={{ width: 170 }}
                      placeholder="Trạng thái lô"
                    >
                      <Select.Option value="all">Tất cả trạng thái</Select.Option>
                      <Select.Option value="active">Còn hạn (An toàn)</Select.Option>
                      <Select.Option value="near_expiry">Cận date</Select.Option>
                      <Select.Option value="expired">Đã hết hạn</Select.Option>
                      <Select.Option value="sold_out">Đã hết hàng</Select.Option>
                      <Select.Option value="destroyed">Đã hủy</Select.Option>
                    </Select>

                    {filterBatchProduct !== 'all' && (
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => handleRefreshProductBatches(filterBatchProduct)}
                      >
                        Quét lại HSD
                      </Button>
                    )}

                    {(batchSearch || filterBatchProduct !== 'all' || filterBatchStatus !== 'all') && (
                      <Button
                        type="link"
                        onClick={() => {
                          setBatchSearch('');
                          setFilterBatchProduct('all');
                          setFilterBatchStatus('all');
                          fetchBatches('all');
                        }}
                      >
                        Xóa bộ lọc
                      </Button>
                    )}

                    {hasPermission(user, 'data_delete') && selectedBatchKeys.length > 0 && (
                      <Popconfirm
                        title={`Xác nhận xóa ${selectedBatchKeys.length} lô hàng đã chọn?`}
                        description="Hành động này sẽ xóa các lô hàng được chọn và cập nhật lại tồn kho sản phẩm."
                        onConfirm={handleBulkDeleteBatches}
                        okText="Xóa tất cả"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true, loading: bulkDeleteLoading }}
                      >
                        <Button
                          danger
                          type="primary"
                          icon={<DeleteOutlined />}
                        >
                          Xóa ({selectedBatchKeys.length}) lô đã chọn
                        </Button>
                      </Popconfirm>
                    )}
                  </div>

                  {/* BATCHES TABLE */}
                  <Table
                    columns={batchColumns}
                    dataSource={filteredBatches}
                    rowKey="_id"
                    loading={loadingBatches}
                    rowSelection={{
                      selectedRowKeys: selectedBatchKeys,
                      onChange: (keys) => setSelectedBatchKeys(keys)
                    }}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '25', '50'],
                      showTotal: (total, range) => `${range[0]}-${range[1]} trên tổng ${total} lô hàng`
                    }}
                    scroll={{ x: 1300 }}
                  />
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* ═══════════════════════════════════════════════
          MODAL: THÊM / SỬA SẢN PHẨM
      ═══════════════════════════════════════════════ */}
      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {editingProduct ? 'Chỉnh Sửa Thông Tin Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
          </div>
        }
        open={isProductModalVisible}
        onOk={() => formProduct.submit()}
        onCancel={handleCloseProductModal}
        okText="Lưu Sản Phẩm"
        cancelText="Hủy"
        width={720}
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #0d6e57 0%, #10b981 100%)',
            border: 'none',
            fontWeight: 600
          }
        }}
      >
        <Form
          form={formProduct}
          layout="vertical"
          onFinish={handleSaveProduct}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 600 }}>Tên sản phẩm</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}
          >
            <Input placeholder="VD: Bỉm Merries First Premium Dán Size S" size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category_id"
                label={<span style={{ fontWeight: 600 }}>Danh mục</span>}
                rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}
              >
                <TreeSelect
                  size="large"
                  placeholder="Chọn danh mục sản phẩm"
                  treeData={categoryTreeSelectData}
                  allowClear
                  showSearch
                  treeDefaultExpandAll
                  treeNodeFilterProp="title"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit"
                label={<span style={{ fontWeight: 600 }}>Đơn vị tính</span>}
                rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập đơn vị' }]}
              >
                <Select
                  size="large"
                  placeholder="Chọn đơn vị tính"
                  showSearch
                >
                  {DEFAULT_UNITS.map((u) => (
                    <Select.Option key={u} value={u}>
                      {u}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sku"
                label={<span style={{ fontWeight: 600 }}>Mã SKU</span>}
                extra="Mã định danh nội bộ (VD: BIM-MER-S-60)"
              >
                <Input placeholder="VD: BIM-MER-S-60" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="barcode"
                label={<span style={{ fontWeight: 600 }}>Mã vạch (Barcode)</span>}
                extra="Dùng quét mã bán hàng tại quầy POS (GĐ3)"
              >
                <Input placeholder="VD: 8935000123456" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sell_price"
                label={<span style={{ fontWeight: 600 }}>Giá bán lẻ (VNĐ)</span>}
              >
                <InputNumber
                  min={0}
                  step={1000}
                  size="large"
                  style={{ width: '100%' }}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => val.replace(/\$\s?|(,*)/g, '')}
                  addonAfter="đ"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="cost_price"
                label={<span style={{ fontWeight: 600 }}>Giá vốn mặc định (VNĐ)</span>}
              >
                <InputNumber
                  min={0}
                  step={1000}
                  size="large"
                  style={{ width: '100%' }}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => val.replace(/\$\s?|(,*)/g, '')}
                  addonAfter="đ"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0 16px 0' }} />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="usage_cycle_days"
                label={<span style={{ fontWeight: 600 }}>Chu kỳ sử dụng ước tính (Ngày)</span>}
                rules={[{ required: true, message: 'Vui lòng nhập chu kỳ sử dụng' }]}
                extra="Số ngày dự kiến khách dùng hết, dùng để tự động kích hoạt chiến dịch ZNS chăm sóc mua lại."
              >
                <InputNumber
                  min={1}
                  max={365}
                  size="large"
                  style={{ width: '100%' }}
                  addonAfter="Ngày"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="near_expiry_days"
                label={<span style={{ fontWeight: 600 }}>Ngưỡng cảnh báo cận date (Ngày)</span>}
                extra="Lô hàng sẽ cảnh báo khi hạn dùng còn lại &le; số ngày này (mặc định 90 ngày)."
              >
                <InputNumber
                  min={1}
                  max={730}
                  size="large"
                  style={{ width: '100%' }}
                  addonAfter="Ngày"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label={<span style={{ fontWeight: 600 }}>Trạng thái</span>}
              >
                <Select size="large">
                  <Select.Option value="active">Đang bán</Select.Option>
                  <Select.Option value="inactive">Ngừng bán</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="description"
                label={<span style={{ fontWeight: 600 }}>Mô tả ngắn</span>}
              >
                <Input placeholder="Mô tả sản phẩm, quy cách đóng gói..." size="large" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ═══════════════════════════════════════════════
          MODAL: THÊM / SỬA LÔ HÀNG (PRODUCT BATCH)
      ═══════════════════════════════════════════════ */}
      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {editingBatch ? `Cập Nhật Lô Hàng: ${editingBatch.batch_number}` : 'Nhập Lô Hàng Mới'}
          </div>
        }
        open={isBatchModalVisible}
        onOk={() => formBatch.submit()}
        onCancel={handleCloseBatchModal}
        okText={editingBatch ? 'Lưu Thay Đổi' : 'Xác Nhận Nhập Lô'}
        cancelText="Hủy"
        width={680}
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #0d6e57 0%, #10b981 100%)',
            border: 'none',
            fontWeight: 600
          }
        }}
      >
        <Form
          form={formBatch}
          layout="vertical"
          onFinish={handleSaveBatch}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="product_id"
            label={<span style={{ fontWeight: 600 }}>Sản phẩm</span>}
            rules={[{ required: true, message: 'Vui lòng chọn sản phẩm' }]}
          >
            <Select
              size="large"
              placeholder="Chọn sản phẩm"
              showSearch
              disabled={!!editingBatch || !!presetProductForBatch}
              optionFilterProp="children"
            >
              {products.map((p) => (
                <Select.Option key={p._id} value={p._id}>
                  {p.name} {p.sku ? `(SKU: ${p.sku})` : ''} — Tồn hiện tại: {p.total_stock || 0}{' '}
                  {p.unit || 'Cái'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="batch_number"
                label={<span style={{ fontWeight: 600 }}>Số lô / Mã lô (Batch Number)</span>}
                rules={[{ required: true, message: 'Vui lòng nhập mã lô' }]}
                extra="Mã in trên bao bì (VD: LOT-2026-001)"
              >
                <Input placeholder="VD: LOT-2026-001" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="cost_price"
                label={<span style={{ fontWeight: 600 }}>Giá nhập mỗi đơn vị (VNĐ)</span>}
              >
                <InputNumber
                  min={0}
                  step={1000}
                  size="large"
                  style={{ width: '100%' }}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => val.replace(/\$\s?|(,*)/g, '')}
                  addonAfter="đ"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="manufacturing_date"
                label={<span style={{ fontWeight: 600 }}>Ngày sản xuất (NSX)</span>}
                extra="Không bắt buộc nếu bao bì không ghi"
              >
                <DatePicker
                  size="large"
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                  placeholder="Chọn ngày sản xuất"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expiry_date"
                label={<span style={{ fontWeight: 600 }}>Hạn sử dụng (HSD / Best Before)</span>}
                rules={[{ required: true, message: 'Vui lòng chọn hạn sử dụng' }]}
                extra="Bắt buộc — dùng để tính FEFO khi xuất hàng"
              >
                <DatePicker
                  size="large"
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                  placeholder="Chọn hạn sử dụng"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={editingBatch ? 12 : 24}>
              <Form.Item
                name="quantity_received"
                label={<span style={{ fontWeight: 600 }}>Số lượng nhập ban đầu</span>}
                rules={[{ required: true, message: 'Vui lòng nhập số lượng nhập' }]}
              >
                <InputNumber
                  min={1}
                  size="large"
                  style={{ width: '100%' }}
                  placeholder="VD: 50"
                  disabled={!!editingBatch} // Khi sửa chỉ điều chỉnh tồn kho thực tế
                />
              </Form.Item>
            </Col>

            {editingBatch && (
              <Col span={12}>
                <Form.Item
                  name="quantity_in_stock"
                  label={<span style={{ fontWeight: 600 }}>Tồn kho thực tế hiện tại</span>}
                  rules={[{ required: true, message: 'Vui lòng nhập số lượng tồn' }]}
                  extra="Điều chỉnh tồn kho thực tế của lô này"
                >
                  <InputNumber
                    min={0}
                    size="large"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Form.Item
            name="notes"
            label={<span style={{ fontWeight: 600 }}>Ghi chú lô hàng</span>}
          >
            <Input.TextArea
              rows={2}
              placeholder="Ghi chú nhà cung cấp, tình trạng tem mác, vị trí kệ hàng..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
