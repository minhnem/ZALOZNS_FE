import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, Alert, message, Divider, Space } from 'antd';
import { SaveOutlined, ApiOutlined, SyncOutlined, ShoppingCartOutlined, UserOutlined, FileTextOutlined } from '@ant-design/icons';
import axiosClient from '../../apis/axiosClient';

const { Title, Text } = Typography;

export default function KiotVietSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [syncingAll, setSyncingAll] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setInitialLoading(true);
      const response = await axiosClient.get('/api/kiotviet/config');
      if (response && response.data) {
        form.setFieldsValue({
          retailer: response.data.retailer,
          clientId: response.data.clientId,
          clientSecret: response.data.clientSecret
        });
      }
    } catch (error) {
      // It's ok if config not found on first load (404)
      if (error.response && error.response.status !== 404) {
        message.error('Lỗi khi tải cấu hình KiotViet');
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      await axiosClient.post('/api/kiotviet/config', values);
      message.success('Đã lưu cấu hình KiotViet thành công!');
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncingAll(true);
      const response = await axiosClient.post('/api/kiotviet/sync/all');
      message.success(response.data?.details || response.message || 'Đồng bộ toàn bộ dữ liệu thành công!');
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi đồng bộ dữ liệu');
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}><ApiOutlined /> Cấu hình tích hợp KiotViet</Title>
        <Text type="secondary">
          Kết nối tài khoản KiotViet để hệ thống Zalo OA tự động lấy thông tin sản phẩm và lịch sử mua hàng, phục vụ cho kịch bản chăm sóc ZNS.
        </Text>
      </div>
      
      <Card 
        title="1. Thông tin xác thực API" 
        bordered={true}
        style={{ marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: 12 }}
      >
        <Alert
          message="Hướng dẫn lấy thông tin"
          description="Bạn có thể lấy các thông tin này trong phần Thiết lập > Thiết lập cửa hàng > Thiết lập kết nối API trên trang quản trị KiotViet."
          type="info"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          disabled={initialLoading}
        >
          <Form.Item
            name="retailer"
            label={<span style={{ fontWeight: 500 }}>Tên gian hàng (Retailer)</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên gian hàng' }]}
          >
            <Input size="large" placeholder="Ví dụ: cuahangcuatoi" style={{ borderRadius: 6 }} />
          </Form.Item>

          <Form.Item
            name="clientId"
            label={<span style={{ fontWeight: 500 }}>Client ID</span>}
            rules={[{ required: true, message: 'Vui lòng nhập Client ID' }]}
          >
            <Input size="large" placeholder="Nhập Client ID của bạn" style={{ borderRadius: 6 }} />
          </Form.Item>

          <Form.Item
            name="clientSecret"
            label={<span style={{ fontWeight: 500 }}>Client Secret (Mã bảo mật)</span>}
            rules={[{ required: true, message: 'Vui lòng nhập Client Secret' }]}
            extra="* Đảm bảo mã bảo mật này đã được cấp quyền truy cập Khách hàng & Hóa đơn."
          >
            <Input.Password size="large" placeholder="Nhập Client Secret của bạn" style={{ borderRadius: 6 }} />
          </Form.Item>

          <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
            <Button 
              type="primary" 
              size="large"
              htmlType="submit" 
              icon={<SaveOutlined />} 
              loading={loading}
              style={{ borderRadius: 6, padding: '0 32px' }}
            >
              Lưu cấu hình kết nối
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card 
        title="2. Đồng bộ dữ liệu" 
        bordered={true}
        style={{ 
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
          borderRadius: 12,
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <Title level={5} style={{ marginTop: 0 }}>Đồng bộ Hóa đơn & Khách hàng</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Chức năng này sẽ tự động lấy danh sách Sản phẩm mới, Khách hàng mới và cập nhật Lịch sử Mua hàng (trong 3 ngày gần nhất) từ KiotViet về hệ thống Zalo OA.
            </Text>
            <Button 
              type="primary"
              icon={<SyncOutlined spin={syncingAll} />} 
              loading={syncingAll}
              onClick={handleSyncAll}
              size="large"
              style={{ borderRadius: 6, backgroundColor: '#10b981', borderColor: '#10b981' }}
            >
              Tiến hành Đồng bộ Dữ liệu Ngay
            </Button>
          </div>
          
          <div style={{ width: 250, padding: 16, backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <ShoppingCartOutlined style={{ color: '#3b82f6', fontSize: 20, marginRight: 8 }} />
              <span style={{ fontWeight: 500 }}>Dữ liệu được tải về:</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#64748b', fontSize: 13 }}>
              <li>Danh mục & mã sản phẩm mới</li>
              <li>Hồ sơ khách hàng (SĐT)</li>
              <li>Lịch sử mua hàng 72h qua</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
