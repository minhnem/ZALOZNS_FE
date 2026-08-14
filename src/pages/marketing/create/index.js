import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  Button,
  Input,
  Select,
  Divider,
  Space,
  Switch,
  DatePicker,
  TimePicker,
  Row,
  Col,
  Checkbox,
  InputNumber,
  App,
  Form,
  Tag
} from 'antd';
import dayjs from 'dayjs';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  MobileOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../layouts/DashboardLayout';
import handleAPI from '../../../apis/handleAPI';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../../utils/hasPermission';

const { Title, Text } = Typography;

export default function CreateCampaignPage() {
  const router = useRouter();
  const user = useSelector((state) => state.auth.user);
  const { message: messageApi } = App.useApp();
  const { edit, view } = router.query; 
  const isViewMode = !!view;
  const campaignIdToFetch = edit || view;
  const [form] = Form.useForm();

  const [isAutoRun, setIsAutoRun] = useState(false);
  const [hasEndTime, setHasEndTime] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check permissions on mount
  useEffect(() => {
    if (!user) return; // Do nothing if logging out
    if (!edit && !view) {
      // Create mode
      if (!hasPermission(user, 'campaign_create')) {
        messageApi.warning('Bạn không có quyền tạo chiến dịch!');
        router.replace('/marketing');
      }
    } else if (edit) {
      // Edit mode
      if (!hasPermission(user, 'campaign_edit')) {
        messageApi.warning('Bạn không có quyền sửa chiến dịch!');
        router.replace('/marketing');
      }
    }
  }, [edit, view, user, router, messageApi]);

  // Template data from API
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Product data from API
  const [products, setProducts] = useState([]);

  // Customer data from API for CUSTOM segment
  const [customers, setCustomers] = useState([]);

  // Watch values for preview
  const templateId = Form.useWatch('zns_template_id', form);
  const campaignType = Form.useWatch('type', form);
  const milestonesWatch = Form.useWatch('milestones', form) || [];
  const subEventsWatch = Form.useWatch('sub_events', form) || [];
  const targetAudienceWatch = Form.useWatch('target_audience', form) || { audience_type: 'ALL' };
  const voucher = Form.useWatch(['dynamic_data', 'voucher_code'], form);
  const note = Form.useWatch(['dynamic_data', 'note'], form);

  useEffect(() => {
    fetchTemplates();
    fetchProducts();
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (campaignIdToFetch) {
      fetchCampaignDetails(campaignIdToFetch);
    } else {
      form.setFieldsValue({
        status: 'active',
        is_auto_run: false,
        refill_reminder_days: 0,
        milestones: [],
        sub_events: [],
        target_audience: { audience_type: 'ALL' },
        dynamic_data: {},
        product_id: 'all',
        exclude_refill_today: false
      });
    }
  }, [edit, view]);

  // When templateId changes, find the selected template
  useEffect(() => {
    if (templateId && templates.length > 0) {
      const found = templates.find(t => t.template_id === templateId);
      setSelectedTemplate(found || null);
    } else {
      setSelectedTemplate(null);
    }
  }, [templateId, templates]);

  const fetchTemplates = async () => {
    try {
      const res = await handleAPI('/api/zns-templates', null, 'get');
      setTemplates(res || []);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách template:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await handleAPI('/api/products', null, 'get');
      setProducts(res || []);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách sản phẩm:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await handleAPI('/api/customers', null, 'get');
      // Filter out inactive customers if needed, or just map them
      setCustomers((res || []).filter(c => c.status !== 'inactive'));
    } catch (error) {
      console.error('Lỗi khi lấy danh sách khách hàng:', error);
    }
  };

  const fetchCampaignDetails = async (idToFetch) => {
    try {
      setLoading(true);
      const res = await handleAPI(`/api/campaigns/${idToFetch}`, null, 'get');
      if (res) {
        setIsAutoRun(res.is_auto_run);
        setHasEndTime(!!res.end_time);
        form.setFieldsValue({
          ...res,
          start_time: res.start_time ? dayjs(res.start_time) : null,
          end_time: res.end_time ? dayjs(res.end_time) : null,
          sub_events: res.sub_events ? res.sub_events.map(ev => ({
            ...ev,
            execute_time: dayjs(ev.execute_time),
            audience_condition: ev.audience_condition ? {
              ...ev.audience_condition,
              product_id: ev.audience_condition.product_id?._id || ev.audience_condition.product_id
            } : { type: 'ALL' }
          })) : [],
          // Parse cron string to time for TimePicker
          recurring_schedule_time: res.recurring_schedule ? (() => {
            const parts = res.recurring_schedule.split(' ');
            if (parts.length >= 2) return dayjs(`${parts[1]}:${parts[0]}`, 'HH:mm');
            return dayjs('09:00', 'HH:mm');
          })() : dayjs('09:00', 'HH:mm'),
          // product_id có thể là object (do populate) → lấy _id, nếu null thì gán là 'all'
          product_id: res.product_id?._id || res.product_id || 'all',
          exclude_refill_today: res.exclude_refill_today || false,
          milestones: res.milestones ? res.milestones.map(m => ({
            ...m,
            product_id: m.product_id?._id || m.product_id,
            usage_cycle_days: m.product_id?.usage_cycle_days || m.usage_cycle_days
          })) : [],
        });
      }
    } catch (error) {
      messageApi.error('Lấy dữ liệu chiến dịch thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values) => {
    setLoading(true);
    try {
      // Format dates
      const payload = { ...values };
      if (payload.start_time) payload.start_time = payload.start_time.toISOString();
      if (payload.end_time) payload.end_time = payload.end_time.toISOString();
      if (!hasEndTime) payload.end_time = null;
      payload.is_auto_run = isAutoRun;

      if (payload.sub_events) {
        payload.sub_events = payload.sub_events.map(ev => ({
          ...ev,
          execute_time: ev.execute_time ? ev.execute_time.toISOString() : null
        }));
      }

      // Convert TimePicker to cron format
      if (payload.recurring_schedule_time) {
        payload.recurring_schedule = `${payload.recurring_schedule_time.minute()} ${payload.recurring_schedule_time.hour()} * * *`;
      } else {
        payload.recurring_schedule = '0 9 * * *';
      }
      delete payload.recurring_schedule_time;

      // Xử lý product_id
      if (!payload.product_id || payload.product_id === 'all') {
        payload.product_id = null;
      }

      if (edit) {
        await handleAPI(`/api/campaigns/${edit}`, payload, 'put');
        messageApi.success('Cập nhật chiến dịch thành công');
      } else {
        await handleAPI('/api/campaigns', payload, 'post');
        messageApi.success('Tạo chiến dịch thành công');
      }
      router.push('/marketing');
    } catch (error) {
      messageApi.error('Có lỗi xảy ra khi lưu chiến dịch');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (value) => {
    // Clear dynamic_data when template changes
    form.setFieldsValue({ dynamic_data: {} });
  };

  return (
    <DashboardLayout title={isViewMode ? "Chi Tiết Chiến Dịch ZNS" : (edit ? "Sửa Chiến Dịch ZNS" : "Tạo Chiến Dịch ZNS")}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              type="text"
              onClick={() => router.push('/marketing')}
              style={{ fontSize: 16, fontWeight: 500 }}
            >
              Quay lại
            </Button>
            <Divider type="vertical" style={{ height: 24, background: '#d1d5db' }} />
            <Title level={4} style={{ margin: 0, color: '#111827' }}>
              {isViewMode ? "Chi tiết chiến dịch" : (edit ? "Cập nhật chiến dịch" : "Tạo chiến dịch mới")}
            </Title>
          </div>

          {/* 1. THÔNG TIN CHUNG */}
          <fieldset disabled={isViewMode} style={{ border: 'none', padding: 0, margin: 0 }}>
          <Card
            title={<span style={{ color: '#0d6e57', fontWeight: 600 }}>1. Thông tin chung</span>}
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 160, fontWeight: 500 }}>Tên chiến dịch <span style={{ color: 'red' }}>*</span>:</div>
                <Form.Item name="name" style={{ flex: 1, maxWidth: 600, marginBottom: 0 }} rules={[{ required: true, message: 'Vui lòng nhập tên chiến dịch' }]}>
                  <Input size="large" placeholder="VD: Chiến dịch Bỉm Merries Tháng 8 - Tăng Tỷ Lệ Mua Lại" />
                </Form.Item>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 160, fontWeight: 500 }}>Loại chiến dịch <span style={{ color: 'red' }}>*</span>:</div>
                <Form.Item name="type" style={{ flex: 1, maxWidth: 600, marginBottom: 0 }} rules={[{ required: true, message: 'Vui lòng chọn loại chiến dịch' }]}>
                  <Select
                    size="large"
                    placeholder="Chọn loại chiến dịch"
                    options={[
                      { value: 'MASTER_CAMPAIGN', label: 'Chiến dịch Tháng (Master Automation)' },
                      { value: 'LIFECYCLE', label: 'Chăm sóc theo vòng đời (Lifecycle)' },
                      { value: 'PRODUCT_REFILL', label: 'Nhắc mua lại (Refill)' },
                      { value: 'ENCOURAGE_PURCHASE', label: 'Khích lệ mua hàng (Chưa có đơn hàng)' },
                      { value: 'PROMOTION', label: 'Gửi hàng loạt (Khuyến mãi, Tri ân)' },
                      { value: 'BIRTHDAY', label: 'Chúc mừng sinh nhật' }
                    ]}
                  />
                </Form.Item>
              </div>

              {/* Chọn sản phẩm — Luôn hiển thị để phục vụ lọc thêm cho mọi loại chiến dịch ngoại trừ Vòng đời và Nhắc mua lại */}
              {(campaignType !== 'LIFECYCLE' && campaignType !== 'MASTER_CAMPAIGN' && campaignType !== 'PRODUCT_REFILL') && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 160, fontWeight: 500 }}>Sản phẩm:</div>
                  <Form.Item
                    name="product_id"
                    style={{ flex: 1, maxWidth: 600, marginBottom: 0 }}
                  >
                    <Select
                      size="large"
                      placeholder="-- Chọn sản phẩm áp dụng cho chiến dịch --"
                      showSearch
                      optionFilterProp="label"
                      allowClear
                      options={[
                        { value: 'all', label: 'Tất cả sản phẩm' },
                        ...products
                          .filter(p => p.status === 'active')
                          .map(p => ({
                            value: p._id,
                            label: `${p.name} (${p.category} — Chu kỳ ${p.usage_cycle_days} ngày)`
                          }))
                      ]}
                    />
                  </Form.Item>
                </div>
              )}

              {campaignType === 'PRODUCT_REFILL' && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 160, fontWeight: 500 }}>Nhắc trước (Ngày):</div>
                  <Form.Item
                    name="refill_reminder_days"
                    style={{ flex: 1, maxWidth: 600, marginBottom: 0 }}
                    rules={[{ required: true, message: 'Vui lòng nhập số ngày' }]}
                  >
                    <InputNumber size="large" style={{ width: '100%' }} placeholder="VD: -3 (nhắc trước 3 ngày), 0 (nhắc đúng ngày)" />
                  </Form.Item>
                </div>
              )}

              {/* Exclusion filter */}
              {(campaignType === 'PROMOTION' || campaignType === 'ENCOURAGE_PURCHASE') && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 160 }}></div>
                  <Form.Item name="exclude_refill_today" valuePropName="checked" style={{ flex: 1, maxWidth: 600, marginBottom: 0 }}>
                    <Checkbox style={{ fontWeight: 500, color: '#4b5563' }}>
                      Loại trừ những khách hàng có lịch nhắc mua lại (Refill) hôm nay
                    </Checkbox>
                  </Form.Item>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 160, fontWeight: 500 }}>Trạng thái <span style={{ color: 'red' }}>*</span>:</div>
                <Form.Item name="status" style={{ width: 150, marginBottom: 0 }} rules={[{ required: true }]}>
                  <Select
                    options={[
                      { value: 'active', label: '🟢 Active' },
                      { value: 'draft', label: '⚪ Draft' },
                      { value: 'paused', label: '🔴 Paused' }
                    ]}
                  />
                </Form.Item>
              </div>
            </div>
          </Card>

          {/* 2. CẤU HÌNH TỆP KHÁCH HÀNG MỤC TIÊU */}
          {campaignType !== 'PRODUCT_REFILL' && (
            <Card
              title={<span style={{ color: '#0d6e57', fontWeight: 600 }}>2. Cấu hình tệp khách hàng mục tiêu (Target Audience)</span>}
              bordered={false}
              style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: '#f9fafb', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 160, fontWeight: 500 }}>Chọn nhóm đối tượng:</div>
                  <Form.Item name={['target_audience', 'audience_type']} style={{ flex: 1, maxWidth: 600, marginBottom: 0 }}>
                    <Select
                      size="large"
                      options={[
                        { value: 'ALL', label: 'Tất cả khách hàng (ALL)' },
                        { value: 'LEAD', label: 'Khách tiềm năng chưa mua hàng (LEAD)' },
                        { value: 'PREGNANT', label: 'Khách hàng mẹ bầu (PREGNANT)' },
                        { value: 'BABY', label: 'Khách hàng có con nhỏ (BABY)' },
                        { value: 'BOUGHT_PRODUCT', label: 'Khách đã từng mua sản phẩm X' },
                        { value: 'REFILL_DUE', label: 'Khách sắp hết sản phẩm X (REFILL_DUE)' },
                        { value: 'CUSTOM', label: 'Tự chọn thủ công khách hàng (CUSTOM)' }
                      ]}
                    />
                  </Form.Item>
                </div>

                {/* Tùy chọn cho BOUGHT_PRODUCT hoặc REFILL_DUE */}
                {(targetAudienceWatch.audience_type === 'BOUGHT_PRODUCT' || targetAudienceWatch.audience_type === 'REFILL_DUE') && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: 160, fontWeight: 500 }}>Chọn Sản phẩm <span style={{ color: 'red' }}>*</span>:</div>
                    <Form.Item name={['target_audience', 'product_id']} style={{ flex: 1, maxWidth: 600, marginBottom: 0 }} rules={[{ required: true, message: 'Vui lòng chọn sản phẩm' }]}>
                      <Select
                        size="large"
                        placeholder="Chọn sản phẩm"
                        showSearch
                        optionFilterProp="label"
                        options={products.map(p => ({ value: p._id, label: p.name }))}
                      />
                    </Form.Item>
                  </div>
                )}

                {/* Tùy chọn cho REFILL_DUE */}
                {targetAudienceWatch.audience_type === 'REFILL_DUE' && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: 160, fontWeight: 500 }}>Sắp hết trong vòng <span style={{ color: 'red' }}>*</span>:</div>
                    <Form.Item name={['target_audience', 'refill_days_left']} style={{ flex: 1, maxWidth: 200, marginBottom: 0 }} rules={[{ required: true, message: 'Vui lòng nhập số ngày' }]}>
                      <InputNumber size="large" min={1} style={{ width: '100%' }} placeholder="VD: 5 ngày" />
                    </Form.Item>
                  </div>
                )}

                {/* Tùy chọn cho BABY */}
                {targetAudienceWatch.audience_type === 'BABY' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 160, fontWeight: 500 }}>Độ tuổi bé (Tháng):</div>
                    <Form.Item name={['target_audience', 'baby_age_months_min']} style={{ marginBottom: 0 }}>
                      <InputNumber size="large" min={0} placeholder="Từ (tháng)" />
                    </Form.Item>
                    <Text>-</Text>
                    <Form.Item name={['target_audience', 'baby_age_months_max']} style={{ marginBottom: 0 }}>
                      <InputNumber size="large" min={1} placeholder="Đến (tháng)" />
                    </Form.Item>
                  </div>
                )}

                {/* Tùy chọn cho CUSTOM */}
                {targetAudienceWatch.audience_type === 'CUSTOM' && (
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div style={{ width: 160, fontWeight: 500, marginTop: 8 }}>Chọn Khách hàng <span style={{ color: 'red' }}>*</span>:</div>
                    <Form.Item name={['target_audience', 'customer_ids']} style={{ flex: 1, maxWidth: 600, marginBottom: 0 }} rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 khách hàng' }]}>
                      <Select
                        mode="multiple"
                        size="large"
                        placeholder="Tìm kiếm và chọn khách hàng..."
                        showSearch
                        optionFilterProp="label"
                        options={customers.map(c => ({ value: c._id, label: `${c.name} - ${c.phone}` }))}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* 3. CẤU HÌNH THỜI GIAN */}
          {campaignType !== 'MASTER_CAMPAIGN' && (
            <Card
              title={<span style={{ color: '#0d6e57', fontWeight: 600 }}>{campaignType === 'PRODUCT_REFILL' ? '2' : '3'}. Cấu hình thời gian chạy</span>}
              bordered={false}
              style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: '#f9fafb', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <Row align="middle">
                  <Col span={6}><Text type="secondary">Chế độ chạy:</Text></Col>
                  <Col span={18}>
                    <Switch checked={isAutoRun} onChange={setIsAutoRun} />
                    <Text style={{ marginLeft: 12, fontWeight: 500 }}>
                      Chạy tự động theo lịch (Auto-run)
                    </Text>
                  </Col>
                </Row>

                {isAutoRun && (
                  <Row align="middle" style={{ marginTop: 16 }}>
                    <Col span={6}><Text type="secondary">Giờ chạy hàng ngày:</Text></Col>
                    <Col span={18}>
                      <Form.Item name="recurring_schedule_time" style={{ marginBottom: 0 }} initialValue={dayjs('09:00', 'HH:mm')}>
                        <TimePicker format="HH:mm" size="large" allowClear={false} />
                      </Form.Item>
                      <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                        Hệ thống sẽ tự động quét và gửi ZNS vào khung giờ này mỗi ngày.
                      </Text>
                    </Col>
                  </Row>
                )}

                <Row align="middle">
                  <Col span={6}><Text type="secondary">Thời gian bắt đầu:</Text></Col>
                  <Col span={18}>
                    <Form.Item name="start_time" style={{ marginBottom: 0 }}>
                      <DatePicker
                        showTime
                        format="DD/MM/YYYY HH:mm"
                        size="large"
                        disabled={!isAutoRun}
                        placeholder="Chọn thời gian bắt đầu"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider style={{ margin: '12px 0' }} />

                <Row align="middle">
                  <Col span={6}><Text type="secondary">Chế độ kết thúc:</Text></Col>
                  <Col span={18}>
                    <Switch checked={hasEndTime} onChange={setHasEndTime} />
                    <Text style={{ marginLeft: 12, fontWeight: 500 }}>
                      Set lịch dừng hoạt động (Tự động kết thúc chiến dịch)
                    </Text>
                  </Col>
                </Row>

                {hasEndTime && (
                  <Row align="middle" style={{ marginTop: 16 }}>
                    <Col span={6}><Text type="secondary">Thời gian kết thúc:</Text></Col>
                    <Col span={18}>
                      <Form.Item name="end_time" style={{ marginBottom: 0 }}>
                        <DatePicker showTime format="DD/MM/YYYY HH:mm" size="large" placeholder="Chọn ngày & giờ kết thúc" />
                      </Form.Item>
                    </Col>
                  </Row>
                )}
              </div>
            </Card>
          )}

          {/* 4. CẤU HÌNH KỊCH BẢN & CHỌN TEMPLATE */}
          <Card
            title={<span style={{ color: '#0d6e57', fontWeight: 600 }}>{campaignType === 'MASTER_CAMPAIGN' ? '3' : campaignType === 'PRODUCT_REFILL' ? '3' : '4'}. Cấu hình kịch bản & Chọn template</span>}
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <div style={{ background: '#f9fafb', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* TEMPLATE SELECTOR */}
                {(campaignType !== 'LIFECYCLE' && campaignType !== 'MASTER_CAMPAIGN' && campaignType !== 'PRODUCT_REFILL') && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Text strong style={{ width: 190 }}>Chọn Template ZNS: </Text>
                    <Form.Item name="zns_template_id" style={{ marginBottom: 0, flex: 1, maxWidth: 510 }}>
                      <Select
                        size="large"
                        placeholder="-- Chọn Template Zalo ZNS --"
                        showSearch
                        optionFilterProp="label"
                        options={templates.map(t => ({
                          value: t.template_id,
                          label: `${t.template_id} - ${t.name}`
                        }))}
                        onChange={handleTemplateChange}
                      />
                    </Form.Item>
                  </div>
                )}

                {/* DYNAMIC FIELDS & MILESTONES */}
                <div style={{ marginTop: 8 }}>
                  {(campaignType === 'LIFECYCLE' || campaignType === 'PRODUCT_REFILL') ? (
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 12 }}>
                        {campaignType === 'LIFECYCLE' ? 'Cấu hình kịch bản theo Mốc thời gian:' : 'Cấu hình kịch bản theo Sản phẩm (Refill):'}
                      </Text>
                      <Form.List name="milestones">
                        {(fields, { add, remove }) => (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {fields.map(({ key, name, ...restField }) => (
                              <Card key={key} size="small" style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                  <Text strong>{campaignType === 'LIFECYCLE' ? `Mốc thời gian ${name + 1}` : `Cấu hình Sản phẩm ${name + 1}`}</Text>
                                  <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red', fontSize: 18, cursor: 'pointer' }} />
                                </div>
                                {campaignType === 'LIFECYCLE' ? (
                                  <Row gutter={16} style={{ marginBottom: 12 }}>
                                    <Col span={8}>
                                      <Form.Item {...restField} name={[name, 'stage']} rules={[{ required: true, message: 'Chọn Giai đoạn' }]} style={{ marginBottom: 0 }}>
                                        <Select size="large" placeholder="Giai đoạn">
                                          <Select.Option value="PREGNANCY">Thai kỳ</Select.Option>
                                          <Select.Option value="BABY">Trẻ sơ sinh</Select.Option>
                                        </Select>
                                      </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                      <Form.Item {...restField} name={[name, 'time_value']} rules={[{ required: true, message: 'Nhập Thời gian' }]} style={{ marginBottom: 0 }}>
                                        <InputNumber size="large" placeholder="Thời gian (VD: 1, 2)" style={{ width: '100%' }} />
                                      </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                      <Form.Item {...restField} name={[name, 'time_unit']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                        <Select size="large">
                                          <Select.Option value="DAY">Ngày</Select.Option>
                                          <Select.Option value="WEEK">Tuần</Select.Option>
                                          <Select.Option value="MONTH">Tháng</Select.Option>
                                        </Select>
                                      </Form.Item>
                                    </Col>
                                  </Row>
                                ) : (
                                  <>
                                    <Row gutter={16} style={{ marginBottom: 12 }}>
                                      <Col span={12}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                          <div style={{ width: 120, fontWeight: 500 }}>Sản phẩm <span style={{ color: 'red' }}>*</span>:</div>
                                          <Form.Item {...restField} name={[name, 'product_id']} rules={[{ required: true, message: 'Chọn sản phẩm' }]} style={{ flex: 1, marginBottom: 0 }}>
                                            <Select
                                              size="large"
                                              placeholder="-- Chọn sản phẩm --"
                                              showSearch
                                              optionFilterProp="label"
                                              options={products.map(p => ({
                                                value: p._id,
                                                label: p.name
                                              }))}
                                              onChange={(val) => {
                                                const prod = products.find(p => p._id === val);
                                                if (prod && prod.usage_cycle_days) {
                                                  const currentMilestones = form.getFieldValue('milestones');
                                                  if (currentMilestones && currentMilestones[name]) {
                                                    currentMilestones[name].usage_cycle_days = prod.usage_cycle_days;
                                                    form.setFieldsValue({ milestones: currentMilestones });
                                                  }
                                                }
                                              }}
                                            />
                                          </Form.Item>
                                        </div>
                                      </Col>
                                      <Col span={12}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                          <div style={{ width: 120, fontWeight: 500 }}>Chu kỳ (ngày) <span style={{ color: 'red' }}>*</span>:</div>
                                          <Form.Item {...restField} name={[name, 'usage_cycle_days']} rules={[{ required: true, message: 'Nhập chu kỳ' }]} style={{ flex: 1, marginBottom: 0 }}>
                                            <InputNumber size="large" min={1} style={{ width: '100%' }} placeholder="VD: 30" />
                                          </Form.Item>
                                        </div>
                                      </Col>
                                    </Row>

                                    <Row gutter={16} style={{ marginBottom: 12 }}>
                                      <Col span={12}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                          <div style={{ width: 120, fontWeight: 500 }}>Nhắc trước (ngày):</div>
                                          <Form.Item {...restField} name={[name, 'remind_before_days']} initialValue={3} style={{ flex: 1, marginBottom: 0 }}>
                                            <InputNumber size="large" min={0} style={{ width: '100%' }} placeholder="VD: 3" />
                                          </Form.Item>
                                        </div>
                                      </Col>
                                      <Col span={12}>
                                        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                          <Form.Item {...restField} name={[name, 'remind_on_exact_date']} valuePropName="checked" initialValue={true} style={{ flex: 1, marginBottom: 0 }}>
                                            <Checkbox style={{ fontWeight: 500 }}>Đồng thời gửi nhắc vào ĐÚNG NGÀY hết</Checkbox>
                                          </Form.Item>
                                        </div>
                                      </Col>
                                    </Row>
                                  </>
                                )}

                                <Divider style={{ margin: '12px 0' }} />
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                                  <div style={{ width: 160, fontWeight: 500 }}>Chọn Template:</div>
                                  <Form.Item {...restField} name={[name, 'zns_template_id']} style={{ flex: 1, marginBottom: 0 }} rules={[{ required: true, message: 'Chọn Template' }]}>
                                    <Select
                                      size="large"
                                      placeholder="-- Chọn Template Zalo ZNS --"
                                      showSearch
                                      optionFilterProp="label"
                                      options={templates.map(t => ({
                                        value: t.template_id,
                                        label: `${t.template_id} - ${t.name}`
                                      }))}
                                    />
                                  </Form.Item>
                                </div>

                                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Nội dung Template tại mốc này:</Text>

                                {(() => {
                                  const mTemplateId = milestonesWatch[name]?.zns_template_id;
                                  const mTemplate = templates.find(t => t.template_id === mTemplateId);
                                  if (!mTemplate) return <Text type="secondary">Vui lòng chọn Template ZNS cho mốc này.</Text>;
                                  if (!mTemplate.params || mTemplate.params.length === 0) return <Text type="secondary">Template này không có biến động nào.</Text>;

                                  return mTemplate.params.filter(p => p.type !== 'SYSTEM').map((param) => (
                                    <div key={param.name} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                                      <div style={{ width: 200, fontWeight: 500 }}>
                                        <code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 4, fontSize: 13, color: '#111827' }}>{param.name}</code>
                                      </div>
                                      <Form.Item {...restField} name={[name, 'dynamic_data', param.name]} style={{ flex: 1, marginBottom: 0 }}>
                                        <Input size="large" placeholder={param.label ? `VD: ${param.label}` : `Nhập giá trị cho ${param.name}...`} />
                                      </Form.Item>
                                    </div>
                                  ));
                                })()}
                              </Card>
                            ))}
                            <Button type="dashed" onClick={() => add(campaignType === 'LIFECYCLE' ? { time_unit: 'MONTH' } : { remind_before_days: 3, remind_on_exact_date: true })} block icon={<PlusOutlined />} style={{ height: 40 }}>
                              {campaignType === 'LIFECYCLE' ? 'Thêm mốc thời gian' : 'Thêm cấu hình sản phẩm'}
                            </Button>
                          </div>
                        )}
                      </Form.List>
                    </div>
                  ) : campaignType === 'MASTER_CAMPAIGN' ? (
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 12 }}>Cấu hình các Sự kiện con (Sub-Events):</Text>
                      <Form.List name="sub_events">
                        {(fields, { add, remove }) => (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {fields.map(({ key, name, ...restField }) => (
                              <Card key={key} size="small" style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                  <Text strong>Sự kiện {name + 1}</Text>
                                  <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red', fontSize: 18, cursor: 'pointer' }} />
                                </div>
                                <Row gutter={16} style={{ marginBottom: 12 }}>
                                  <Col span={12}>
                                    <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true, message: 'Nhập tên sự kiện' }]} style={{ marginBottom: 0 }}>
                                      <Input size="large" placeholder="Tên sự kiện (VD: Lương Về 10/08)" />
                                    </Form.Item>
                                  </Col>
                                  <Col span={12}>
                                    <Form.Item {...restField} name={[name, 'execute_time']} rules={[{ required: true, message: 'Chọn thời gian' }]} style={{ marginBottom: 0 }}>
                                      <DatePicker showTime format="DD/MM/YYYY HH:mm" size="large" style={{ width: '100%' }} placeholder="Ngày/giờ kích hoạt" />
                                    </Form.Item>
                                  </Col>
                                </Row>
                                {/* Điều kiện gửi (Audience Condition) */}
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                                    <div style={{ width: 160, fontWeight: 500 }}>Điều kiện gửi:</div>
                                    <Form.Item {...restField} name={[name, 'audience_condition', 'type']} initialValue="ALL" style={{ flex: 1, maxWidth: 400, marginBottom: 0 }}>
                                      <Select size="large" placeholder="Chọn điều kiện">
                                        <Select.Option value="ALL">Tất cả khách hàng</Select.Option>
                                        <Select.Option value="NOT_PURCHASED_SINCE_EVENT">Khách chưa mua hàng kể từ sự kiện trước</Select.Option>
                                        <Select.Option value="BABY_AGE_RANGE">Khách có con trong khoảng tuổi (tháng)</Select.Option>
                                        <Select.Option value="NO_ORDER_THIS_MONTH">Khách chưa phát sinh đơn trong tháng</Select.Option>
                                      </Select>
                                    </Form.Item>
                                  </div>

                                  {/* Sub-fields based on condition type */}
                                  {(() => {
                                    const condType = subEventsWatch[name]?.audience_condition?.type;

                                    if (condType === 'NOT_PURCHASED_SINCE_EVENT') {
                                      return (
                                        <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, paddingLeft: 160 }}>
                                          <div style={{ width: 160, fontWeight: 500 }}>Kể từ sự kiện:</div>
                                          <Form.Item {...restField} name={[name, 'audience_condition', 'since_event_index']} style={{ flex: 1, maxWidth: 300, marginBottom: 0 }}>
                                            <Select size="large" placeholder="Chọn sự kiện tham chiếu">
                                              {(subEventsWatch || []).map((ev, idx) => idx < name ? (
                                                <Select.Option key={idx} value={idx}>Sự kiện {idx + 1}: {ev?.name || '(Chưa đặt tên)'}</Select.Option>
                                              ) : null)}
                                            </Select>
                                          </Form.Item>
                                        </div>
                                      );
                                    }

                                    if (condType === 'BABY_AGE_RANGE') {
                                      return (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, paddingLeft: 160 }}>
                                          <div style={{ fontWeight: 500 }}>Từ:</div>
                                          <Form.Item {...restField} name={[name, 'audience_condition', 'baby_age_min']} style={{ marginBottom: 0 }}>
                                            <InputNumber size="large" min={0} placeholder="0" style={{ width: 100 }} />
                                          </Form.Item>
                                          <div style={{ fontWeight: 500 }}>đến:</div>
                                          <Form.Item {...restField} name={[name, 'audience_condition', 'baby_age_max']} style={{ marginBottom: 0 }}>
                                            <InputNumber size="large" min={1} placeholder="24" style={{ width: 100 }} />
                                          </Form.Item>
                                          <Text type="secondary">tháng tuổi</Text>
                                        </div>
                                      );
                                    }

                                    return null;
                                  })()}
                                </div>

                                <Divider style={{ margin: '12px 0' }} />
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                                  <div style={{ width: 160, fontWeight: 500 }}>Chọn Template:</div>
                                  <Form.Item {...restField} name={[name, 'zns_template_id']} style={{ flex: 1, marginBottom: 0 }} rules={[{ required: true, message: 'Chọn Template' }]}>
                                    <Select
                                      size="large"
                                      placeholder="-- Chọn Template Zalo ZNS --"
                                      showSearch
                                      optionFilterProp="label"
                                      options={templates.map(t => ({
                                        value: t.template_id,
                                        label: `${t.template_id} - ${t.name}`
                                      }))}
                                    />
                                  </Form.Item>
                                </div>

                                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Nội dung Template tại mốc này:</Text>

                                {(() => {
                                  const sTemplateId = subEventsWatch[name]?.zns_template_id;
                                  const sTemplate = templates.find(t => t.template_id === sTemplateId);
                                  if (!sTemplate) return <Text type="secondary">Vui lòng chọn Template ZNS cho sự kiện này.</Text>;
                                  if (!sTemplate.params || sTemplate.params.length === 0) return <Text type="secondary">Template này không có biến động nào.</Text>;

                                  return sTemplate.params.filter(p => p.type !== 'SYSTEM').map((param) => (
                                    <div key={param.name} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                                      <div style={{ width: 200, fontWeight: 500 }}>
                                        <code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 4, fontSize: 13, color: '#111827' }}>{param.name}</code>
                                      </div>
                                      <Form.Item {...restField} name={[name, 'dynamic_data', param.name]} style={{ flex: 1, marginBottom: 0 }}>
                                        <Input size="large" placeholder={param.label ? `VD: ${param.label}` : `Nhập giá trị cho ${param.name}...`} />
                                      </Form.Item>
                                    </div>
                                  ));
                                })()}
                              </Card>
                            ))}
                            <Button type="dashed" onClick={() => add({})} block icon={<PlusOutlined />} style={{ height: 40 }}>
                              Thêm sự kiện con
                            </Button>
                          </div>
                        )}
                      </Form.List>
                    </div>
                  ) : (
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 12 }}>Truyền tham số tự động (Dynamic Fields):</Text>

                      {!selectedTemplate && (
                        <Text type="secondary">Vui lòng chọn Template để cấu hình biến động.</Text>
                      )}

                      {selectedTemplate && (!selectedTemplate.params || selectedTemplate.params.length === 0) && (
                        <Text type="secondary">Template này không có biến động nào được cấu hình.</Text>
                      )}

                      {selectedTemplate && selectedTemplate.params && selectedTemplate.params.length > 0 && (
                        <div style={{
                          background: 'white',
                          padding: 16,
                          borderRadius: 8,
                          border: '1px dashed #d1d5db',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 16
                        }}>
                          {selectedTemplate.params.map((param) => (
                            <div key={param.name} style={{ display: 'flex', alignItems: 'center' }}>
                              <div style={{ width: 220, fontWeight: 500 }}>
                                <code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 4, fontSize: 13, color: '#111827' }}>
                                  {param.name}
                                </code>
                              </div>

                              {param.type === 'SYSTEM' ? (
                                <div style={{ flex: 1, maxWidth: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Input size="large" disabled value="[Hệ thống tự động điền từ Data Khách Hàng]" style={{ background: '#f3f4f6', color: '#6b7280' }} />
                                  <Tag color="blue">SYSTEM</Tag>
                                </div>
                              ) : (
                                <div style={{ flex: 1, maxWidth: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Form.Item name={['dynamic_data', param.name]} style={{ flex: 1, marginBottom: 0 }}>
                                    <Input size="large" placeholder={param.label ? `VD: ${param.label}` : `Nhập giá trị cho ${param.name}...`} />
                                  </Form.Item>
                                  <Tag color="orange">CUSTOM</Tag>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          </fieldset>

          {/* Actions Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <Button size="large" onClick={() => router.push('/marketing')}>Hủy bỏ</Button>
            {isViewMode ? (
              <Button type="primary" size="large" icon={<EditOutlined />} style={{ fontWeight: 600, background: '#d97706', borderColor: '#d97706' }} onClick={() => {
                if (!hasPermission(user, 'campaign_edit')) return messageApi.warning('Bạn không có quyền sửa chiến dịch!');
                router.push(`/marketing/create?edit=${view}`);
              }}>
                Chuyển sang chế độ Sửa
              </Button>
            ) : (
              <Button type="primary" htmlType="submit" size="large" icon={<SaveOutlined />} style={{ fontWeight: 600 }} loading={loading}>
                Lưu Chiến Dịch
              </Button>
            )}
          </div>

        </div>
      </Form>
    </DashboardLayout>
  );
}
