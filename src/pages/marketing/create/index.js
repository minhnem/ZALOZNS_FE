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
  Checkbox
} from 'antd';
import dayjs from 'dayjs';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  MobileOutlined
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
        target_condition: {
          type: 'refill_date'
        },
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

              {/* Chọn sản phẩm — Luôn hiển thị để phục vụ lọc thêm cho mọi loại chiến dịch */}
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
                    {isAutoRun ? "Chạy tự động theo lịch (Auto-run)" : "Chạy trong ngày hôm nay"}
                  </Text>
                </Col>
              </Row>

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

                {/* CONDITION SELECTOR */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Text strong style={{ width: 190 }}>Điều kiện lọc khách hàng: </Text>
                  <Space.Compact style={{ flex: 1, maxWidth: 700 }}>
                    <Form.Item name={['target_condition', 'type']} style={{ marginBottom: 0 }}>
                      <Select
                        size="large"
                        style={{ width: 280 }}
                        options={[
                          { value: 'all', label: '👥 Gửi tất cả (Không lọc)' },
                          { value: 'product', label: '📦 Từng mua sản phẩm' },
                          { value: 'baby_age', label: '👶 Tháng tuổi của bé' },
                          { value: 'refill_date', label: '⏳ Ngày dự kiến hết bỉm' }
                        ]}
                      />
                    </Form.Item>
                    <Form.Item name={['target_condition', 'value']} style={{ marginBottom: 0, flex: 1 }}>
                      <Input
                        size="large"
                        placeholder="Nhập giá trị (VD: 3 ngày, Bỉm Merries...)"
                      />
                    </Form.Item>
                  </Space.Compact>
                </div>

                {/* TEMPLATE SELECTOR — now from API */}
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

                {/* DYNAMIC FIELDS — rendered from template.params */}
                <div style={{ marginTop: 8 }}>
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
                          ) : param.type === 'LIFECYCLE' ? (
                            <div style={{ flex: 1, maxWidth: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Input size="large" disabled value="[Tự động từ kịch bản Milestone]" style={{ background: '#faf5ff', color: '#7c3aed' }} />
                              <Tag color="purple">LIFECYCLE</Tag>
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
                  {selectedTemplate ? (
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>
                      {(() => {
                        let previewContent = selectedTemplate.content || 'Không có nội dung mẫu';
                        // Replace SYSTEM vars with sample values
                        previewContent = previewContent.replace(/\{customer_name\}/g, '[Tên Khách Hàng]');
                        previewContent = previewContent.replace(/\{phone\}/g, '[SĐT]');
                        previewContent = previewContent.replace(/\{product_name\}/g, '[Tên SP]');
                        previewContent = previewContent.replace(/\{refill_date\}/g, '[Ngày hết]');
                        previewContent = previewContent.replace(/\{baby_name\}/g, '[Tên bé]');
                        // Replace LIFECYCLE vars
                        previewContent = previewContent.replace(/\{stage_greetings\}/g, '[Lời chào]');
                        previewContent = previewContent.replace(/\{care_content\}/g, '[Nội dung chăm sóc]');
                        previewContent = previewContent.replace(/\{recommended_items\}/g, '[Gợi ý SP]');
                        // Replace CUSTOM vars with user-entered values or placeholder
                        if (selectedTemplate.params) {
                          selectedTemplate.params.filter(p => p.type === 'CUSTOM').forEach(p => {
                            const val = form.getFieldValue(['dynamic_data', p.name]);
                            const replacement = val || `[${p.label}]`;
                            previewContent = previewContent.replace(new RegExp(`\\{${p.name}\\}`, 'g'), replacement);
                          });
                        }
                        return previewContent;
                      })()}
                    </div>
                  ) : (
                    <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 20 }}>
                      Chọn Template ZNS để xem Preview
                    </Text>
                  )}
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
