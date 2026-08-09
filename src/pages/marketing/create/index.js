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
  message,
  Form,
  Tag,
  Checkbox,
  InputNumber
} from 'antd';
import dayjs from 'dayjs';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  MobileOutlined,
  PlusOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../layouts/DashboardLayout';
import handleAPI from '../../../apis/handleAPI';

const { Title, Text } = Typography;

export default function CreateCampaignPage() {
  const router = useRouter();
  const { edit } = router.query; // If edit mode, edit contains campaign ID
  const [form] = Form.useForm();

  const [isAutoRun, setIsAutoRun] = useState(false);
  const [hasEndTime, setHasEndTime] = useState(false);
  const [loading, setLoading] = useState(false);

  // Template data from API
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Product data from API
  const [products, setProducts] = useState([]);

  // Watch values for preview
  const templateId = Form.useWatch('zns_template_id', form);
  const campaignType = Form.useWatch('type', form);
  const milestonesWatch = Form.useWatch('milestones', form) || [];
  const voucher = Form.useWatch(['dynamic_data', 'voucher_code'], form);
  const note = Form.useWatch(['dynamic_data', 'note'], form);

  useEffect(() => {
    fetchTemplates();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (edit) {
      fetchCampaignDetails();
    } else {
      form.setFieldsValue({
        status: 'active',
        is_auto_run: false,
        refill_reminder_days: 0,
        milestones: [],
        dynamic_data: {},
        product_id: 'all',
        exclude_refill_today: false
      });
    }
  }, [edit]);

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

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true);
      const res = await handleAPI(`/api/campaigns/${edit}`, null, 'get');
      if (res) {
        setIsAutoRun(res.is_auto_run);
        setHasEndTime(!!res.end_time);
        form.setFieldsValue({
          ...res,
          start_time: res.start_time ? dayjs(res.start_time) : null,
          end_time: res.end_time ? dayjs(res.end_time) : null,
          // Parse cron string to time for TimePicker
          recurring_schedule_time: res.recurring_schedule ? (() => {
            const parts = res.recurring_schedule.split(' ');
            if (parts.length >= 2) return dayjs(`${parts[1]}:${parts[0]}`, 'HH:mm');
            return dayjs('09:00', 'HH:mm');
          })() : dayjs('09:00', 'HH:mm'),
          // product_id có thể là object (do populate) → lấy _id, nếu null thì gán là 'all'
          product_id: res.product_id?._id || res.product_id || 'all',
          exclude_refill_today: res.exclude_refill_today || false,
        });
      }
    } catch (error) {
      message.error('Lấy dữ liệu chiến dịch thất bại');
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
        message.success('Cập nhật chiến dịch thành công');
      } else {
        await handleAPI('/api/campaigns', payload, 'post');
        message.success('Tạo chiến dịch thành công');
      }
      router.push('/marketing');
    } catch (error) {
      message.error('Có lỗi xảy ra khi lưu chiến dịch');
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
    <DashboardLayout title={edit ? "Sửa Chiến Dịch ZNS" : "Tạo Chiến Dịch ZNS"}>
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
              {edit ? "Cập nhật chiến dịch" : "Tạo chiến dịch mới"}
            </Title>
          </div>

          {/* 1. THÔNG TIN CHUNG */}
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
                      { value: 'LIFECYCLE', label: 'Chăm sóc theo vòng đời (Lifecycle)' },
                      { value: 'PRODUCT_REFILL', label: 'Nhắc mua lại (Refill)' },
                      { value: 'ENCOURAGE_PURCHASE', label: 'Khích lệ mua hàng (Chưa có đơn hàng)' },
                      { value: 'PROMOTION', label: 'Gửi hàng loạt (Khuyến mãi, Tri ân)' },
                      { value: 'BIRTHDAY', label: 'Chúc mừng sinh nhật' }
                    ]}
                  />
                </Form.Item>
              </div>

              {/* Chọn sản phẩm — Luôn hiển thị để phục vụ lọc thêm cho mọi loại chiến dịch ngoại trừ Vòng đời */}
              {campaignType !== 'LIFECYCLE' && (
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
                  <div style={{ width: 160, fontWeight: 500 }}>Nhắc trước/sau (Ngày):</div>
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

          {/* 2. CẤU HÌNH THỜI GIAN */}
          <Card
            title={<span style={{ color: '#0d6e57', fontWeight: 600 }}>2. Cấu hình thời gian chạy</span>}
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

          {/* 3. CẤU HÌNH KỊCH BẢN & CHỌN TEMPLATE */}
          <Card
            title={<span style={{ color: '#0d6e57', fontWeight: 600 }}>3. Cấu hình kịch bản & Chọn template</span>}
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <div style={{ background: '#f9fafb', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* TEMPLATE SELECTOR */}
                {campaignType !== 'LIFECYCLE' && (
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
                  {campaignType === 'LIFECYCLE' ? (
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 12 }}>Cấu hình kịch bản theo Mốc thời gian:</Text>
                      <Form.List name="milestones">
                        {(fields, { add, remove }) => (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              {fields.map(({ key, name, ...restField }) => (
                                <Card key={key} size="small" style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 8 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <Text strong>Mốc thời gian {name + 1}</Text>
                                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red', fontSize: 18, cursor: 'pointer' }} />
                                  </div>
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
                                        <Select size="large" placeholder="Đơn vị">
                                          <Select.Option value="WEEK">Tuần</Select.Option>
                                          <Select.Option value="MONTH">Tháng</Select.Option>
                                        </Select>
                                      </Form.Item>
                                    </Col>
                                  </Row>
                                  
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
                              <Button type="dashed" onClick={() => add({ time_unit: 'MONTH' })} block icon={<PlusOutlined />} style={{ height: 40 }}>
                                Thêm mốc thời gian
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

          {/* 4. PREVIEW */}
          <Card
            title={<span style={{ color: '#0d6e57', fontWeight: 600 }}>4. Preview nội dung tin nhắn</span>}
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <Text style={{ marginBottom: 16, display: 'block' }}>Xem trước giao diện tin nhắn ZNS gửi tới khách hàng:</Text>

            <div style={{ padding: 24, display: 'flex', justifyContent: 'center', background: '#f3f4f6', borderRadius: 8 }}>
              <div style={{
                width: 340,
                background: 'white',
                borderRadius: 24,
                border: '8px solid #111827',
                overflow: 'hidden',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ background: '#f3f4f6', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MobileOutlined />
                  <Text strong>Zalo Official Account</Text>
                </div>
                <div style={{ padding: 16 }}>
                  {(() => {
                    const previewTemplateId = campaignType === 'LIFECYCLE' ? milestonesWatch[0]?.zns_template_id : templateId;
                    const previewTemplate = templates.find(t => t.template_id === previewTemplateId);

                    if (previewTemplate) {
                      return (
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>
                          {(() => {
                            let previewContent = previewTemplate.content || 'Không có nội dung mẫu';
                            // Replace SYSTEM vars with sample values
                            previewContent = previewContent.replace(/<customer_name>|\{customer_name\}/g, '[Tên Khách Hàng]');
                            previewContent = previewContent.replace(/<phone>|\{phone\}/g, '[SĐT]');
                            previewContent = previewContent.replace(/<product_name>|\{product_name\}/g, '[Tên SP]');
                            previewContent = previewContent.replace(/<refill_date>|\{refill_date\}/g, '[Ngày hết]');
                            previewContent = previewContent.replace(/<baby_name>|\{baby_name\}/g, '[Tên bé]');
                            
                            // Replace CUSTOM vars
                            if (previewTemplate.params) {
                              previewTemplate.params.forEach(p => {
                                const val = campaignType === 'LIFECYCLE' 
                                  ? milestonesWatch[0]?.dynamic_data?.[p.name] 
                                  : form.getFieldValue(['dynamic_data', p.name]);
                                
                                if (val) {
                                  previewContent = previewContent.replace(new RegExp(`<${p.name}>|\\{${p.name}\\}`, 'g'), val);
                                } else if (p.type !== 'SYSTEM') {
                                  previewContent = previewContent.replace(new RegExp(`<${p.name}>|\\{${p.name}\\}`, 'g'), `[${p.label || p.name}]`);
                                }
                              });
                            }
                            return previewContent;
                          })()}
                        </div>
                      );
                    } else {
                      return (
                        <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 20 }}>
                          {campaignType === 'LIFECYCLE' ? 'Chọn Template ở mốc 1 để xem Preview' : 'Chọn Template ZNS để xem Preview'}
                        </Text>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          </Card>

          {/* Actions Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <Button size="large" onClick={() => router.push('/marketing')}>Hủy bỏ</Button>
            <Button type="primary" htmlType="submit" size="large" icon={<SaveOutlined />} style={{ fontWeight: 600 }} loading={loading}>
              Lưu Chiến Dịch
            </Button>
          </div>

        </div>
      </Form>
    </DashboardLayout>
  );
}
