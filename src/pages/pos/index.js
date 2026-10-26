import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import {
  Typography,
  Card,
  Input,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  Radio,
  InputNumber,
  Badge,
  Tooltip,
  Drawer,
  Row,
  Col,
  Divider,
  Popconfirm,
  App,
  AutoComplete,
  Switch
} from 'antd';
import {
  BarcodeOutlined,
  SearchOutlined,
  UserOutlined,
  UserAddOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  PrinterOutlined,
  HistoryOutlined,
  ArrowLeftOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  SwapOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  WalletOutlined,
  BankOutlined,
  CloseOutlined
} from '@ant-design/icons';
import handleAPI from '../../apis/handleAPI';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// Mẫu định dạng tiền tệ VND
const formatMoney = (val) => Number(val || 0).toLocaleString('vi-VN') + ' đ';

// Định dạng ngày
const formatDate = (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '---');

export default function PosPage() {
  const router = useRouter();
  const { token, user } = useSelector((state) => state.auth);
  const { message: messageApi, modal: modalApi } = App.useApp();

  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    setMounted(true);
    setCurrentTime(dayjs().format('HH:mm:ss DD/MM/YYYY'));
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format('HH:mm:ss DD/MM/YYYY'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.push('/login');
    }
  }, [mounted, token, router]);

  // ═══════════════════════════════════════════════════
  // MULTI-TABS HÓA ĐƠN CHỜ
  // ═══════════════════════════════════════════════════
  const [tabs, setTabs] = useState([
    {
      id: 'tab-1',
      title: 'Hóa đơn 1',
      customer: null,
      items: [],
      discountType: 'VND',
      discountValue: 0,
      paymentMethod: 'CASH',
      amountPaid: 0,
      notes: ''
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  // Lấy dữ liệu tab hiện tại
  const currentTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Cập nhật thuộc tính của tab hiện tại
  const updateCurrentTab = (updatedFields) => {
    setTabs((prevTabs) =>
      prevTabs.map((t) => (t.id === activeTabId ? { ...t, ...updatedFields } : t))
    );
  };

  // Thêm tab hóa đơn mới (tối đa 8 tab chờ)
  const handleAddNewTab = () => {
    if (tabs.length >= 8) {
      messageApi.warning('Chỉ hỗ trợ mở tối đa 8 hóa đơn chờ cùng lúc');
      return;
    }
    const newId = `tab-${Date.now()}`;
    const newTabNumber = tabs.length + 1;
    const newTab = {
      id: newId,
      title: `Hóa đơn ${newTabNumber}`,
      customer: null,
      items: [],
      discountType: 'VND',
      discountValue: 0,
      paymentMethod: 'CASH',
      amountPaid: 0,
      notes: ''
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  // Đóng tab hóa đơn
  const handleCloseTab = (tabIdToClose, e) => {
    if (e) e.stopPropagation();
    if (tabs.length === 1) {
      // Nếu chỉ còn 1 tab -> reset sạch data
      updateCurrentTab({
        customer: null,
        items: [],
        discountType: 'VND',
        discountValue: 0,
        paymentMethod: 'CASH',
        amountPaid: 0,
        notes: ''
      });
      messageApi.info('Đã làm mới hóa đơn');
      return;
    }

    const targetTab = tabs.find((t) => t.id === tabIdToClose);
    if (targetTab && targetTab.items.length > 0) {
      modalApi.confirm({
        title: 'Đóng hóa đơn đang bán?',
        content: `Hóa đơn "${targetTab.title}" đang có ${targetTab.items.length} món hàng. Bạn có chắc muốn xóa không?`,
        okText: 'Xác nhận xóa',
        okType: 'danger',
        cancelText: 'Hủy',
        onOk: () => {
          doCloseTab(tabIdToClose);
        }
      });
    } else {
      doCloseTab(tabIdToClose);
    }
  };

  const doCloseTab = (tabIdToClose) => {
    const newTabs = tabs.filter((t) => t.id !== tabIdToClose);
    setTabs(newTabs);
    if (activeTabId === tabIdToClose) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  // ═══════════════════════════════════════════════════
  // TÌM KIẾM SẢN PHẨM & MÁY QUÉT MÃ VẠCH
  // ═══════════════════════════════════════════════════
  const [productSearchText, setProductSearchText] = useState('');
  const [productOptions, setProductOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef(null);
  const customerSearchRef = useRef(null);

  // Auto-focus ô tìm kiếm sản phẩm khi vào trang
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeTabId]);

  // Format từng option sản phẩm hiển thị trong dropdown
  const formatProductOption = (prod) => {
    const fefoBatch = prod.fefo_batch;
    const hasStock = prod.total_stock > 0;
    return {
      value: prod._id,
      product: prod,
      label: (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 0',
            borderBottom: '1px dashed #f3f4f6'
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>
              {prod.name}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              <span>Mã: {prod.barcode || prod.sku || '---'}</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <span>ĐVT: {prod.unit || 'Cái'}</span>
              {fefoBatch && (
                <span style={{ marginLeft: 8, color: '#059669' }}>
                  <ThunderboltOutlined /> FEFO: Lô {fefoBatch.batch_number} (HSD: {formatDate(fefoBatch.expiry_date)})
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#0d6e57', fontWeight: 700, fontSize: 15 }}>
              {formatMoney(prod.sell_price)}
            </div>
            <div>
              {hasStock ? (
                <Tag color="success">Còn {prod.total_stock}</Tag>
              ) : (
                <Tag color="error">Hết hàng</Tag>
              )}
            </div>
          </div>
        </div>
      )
    };
  };

  const [inStockOnly, setInStockOnly] = useState(true);
  const [totalFoundCount, setTotalFoundCount] = useState(0);

  // Load danh sách sản phẩm (hỗ trợ inStockOnly, limit=300 để tải toàn bộ danh mục)
  const loadProductOptions = async (query = '', onlyInStock = inStockOnly) => {
    setSearchLoading(true);
    try {
      const q = encodeURIComponent((query || '').trim());
      const res = await handleAPI(`/api/pos/products?q=${q}&inStock=${onlyInStock}&limit=300`, null, 'get');
      const products = Array.isArray(res) ? res : [];
      setTotalFoundCount(products.length);
      setProductOptions(products.map(formatProductOption));
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Tự động nạp sản phẩm gợi ý khi mở trang POS
  useEffect(() => {
    if (mounted && token) {
      loadProductOptions('', inStockOnly);
    }
  }, [mounted, token]);

  // Chuyển đổi bộ lọc Chỉ hàng còn tồn / Tất cả
  const handleToggleInStockOnly = (checked) => {
    setInStockOnly(checked);
    loadProductOptions(productSearchText, checked);
  };

  // Tìm kiếm sản phẩm khi người dùng gõ
  const handleSearchProducts = (value) => {
    setProductSearchText(value);
    loadProductOptions(value, inStockOnly);
  };

  // Thêm sản phẩm vào giỏ hàng của tab hiện tại
  const handleSelectProduct = (productId, option) => {
    const prod = option?.product;
    if (!prod) return;

    if (!prod.available_batches || prod.available_batches.length === 0) {
      messageApi.error(`Sản phẩm "${prod.name}" hiện không có lô hàng nào còn tồn kho`);
      setProductSearchText('');
      setProductOptions([]);
      return;
    }

    // Chọn lô FEFO mặc định (lô đầu tiên còn hạn gần nhất)
    const bestBatch = prod.fefo_batch || prod.available_batches[0];

    const currentItems = currentTab.items || [];
    const existingIndex = currentItems.findIndex(
      (item) => String(item.product_id) === String(prod._id) && String(item.batch_id) === String(bestBatch._id)
    );

    if (existingIndex > -1) {
      // Đã có trong giỏ với đúng lô này -> Tăng số lượng lên 1
      const item = currentItems[existingIndex];
      if (item.quantity + 1 > bestBatch.quantity_in_stock) {
        messageApi.warning(
          `Lô ${bestBatch.batch_number} chỉ còn tồn ${bestBatch.quantity_in_stock} sản phẩm`
        );
        return;
      }
      const updatedItems = [...currentItems];
      const newQty = item.quantity + 1;
      const subtotal = Math.max(0, newQty * item.unit_price - item.discount);
      updatedItems[existingIndex] = {
        ...item,
        quantity: newQty,
        subtotal
      };
      updateCurrentTab({ items: updatedItems });
      messageApi.success(`+1 ${prod.name}`);
    } else {
      // Chưa có -> Thêm dòng mới
      const newItem = {
        product_id: prod._id,
        product_name: prod.name,
        product_sku: prod.sku || prod.barcode || '',
        unit: prod.unit || 'Cái',
        batch_id: bestBatch._id,
        batch_number: bestBatch.batch_number,
        expiry_date: bestBatch.expiry_date,
        batch_stock: bestBatch.quantity_in_stock,
        available_batches: prod.available_batches,
        quantity: 1,
        unit_price: prod.sell_price || 0,
        discount: 0,
        subtotal: prod.sell_price || 0
      };
      updateCurrentTab({ items: [newItem, ...currentItems] });
      messageApi.success(`Đã thêm ${prod.name}`);
    }

    // Reset ô tìm kiếm và focus lại để quét mã vạch tiếp theo
    setProductSearchText('');
    setProductOptions([]);
    setTimeout(() => {
      if (searchInputRef.current) searchInputRef.current.focus();
    }, 50);
  };

  // Cập nhật số lượng của dòng sản phẩm
  const handleChangeItemQuantity = (index, newQuantity) => {
    const qty = Number(newQuantity);
    if (isNaN(qty) || qty <= 0) return;

    const currentItems = [...currentTab.items];
    const item = currentItems[index];

    if (qty > item.batch_stock) {
      messageApi.warning(`Lô ${item.batch_number} chỉ còn tồn ${item.batch_stock} sản phẩm`);
      return;
    }

    item.quantity = qty;
    item.subtotal = Math.max(0, qty * item.unit_price - (item.discount || 0));
    updateCurrentTab({ items: currentItems });
  };

  // Xóa 1 dòng khỏi giỏ hàng
  const handleRemoveItem = (index) => {
    const currentItems = [...currentTab.items];
    currentItems.splice(index, 1);
    updateCurrentTab({ items: currentItems });
  };

  // ═══════════════════════════════════════════════════
  // MODAL ĐỔI LÔ HÀNG (FEFO SWITCHER)
  // ═══════════════════════════════════════════════════
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [productBatchesForModal, setProductBatchesForModal] = useState([]);
  const [batchModalLoading, setBatchModalLoading] = useState(false);

  const handleOpenBatchModal = async (index) => {
    const item = currentTab.items[index];
    setSelectedItemIndex(index);
    setBatchModalVisible(true);
    setBatchModalLoading(true);

    try {
      const batches = await handleAPI(`/api/pos/products/${item.product_id}/batches`, null, 'get');
      setProductBatchesForModal(Array.isArray(batches) ? batches : []);
    } catch (err) {
      console.error(err);
      messageApi.error('Lỗi khi tải danh sách lô hàng');
    } finally {
      setBatchModalLoading(false);
    }
  };

  const handleSelectNewBatch = (newBatch) => {
    if (selectedItemIndex === null) return;
    const currentItems = [...currentTab.items];
    const item = currentItems[selectedItemIndex];

    item.batch_id = newBatch._id;
    item.batch_number = newBatch.batch_number;
    item.expiry_date = newBatch.expiry_date;
    item.batch_stock = newBatch.quantity_in_stock;

    // Nếu số lượng hiện tại vượt quá tồn kho của lô mới, hạ xuống bằng tồn kho
    if (item.quantity > newBatch.quantity_in_stock) {
      item.quantity = newBatch.quantity_in_stock;
      item.subtotal = Math.max(0, item.quantity * item.unit_price - item.discount);
      messageApi.info(`Đã điều chỉnh số lượng về ${item.quantity} theo tồn kho lô mới`);
    }

    updateCurrentTab({ items: currentItems });
    setBatchModalVisible(false);
    messageApi.success(`Đã đổi sang Lô: ${newBatch.batch_number}`);
  };

  // ═══════════════════════════════════════════════════
  // KHÁCH HÀNG & TẠO KHÁCH NHANH
  // ═══════════════════════════════════════════════════
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [customerOptions, setCustomerOptions] = useState([]);
  const [isCustomerModalVisible, setIsCustomerModalVisible] = useState(false);
  const [customerForm] = Form.useForm();
  const [createCustomerLoading, setCreateCustomerLoading] = useState(false);

  // Tìm khách hàng theo SĐT / Tên
  const handleSearchCustomers = async (value) => {
    setCustomerSearchText(value);
    if (!value || !value.trim()) {
      setCustomerOptions([]);
      return;
    }

    try {
      const customers = await handleAPI(`/api/pos/customers?q=${encodeURIComponent(value.trim())}`, null, 'get');
      const options = (Array.isArray(customers) ? customers : []).map((c) => ({
        value: c._id,
        customer: c,
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <div>
              <span style={{ fontWeight: 600, color: '#111827' }}>{c.name}</span>
              <span style={{ marginLeft: 8, color: '#0d6e57', fontWeight: 500 }}>{c.phone}</span>
            </div>
            {c.baby_name && (
              <span style={{ fontSize: 12, color: '#6b7280' }}>Bé: {c.baby_name}</span>
            )}
          </div>
        )
      }));
      setCustomerOptions(options);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCustomer = (customerId, option) => {
    const cust = option?.customer;
    if (cust) {
      updateCurrentTab({ customer: cust });
      setCustomerSearchText('');
      setCustomerOptions([]);
      messageApi.success(`Đã chọn khách hàng: ${cust.name}`);
    }
  };

  const handleRemoveCustomer = () => {
    updateCurrentTab({ customer: null });
  };

  // Submit tạo nhanh khách hàng
  const handleCreateQuickCustomer = async (values) => {
    setCreateCustomerLoading(true);
    try {
      const res = await handleAPI('/api/pos/customers', values, 'post');
      updateCurrentTab({ customer: res });
      setIsCustomerModalVisible(false);
      customerForm.resetFields();
      messageApi.success(`Đã lưu khách hàng ${res.name} (${res.phone})`);
    } catch (err) {
      console.error(err);
      messageApi.error(err.response?.data?.message || 'Tạo khách hàng thất bại');
    } finally {
      setCreateCustomerLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // TÍNH TOÁN TỔNG TIỀN & THANH TOÁN
  // ═══════════════════════════════════════════════════
  const subtotalAmount = (currentTab.items || []).reduce(
    (sum, item) => sum + (Number(item.subtotal) || 0),
    0
  );

  const discountType = currentTab.discountType || 'VND';
  const discountVal = Number(currentTab.discountValue) || 0;

  // Tính số tiền giảm giá quy đổi ra VNĐ
  const discountAmount =
    discountType === 'PERCENT'
      ? Math.round((subtotalAmount * Math.min(100, Math.max(0, discountVal))) / 100)
      : Math.min(subtotalAmount, Math.max(0, discountVal));

  const finalAmount = Math.max(0, subtotalAmount - discountAmount);
  const amountPaid = Number(currentTab.amountPaid) || 0;
  const changeAmount = Math.max(0, amountPaid - finalAmount);

  // Gợi ý tiền mặt nhanh
  const quickCashSuggestions = [
    finalAmount,
    Math.ceil(finalAmount / 50000) * 50000,
    Math.ceil(finalAmount / 100000) * 100000,
    Math.ceil(finalAmount / 200000) * 200000,
    Math.ceil(finalAmount / 500000) * 500000
  ].filter((val, idx, arr) => val >= finalAmount && arr.indexOf(val) === idx && val > 0);

  // In hóa đơn nhiệt
  const [completedOrderForPrint, setCompletedOrderForPrint] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleCheckout = async (autoPrint = false) => {
    if (!currentTab.items || currentTab.items.length === 0) {
      messageApi.warning('Hóa đơn chưa có sản phẩm nào để thanh toán');
      return;
    }

    if (currentTab.paymentMethod === 'CASH' && amountPaid < finalAmount) {
      messageApi.warning('Số tiền khách đưa chưa đủ để thanh toán đơn hàng');
      return;
    }

    setCheckoutLoading(true);
    try {
      const payload = {
        customer_id: currentTab.customer?._id || null,
        customer_name: currentTab.customer?.name || 'Khách lẻ',
        customer_phone: currentTab.customer?.phone || '',
        items: currentTab.items.map((it) => ({
          product_id: it.product_id,
          batch_id: it.batch_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount: it.discount || 0
        })),
        discount_amount: discountAmount,
        payment_method: currentTab.paymentMethod,
        amount_paid: currentTab.paymentMethod === 'CASH' ? amountPaid : finalAmount,
        notes: currentTab.notes || ''
      };

      const res = await handleAPI('/api/pos/checkout', payload, 'post');
      messageApi.success(`Thanh toán thành công hóa đơn ${res.order.order_code}!`);

      // Lưu đơn vào state in hóa đơn
      setCompletedOrderForPrint({
        order: res.order,
        tenant: res.tenant
      });

      // Nếu chọn In hóa đơn -> Tự động kích hoạt window.print()
      if (autoPrint) {
        setTimeout(() => {
          window.print();
        }, 300);
      }

      // Đóng tab hiện tại hoặc reset sạch nếu còn 1 tab
      if (tabs.length > 1) {
        doCloseTab(activeTabId);
      } else {
        updateCurrentTab({
          customer: null,
          items: [],
          discountType: 'VND',
          discountValue: 0,
          paymentMethod: 'CASH',
          amountPaid: 0,
          notes: ''
        });
      }

      // Focus lại ô quét mã
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 400);
    } catch (err) {
      console.error(err);
      messageApi.error(err.response?.data?.message || 'Thanh toán thất bại');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // SỔ HÓA ĐƠN GẦN ĐÂY (HISTORY DRAWER)
  // ═══════════════════════════════════════════════════
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const fetchRecentOrders = async () => {
    setHistoryLoading(true);
    try {
      const res = await handleAPI(
        `/api/pos/orders?limit=20&search=${encodeURIComponent(historySearch)}`,
        null,
        'get'
      );
      setRecentOrders(res?.orders || []);
    } catch (err) {
      console.error(err);
      messageApi.error('Lỗi khi tải lịch sử đơn hàng');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (historyDrawerVisible) {
      fetchRecentOrders();
    }
  }, [historyDrawerVisible, historySearch]);

  const handleReprintOrder = async (orderId) => {
    try {
      const res = await handleAPI(`/api/pos/orders/${orderId}`, null, 'get');
      setCompletedOrderForPrint({
        order: res.order,
        tenant: res.tenant
      });
      setTimeout(() => {
        window.print();
      }, 300);
    } catch (err) {
      console.error(err);
      messageApi.error('Không thể in lại hóa đơn này');
    }
  };

  // ═══════════════════════════════════════════════════
  // PHÍM TẮT THAO TÁC NHANH (HOTKEYS)
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F2: Tìm khách hàng
      if (e.key === 'F2') {
        e.preventDefault();
        if (customerSearchRef.current) customerSearchRef.current.focus();
      }
      // F4: Tìm / quét sản phẩm
      if (e.key === 'F4') {
        e.preventDefault();
        if (searchInputRef.current) searchInputRef.current.focus();
      }
      // F8: Mở tab hóa đơn mới
      if (e.key === 'F8') {
        e.preventDefault();
        handleAddNewTab();
      }
      // F9: Thanh toán nhanh
      if (e.key === 'F9') {
        e.preventDefault();
        handleCheckout(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, currentTab, finalAmount, amountPaid]);

  // Cột bảng giỏ hàng
  const cartColumns = [
    {
      title: 'STT',
      width: 50,
      align: 'center',
      render: (_, __, index) => index + 1
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            <span>Mã: {record.product_sku || '---'}</span>
            <span style={{ margin: '0 6px' }}>•</span>
            <span>ĐVT: {record.unit}</span>
          </div>
        </div>
      )
    },
    {
      title: 'Lô & Hạn sử dụng (FEFO)',
      key: 'batch_info',
      width: 250,
      render: (_, record, index) => {
        const isNearExpiry =
          record.expiry_date &&
          dayjs(record.expiry_date).diff(dayjs(), 'day') <= 90;

        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Tag
                color={isNearExpiry ? 'warning' : 'success'}
                style={{ fontWeight: 500, margin: 0, padding: '2px 8px' }}
              >
                Lô: {record.batch_number}
              </Tag>
              <Tooltip title="Chọn lô hàng khác nếu khách muốn chọn Date xa hơn">
                <Button
                  size="small"
                  type="link"
                  icon={<SwapOutlined />}
                  onClick={() => handleOpenBatchModal(index)}
                  style={{ padding: '0 4px', fontSize: 12, color: '#0d6e57' }}
                >
                  Đổi lô
                </Button>
              </Tooltip>
            </div>
            <div style={{ fontSize: 11, color: isNearExpiry ? '#d97706' : '#4b5563' }}>
              HSD: {formatDate(record.expiry_date)} (Tồn lô: {record.batch_stock})
            </div>
          </Space>
        );
      }
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      align: 'right',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#374151' }}>{formatMoney(val)}</span>
      )
    },
    {
      title: 'Số lượng',
      key: 'quantity',
      width: 140,
      align: 'center',
      render: (_, record, index) => (
        <Space.Compact size="small">
          <Button
            icon={<MinusOutlined />}
            onClick={() => handleChangeItemQuantity(index, record.quantity - 1)}
            disabled={record.quantity <= 1}
          />
          <InputNumber
            min={1}
            max={record.batch_stock}
            value={record.quantity}
            onChange={(val) => handleChangeItemQuantity(index, val)}
            style={{ width: 55, textAlign: 'center' }}
            controls={false}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={() => handleChangeItemQuantity(index, record.quantity + 1)}
            disabled={record.quantity >= record.batch_stock}
          />
        </Space.Compact>
      )
    },
    {
      title: 'Thành tiền',
      dataIndex: 'subtotal',
      key: 'subtotal',
      width: 130,
      align: 'right',
      render: (val) => (
        <span style={{ fontWeight: 700, color: '#0d6e57', fontSize: 15 }}>
          {formatMoney(val)}
        </span>
      )
    },
    {
      title: '',
      width: 50,
      align: 'center',
      render: (_, __, index) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(index)}
        />
      )
    }
  ];

  if (!mounted || !token) {
    return <div style={{ minHeight: '100vh', background: '#f1f5f9' }} />;
  }

  return (
    <>
      <Head>
        <title>POS Bán Hàng Tại Quầy | MobyFlow</title>
        <style>{`
          /* Tối ưu in hóa đơn nhiệt K80 / K58 */
          @media print {
            body * {
              visibility: hidden;
            }
            #thermal-receipt-print, #thermal-receipt-print * {
              visibility: visible;
            }
            #thermal-receipt-print {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm;
              font-family: 'Courier New', monospace;
              padding: 6px;
              color: #000000;
              background: #ffffff;
            }
          }
        `}</style>
      </Head>

      {/* POS FULL-SCREEN CONTAINER */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#f1f5f9',
          overflow: 'hidden',
          fontFamily: "'Inter', -apple-system, sans-serif"
        }}
      >
        {/* ─── 1. TOP HEADER ─── */}
        <header
          style={{
            height: 54,
            background: '#0d6e57',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 10
          }}
        >
          {/* Trái: Logo & Quay lại */}
          <Space size="middle">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push('/dashboard')}
              style={{ color: '#ffffff', padding: '0 8px' }}
            >
              Quản trị
            </Button>
            <Divider type="vertical" style={{ borderColor: 'rgba(255,255,255,0.2)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '0.5px' }}>
                MobyFlow POS
              </span>
              <Tag color="cyan" style={{ margin: 0, fontWeight: 600 }}>
                Thu ngân
              </Tag>
            </div>
          </Space>

          {/* Giữa: Hướng dẫn phím tắt */}
          <div style={{ display: 'none', color: '#e2e8f0', fontSize: 13, gap: 16 }}>
            <span><Tag color="#064e3b">F2</Tag> Tìm khách</span>
            <span><Tag color="#064e3b">F4</Tag> Quét hàng</span>
            <span><Tag color="#064e3b">F8</Tag> Thêm đơn</span>
            <span><Tag color="#064e3b">F9</Tag> Thanh toán</span>
          </div>

          {/* Phải: Đồng hồ & Thu ngân & Lịch sử */}
          <Space size="middle">
            <span style={{ color: '#d1fae5', fontSize: 13 }} suppressHydrationWarning>
              <ClockCircleOutlined style={{ marginRight: 6 }} />
              {currentTime}
            </span>
            <Button
              icon={<HistoryOutlined />}
              onClick={() => setHistoryDrawerVisible(true)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 500
              }}
            >
              Hóa đơn gần đây
            </Button>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(0,0,0,0.2)',
                padding: '4px 12px',
                borderRadius: 20
              }}
            >
              <UserOutlined style={{ color: '#34d399' }} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                {user?.fullName || 'Thu ngân'}
              </span>
            </div>
          </Space>
        </header>

        {/* ─── 2. MULTI-TABS HÓA ĐƠN CHỜ ─── */}
        <div
          style={{
            background: '#e2e8f0',
            padding: '8px 16px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            overflowX: 'auto',
            borderBottom: '1px solid #cbd5e1'
          }}
        >
          {tabs.map((tab, idx) => {
            const isActive = tab.id === activeTabId;
            const itemCount = (tab.items || []).length;

            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px 8px 0 0',
                  background: isActive ? '#ffffff' : '#f1f5f9',
                  color: isActive ? '#0d6e57' : '#64748b',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: isActive ? '1px solid #cbd5e1' : 'none',
                  borderBottom: isActive ? '1px solid #ffffff' : 'none',
                  marginBottom: -1,
                  boxShadow: isActive ? '0 -2px 4px rgba(0,0,0,0.03)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <span>{tab.title}</span>
                {itemCount > 0 && (
                  <Badge
                    count={itemCount}
                    style={{
                      backgroundColor: isActive ? '#0d6e57' : '#94a3b8',
                      fontSize: 11
                    }}
                  />
                )}
                <CloseOutlined
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  style={{
                    fontSize: 11,
                    color: '#94a3b8',
                    marginLeft: 4,
                    padding: 2,
                    borderRadius: '50%'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                />
              </div>
            );
          })}

          <Tooltip title="Mở thêm hóa đơn chờ mới (F8)">
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={handleAddNewTab}
              style={{
                color: '#0d6e57',
                fontWeight: 600,
                marginBottom: 2
              }}
            >
              Thêm đơn
            </Button>
          </Tooltip>
        </div>

        {/* ─── 3. BODY: 2 CỘT (GIỎ HÀNG 68% - THANH TOÁN 32%) ─── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            padding: 12,
            gap: 12
          }}
        >
          {/* CỘT TRÁI: TÌM KIẾM SẢN PHẨM & BẢNG GIỎ HÀNG */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              overflow: 'hidden'
            }}
          >
            {/* Thanh Barcode / Search Box & Toggle Lọc Tồn Kho */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <AutoComplete
                    style={{ width: '100%' }}
                    options={productOptions}
                    onSelect={handleSelectProduct}
                    onSearch={handleSearchProducts}
                    onFocus={() => {
                      if (!productSearchText && productOptions.length === 0) {
                        loadProductOptions('', inStockOnly);
                      }
                    }}
                    value={productSearchText}
                    popupMatchSelectWidth={true}
                    dropdownStyle={{ maxHeight: 420 }}
                  >
                    <Input
                      ref={searchInputRef}
                      size="large"
                      placeholder="Quét mã vạch (Barcode) hoặc gõ tên sản phẩm, mã SKU... (F4)"
                      prefix={<BarcodeOutlined style={{ color: '#0d6e57', fontSize: 20 }} />}
                      allowClear
                      style={{
                        borderRadius: 8,
                        borderColor: '#94a3b8',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    />
                  </AutoComplete>
                </div>

                {/* Nút gạt lọc chỉ hiện hàng còn tồn */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    whiteSpace: 'nowrap',
                    background: inStockOnly ? '#ecfdf5' : '#f8fafc',
                    padding: '7px 12px',
                    borderRadius: 8,
                    border: inStockOnly ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => handleToggleInStockOnly(!inStockOnly)}
                >
                  <Switch
                    checked={inStockOnly}
                    onChange={handleToggleInStockOnly}
                    size="small"
                    style={{ backgroundColor: inStockOnly ? '#0d6e57' : undefined }}
                  />
                  <Text style={{ fontSize: 13, fontWeight: 500, color: inStockOnly ? '#065f46' : '#64748b' }}>
                    {inStockOnly ? `Chỉ hàng còn tồn (${totalFoundCount})` : `Tất cả sản phẩm (${totalFoundCount})`}
                  </Text>
                </div>
              </div>
            </div>

            {/* Bảng Giỏ hàng */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
              <Table
                columns={cartColumns}
                dataSource={(currentTab.items || []).map((it, idx) => ({ ...it, key: idx }))}
                pagination={false}
                locale={{
                  emptyText: (
                    <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>
                      <BarcodeOutlined style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 12 }} />
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>
                        Chưa có sản phẩm nào trong hóa đơn này
                      </div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        Dùng máy quét mã vạch hoặc gõ tên sản phẩm ở thanh tìm kiếm phía trên
                      </div>
                    </div>
                  )
                }}
                rowClassName="pos-cart-row"
              />
            </div>

            {/* Footer giỏ hàng: Thống kê số lượng */}
            <div
              style={{
                padding: '10px 16px',
                borderTop: '1px solid #f1f5f9',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13,
                color: '#475569'
              }}
            >
              <span>
                Tổng số lượng mặt hàng:{' '}
                <strong style={{ color: '#0f172a' }}>
                  {(currentTab.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0)}
                </strong>{' '}
                ({(currentTab.items || []).length} loại)
              </span>
              <span style={{ color: '#64748b' }}>
                Thuật toán FEFO đang tự động ưu tiên lô cận hạn nhất
              </span>
            </div>
          </div>

          {/* CỘT PHẢI (CỐ ĐỊNH 410px): KHÁCH HÀNG & THANH TOÁN */}
          <div
            style={{
              width: 410,
              minWidth: 380,
              maxWidth: 440,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff',
              borderRadius: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}
          >
            {/* 1. KHU VỰC KHÁCH HÀNG */}
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid #f1f5f9',
                background: '#f8fafc'
              }}
            >
              {currentTab.customer ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    padding: '8px 12px',
                    borderRadius: 8
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#065f46', fontSize: 14 }}>
                      <UserOutlined style={{ marginRight: 6 }} />
                      {currentTab.customer.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
                      <span>SĐT: <strong>{currentTab.customer.phone}</strong></span>
                      {currentTab.customer.baby_name && (
                        <span style={{ marginLeft: 8 }}>• Bé: <strong>{currentTab.customer.baby_name}</strong></span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={handleRemoveCustomer}
                    title="Bỏ chọn khách"
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <AutoComplete
                    style={{ flex: 1 }}
                    options={customerOptions}
                    onSelect={handleSelectCustomer}
                    onSearch={handleSearchCustomers}
                    value={customerSearchText}
                  >
                    <Input
                      ref={customerSearchRef}
                      size="middle"
                      placeholder="Tìm khách theo SĐT / Tên (F2)"
                      prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                      allowClear
                      style={{ borderRadius: 8, height: 38, fontSize: 13 }}
                    />
                  </AutoComplete>
                  <Tooltip title="Thêm nhanh khách hàng mới">
                    <Button
                      size="middle"
                      icon={<UserAddOutlined />}
                      onClick={() => setIsCustomerModalVisible(true)}
                      style={{ color: '#0d6e57', borderColor: '#a7f3d0', height: 38, width: 38 }}
                    />
                  </Tooltip>
                </div>
              )}
            </div>

            {/* 2. CHI TIẾT THANH TOÁN */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
                {/* Tổng tiền hàng */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>Tổng tiền hàng:</Text>
                  <Text strong style={{ fontSize: 16, color: '#0f172a' }}>{formatMoney(subtotalAmount)}</Text>
                </div>

                {/* Giảm giá đơn hàng (% hoặc VNĐ) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div>
                    <Text style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>
                      Giảm giá ({discountType === 'PERCENT' ? '%' : 'VNĐ'}):
                    </Text>
                    {discountType === 'PERCENT' && discountAmount > 0 && (
                      <div style={{ fontSize: 12, color: '#0d6e57', fontWeight: 700, marginTop: 2 }}>
                        = -{formatMoney(discountAmount)}
                      </div>
                    )}
                  </div>

                  <Space.Compact style={{ width: 200 }}>
                    <InputNumber
                      min={0}
                      max={discountType === 'PERCENT' ? 100 : undefined}
                      size="middle"
                      value={currentTab.discountValue}
                      onChange={(val) => updateCurrentTab({ discountValue: val ?? 0 })}
                      formatter={discountType === 'VND' ? (val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : (val) => `${val}`}
                      parser={discountType === 'VND' ? (val) => val.replace(/\$\s?|(,*)/g, '') : (val) => val.replace('%', '')}
                      style={{ width: '100%', fontWeight: 700, fontSize: 14 }}
                      placeholder="0"
                    />
                    <Tooltip title="Giảm giá theo số tiền (VNĐ)">
                      <Button
                        size="middle"
                        type={discountType === 'VND' ? 'primary' : 'default'}
                        onClick={() => {
                          if (discountType === 'PERCENT') {
                            updateCurrentTab({
                              discountType: 'VND',
                              discountValue: discountAmount
                            });
                          }
                        }}
                        style={
                          discountType === 'VND'
                            ? { background: '#0d6e57', borderColor: '#0d6e57', fontWeight: 800, minWidth: 40 }
                            : { fontWeight: 600, minWidth: 40 }
                        }
                      >
                        đ
                      </Button>
                    </Tooltip>
                    <Tooltip title="Giảm giá theo phần trăm (%)">
                      <Button
                        size="middle"
                        type={discountType === 'PERCENT' ? 'primary' : 'default'}
                        onClick={() => {
                          if (discountType === 'VND') {
                            const pct =
                              subtotalAmount > 0
                                ? Math.min(100, Math.round(((currentTab.discountValue || 0) * 100) / subtotalAmount))
                                : 0;
                            updateCurrentTab({
                              discountType: 'PERCENT',
                              discountValue: pct
                            });
                          }
                        }}
                        style={
                          discountType === 'PERCENT'
                            ? { background: '#0d6e57', borderColor: '#0d6e57', fontWeight: 800, minWidth: 40 }
                            : { fontWeight: 600, minWidth: 40 }
                        }
                      >
                        %
                      </Button>
                    </Tooltip>
                  </Space.Compact>
                </div>

                <Divider style={{ margin: '2px 0' }} />

                {/* KHÁCH CẦN TRẢ (FINAL AMOUNT) */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f0fdf4',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1.5px solid #86efac',
                    boxShadow: '0 2px 6px rgba(13, 110, 87, 0.08)'
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#166534' }}>
                    Khách cần trả:
                  </span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#0d6e57', letterSpacing: '0.5px' }}>
                    {formatMoney(finalAmount)}
                  </span>
                </div>

                {/* Phương thức thanh toán */}
                <div>
                  <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                    Phương thức thanh toán:
                  </Text>
                  <Radio.Group
                    size="middle"
                    value={currentTab.paymentMethod}
                    onChange={(e) => {
                      const method = e.target.value;
                      updateCurrentTab({
                        paymentMethod: method,
                        amountPaid: method !== 'CASH' ? finalAmount : currentTab.amountPaid
                      });
                    }}
                    style={{ width: '100%', display: 'flex', gap: 6 }}
                  >
                    <Radio.Button
                      value="CASH"
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        height: 38,
                        lineHeight: '36px',
                        fontWeight: 600,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        padding: '0 6px'
                      }}
                    >
                      <WalletOutlined /> Tiền mặt
                    </Radio.Button>
                    <Radio.Button
                      value="TRANSFER"
                      style={{
                        flex: 1.2,
                        textAlign: 'center',
                        height: 38,
                        lineHeight: '36px',
                        fontWeight: 600,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        padding: '0 6px'
                      }}
                    >
                      <BankOutlined /> Chuyển khoản
                    </Radio.Button>
                    <Radio.Button
                      value="CARD"
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        height: 38,
                        lineHeight: '36px',
                        fontWeight: 600,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        padding: '0 6px'
                      }}
                    >
                      <CreditCardOutlined /> Thẻ
                    </Radio.Button>
                  </Radio.Group>
                </div>

                {/* Tiền khách đưa & Tiền thừa (chỉ hiện khi chọn tiền mặt) */}
                {currentTab.paymentMethod === 'CASH' && (
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingBottom: 12,
                        marginBottom: quickCashSuggestions.length > 0 ? 10 : 0
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Tiền khách đưa:</Text>
                      <InputNumber
                        min={0}
                        size="middle"
                        value={currentTab.amountPaid}
                        onChange={(val) => updateCurrentTab({ amountPaid: val || 0 })}
                        formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(val) => val.replace(/\$\s?|(,*)/g, '')}
                        style={{ width: 190, fontWeight: 700, fontSize: 15, color: '#0f172a' }}
                      />
                    </div>

                    {/* Gợi ý tiền nhanh */}
                    {quickCashSuggestions.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                        {quickCashSuggestions.map((sug, idx) => {
                          const isExact = idx === 0 && sug === finalAmount;
                          const isSelected = currentTab.amountPaid === sug;
                          return (
                            <Button
                              key={sug}
                              size="small"
                              onClick={() => updateCurrentTab({ amountPaid: sug })}
                              type={isSelected ? 'primary' : 'default'}
                              style={{
                                fontSize: 12,
                                height: 28,
                                fontWeight: isSelected || isExact ? 700 : 500,
                                borderRadius: 6,
                                background: isSelected ? '#0d6e57' : isExact ? '#ecfdf5' : '#ffffff',
                                borderColor: isSelected ? '#0d6e57' : isExact ? '#10b981' : '#cbd5e1',
                                color: isSelected ? '#ffffff' : isExact ? '#065f46' : '#334155',
                                padding: '0 8px'
                              }}
                            >
                              {isExact ? `Đủ tiền (${formatMoney(sug).replace(' đ', '')})` : formatMoney(sug).replace(' đ', '')}
                            </Button>
                          );
                        })}
                      </div>
                    )}

                    {/* Tiền thừa trả khách */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 10,
                        borderTop: '1px dashed #cbd5e1'
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Tiền thừa trả khách:</Text>
                      <Text
                        strong
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: changeAmount > 0 ? '#d97706' : '#166534'
                        }}
                      >
                        {formatMoney(changeAmount)}
                      </Text>
                    </div>
                  </div>
                )}

                {/* Ghi chú đơn hàng */}
                <Input.TextArea
                  rows={2}
                  placeholder="Ghi chú đơn hàng (nếu có)..."
                  value={currentTab.notes}
                  onChange={(e) => updateCurrentTab({ notes: e.target.value })}
                  style={{ borderRadius: 8, fontSize: 13, padding: '6px 10px' }}
                />
              </div>
            </div>

            {/* 3. NÚT THANH TOÁN (LỚN VÀ NỔI BẬT) */}
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid #f1f5f9',
                background: '#ffffff',
                display: 'flex',
                gap: 10
              }}
            >
              <Button
                size="large"
                icon={<PrinterOutlined style={{ fontSize: 16 }} />}
                onClick={() => handleCheckout(true)}
                loading={checkoutLoading}
                style={{ flex: 1, height: 46, fontWeight: 600, fontSize: 14, borderRadius: 8 }}
              >
                In & Lưu
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined style={{ fontSize: 18 }} />}
                onClick={() => handleCheckout(false)}
                loading={checkoutLoading}
                style={{
                  flex: 2,
                  height: 46,
                  background: '#0d6e57',
                  fontWeight: 700,
                  fontSize: 16,
                  letterSpacing: '0.3px',
                  borderRadius: 8,
                  boxShadow: '0 3px 8px rgba(13, 110, 87, 0.28)'
                }}
              >
                THANH TOÁN (F9)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL ĐỔI LÔ HÀNG (FEFO SELECTOR) ─── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SwapOutlined style={{ color: '#0d6e57' }} />
            <span>Chọn Lô Hàng Khác Cho Sản Phẩm</span>
          </div>
        }
        open={batchModalVisible}
        onCancel={() => setBatchModalVisible(false)}
        footer={null}
        width={650}
      >
        <div style={{ marginBottom: 12, color: '#4b5563', fontSize: 13 }}>
          Hệ thống mặc định chọn lô có hạn sử dụng gần nhất theo nguyên tắc <strong>FEFO</strong>.
          Bạn có thể bấm chọn một lô khác dưới đây nếu khách hàng có yêu cầu:
        </div>

        <Table
          dataSource={productBatchesForModal.map((b) => ({ ...b, key: b._id }))}
          loading={batchModalLoading}
          pagination={false}
          columns={[
            {
              title: 'Mã Lô',
              dataIndex: 'batch_number',
              key: 'batch_number',
              render: (text, record, idx) => (
                <Space>
                  <strong>{text}</strong>
                  {idx === 0 && <Tag color="green">FEFO (Gần nhất)</Tag>}
                </Space>
              )
            },
            {
              title: 'Hạn Sử Dụng',
              dataIndex: 'expiry_date',
              key: 'expiry_date',
              render: (date) => formatDate(date)
            },
            {
              title: 'Tồn Kho',
              dataIndex: 'quantity_in_stock',
              key: 'quantity_in_stock',
              render: (val) => <Tag color="blue">{val} Cái</Tag>
            },
            {
              title: 'Thao tác',
              key: 'action',
              align: 'center',
              render: (_, record) => (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => handleSelectNewBatch(record)}
                  style={{ background: '#0d6e57' }}
                >
                  Chọn lô này
                </Button>
              )
            }
          ]}
        />
      </Modal>

      {/* ─── MODAL TẠO KHÁCH HÀNG NHANH ─── */}
      <Modal
        title="Thêm Nhanh Khách Hàng Mới Tại Quầy"
        open={isCustomerModalVisible}
        onCancel={() => setIsCustomerModalVisible(false)}
        footer={null}
        width={480}
      >
        <Form
          form={customerForm}
          layout="vertical"
          onFinish={handleCreateQuickCustomer}
          initialValues={{ name: 'Mẹ' }}
        >
          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại' },
              { pattern: /^[0-9]{9,11}$/, message: 'Số điện thoại không hợp lệ (9-11 số)' }
            ]}
          >
            <Input placeholder="VD: 0988123456" size="large" autoFocus />
          </Form.Item>

          <Form.Item
            name="name"
            label="Tên khách hàng"
            rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng' }]}
          >
            <Input placeholder="VD: Mẹ Lan" size="large" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="baby_name" label="Tên của bé (nếu có)">
                <Input placeholder="VD: Bé Bơ" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="baby_dob" label="Ngày sinh của bé">
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsCustomerModalVisible(false)}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createCustomerLoading}
                style={{ background: '#0d6e57' }}
              >
                Lưu khách hàng
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ─── DRAWER LỊCH SỬ HÓA ĐƠN GẦN ĐÂY ─── */}
      <Drawer
        title="Lịch Sử Hóa Đơn Bán Hàng Gần Đây"
        placement="right"
        width={560}
        open={historyDrawerVisible}
        onClose={() => setHistoryDrawerVisible(false)}
      >
        <Input.Search
          placeholder="Tìm mã HĐ, tên khách, SĐT..."
          value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
          style={{ marginBottom: 16 }}
          allowClear
        />

        <Table
          dataSource={recentOrders.map((o) => ({ ...o, key: o._id }))}
          loading={historyLoading}
          pagination={false}
          columns={[
            {
              title: 'Mã HĐ',
              dataIndex: 'order_code',
              key: 'order_code',
              render: (code, record) => (
                <div>
                  <strong>{code}</strong>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>
                    {dayjs(record.createdAt).format('HH:mm DD/MM')}
                  </div>
                </div>
              )
            },
            {
              title: 'Khách hàng',
              dataIndex: 'customer_name',
              key: 'customer_name',
              render: (name, record) => (
                <div>
                  <div>{name}</div>
                  <div style={{ fontSize: 11, color: '#059669' }}>
                    {record.customer_phone || '---'}
                  </div>
                </div>
              )
            },
            {
              title: 'Tổng tiền',
              dataIndex: 'final_amount',
              key: 'final_amount',
              align: 'right',
              render: (val) => (
                <strong style={{ color: '#0d6e57' }}>{formatMoney(val)}</strong>
              )
            },
            {
              title: '',
              key: 'action',
              align: 'center',
              render: (_, record) => (
                <Button
                  size="small"
                  icon={<PrinterOutlined />}
                  onClick={() => handleReprintOrder(record._id)}
                  title="In lại hóa đơn"
                />
              )
            }
          ]}
        />
      </Drawer>

      {/* ─── 4. KHUNG IN HÓA ĐƠN NHIỆT K80 / K58 (CHỈ HIỆN KHI BẤM IN) ─── */}
      {completedOrderForPrint && (
        <div id="thermal-receipt-print" style={{ display: 'none' }}>
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 16, textTransform: 'uppercase' }}>
              {completedOrderForPrint.tenant?.name || 'MOBYFLOW STORE'}
            </h3>
            {completedOrderForPrint.tenant?.address && (
              <div style={{ fontSize: 11 }}>Đ/c: {completedOrderForPrint.tenant.address}</div>
            )}
            {completedOrderForPrint.tenant?.phone && (
              <div style={{ fontSize: 11 }}>Hotline: {completedOrderForPrint.tenant.phone}</div>
            )}
            <h4 style={{ margin: '8px 0 2px', fontSize: 14 }}>HÓA ĐƠN BÁN HÀNG</h4>
            <div style={{ fontSize: 11 }}>Số: {completedOrderForPrint.order.order_code}</div>
            <div style={{ fontSize: 11 }}>
              Ngày: {dayjs(completedOrderForPrint.order.createdAt).format('DD/MM/YYYY HH:mm')}
            </div>
          </div>

          <div style={{ fontSize: 11, marginBottom: 8 }}>
            <div>Thu ngân: {completedOrderForPrint.order.cashier_name || 'Thu ngân'}</div>
            <div>Khách hàng: {completedOrderForPrint.order.customer_name}</div>
            {completedOrderForPrint.order.customer_phone && (
              <div>SĐT: {completedOrderForPrint.order.customer_phone}</div>
            )}
          </div>

          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', marginBottom: 10 }}>
            <thead>
              <tr style={{ borderBottom: '1px dashed #000000', textAlign: 'left' }}>
                <th style={{ padding: '4px 0' }}>Tên SP / Lô</th>
                <th style={{ textAlign: 'center', padding: '4px 0' }}>SL</th>
                <th style={{ textAlign: 'right', padding: '4px 0' }}>Đ.Giá</th>
                <th style={{ textAlign: 'right', padding: '4px 0' }}>T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              {(completedOrderForPrint.order.items || []).map((it, idx) => (
                <tr key={idx} style={{ borderBottom: '1px dotted #cccccc' }}>
                  <td style={{ padding: '4px 0' }}>
                    <div>{it.product_name}</div>
                    <div style={{ fontSize: 9, color: '#333' }}>
                      Lô: {it.batch_number} - HSD: {formatDate(it.expiry_date)}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '4px 0' }}>{it.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '4px 0' }}>
                    {formatMoney(it.unit_price).replace(' đ', '')}
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 0' }}>
                    {formatMoney(it.subtotal).replace(' đ', '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: 11, borderTop: '1px dashed #000000', paddingTop: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span>Tổng tiền hàng:</span>
              <span>{formatMoney(completedOrderForPrint.order.subtotal_amount)}</span>
            </div>
            {completedOrderForPrint.order.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span>Giảm giá:</span>
                <span>-{formatMoney(completedOrderForPrint.order.discount_amount)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 700,
                fontSize: 13,
                marginTop: 4,
                marginBottom: 4
              }}
            >
              <span>THANH TOÁN:</span>
              <span>{formatMoney(completedOrderForPrint.order.final_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span>Tiền khách đưa:</span>
              <span>{formatMoney(completedOrderForPrint.order.amount_paid)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Tiền thừa:</span>
              <span>{formatMoney(completedOrderForPrint.order.change_amount)}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, fontStyle: 'italic' }}>
            <div>Cảm ơn quý khách đã ủng hộ!</div>
            <div>Chúc bé yêu luôn khỏe mạnh và mau lớn!</div>
          </div>
        </div>
      )}
    </>
  );
}
