import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, App, Form, Input, Row, Col, Tag, Spin } from 'antd';
import { LinkOutlined, DisconnectOutlined, SaveOutlined, EditOutlined } from '@ant-design/icons';
import handleAPI from '../../apis/handleAPI';
import { useSelector } from 'react-redux';

const { Title, Text } = Typography;

export default function ZaloOASettings() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await handleAPI('/api/zns/config', null, 'get');
      if (res && res.oaId) {
        setConfig(res);
        form.setFieldsValue({
          oaId: res.oaId,
          oaName: res.oaName,
          appId: res.appId,
          secretKey: res.secretKey,
          accessToken: res.accessToken,
          refreshToken: res.refreshToken
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveConfig = async (values) => {
    try {
      setSaving(true);
      // znsTemplateId requires to be something to pass validation in backend, or backend handles it.
      // Assuming backend allows updating just these fields or we send a dummy znsTemplateId if none
      const res = await handleAPI('/api/zns/config', { ...values, znsTemplateId: config?.znsTemplateId || 'NONE' }, 'post');
      message.success('Cấu hình Zalo OA thành công!');
      setConfig(res);
      setIsEditing(false);
    } catch (error) {
      message.error(error.message || 'Lỗi khi cấu hình Zalo OA');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = () => {
    // Ideally we call an API to clear config, but for now we can just clear it locally and save
    form.resetFields();
    setConfig(null);
    setIsEditing(true);
    message.success('Đã ngắt kết nối cấu hình Zalo OA (Chưa lưu vào hệ thống)');
  };

  if (loading) return <Spin style={{ display: 'block', margin: '40px auto' }} />;

  return (
    <Card bordered={false} style={{ maxWidth: 800 }}>
      <Title level={4}>Cấu hình kết nối Zalo OA (Thủ công)</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Dành cho kỹ thuật viên nhập trực tiếp các thông số cấu hình Zalo OA thay vì luồng OAuth tự động.
      </Text>

      {config && !isEditing ? (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ padding: 16, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8 }}>
            <Space direction="vertical">
              <Text strong style={{ color: '#52c41a' }}>✅ Đã cấu hình Zalo OA</Text>
              <Text>Tên OA: <Text strong>{config.oaName}</Text></Text>
              <Text>OA ID: {config.oaId}</Text>
              <Text>App ID: {config.appId}</Text>
              <Text>Access Token: <Text type="secondary" ellipsis style={{ maxWidth: 200, display: 'inline-block', verticalAlign: 'bottom' }}>{config.accessToken}</Text></Text>
            </Space>
          </div>
          <Space>
            <Button icon={<EditOutlined />} onClick={() => setIsEditing(true)}>
              Chỉnh sửa thông số
            </Button>
            <Button danger icon={<DisconnectOutlined />} onClick={handleDisconnect}>
              Xóa cấu hình
            </Button>
          </Space>
        </Space>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveConfig}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<Text strong>Tên OA (Hiển thị)</Text>} name="oaName" rules={[{ required: true }]}>
                <Input size="large" placeholder="Nhập tên Official Account" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<Text strong>OA ID</Text>} name="oaId" rules={[{ required: true }]}>
                <Input size="large" placeholder="Nhập Zalo OA ID" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<Text strong>App ID (Ứng dụng Zalo)</Text>} name="appId" rules={[{ required: true, message: 'Vui lòng nhập App ID' }]}>
                <Input size="large" placeholder="Nhập App ID" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<Text strong>Secret Key (Khóa bí mật)</Text>} name="secretKey" rules={[{ required: true, message: 'Vui lòng nhập Secret Key' }]}>
                <Input.Password size="large" placeholder="Nhập Secret Key" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={<Text strong>Access Token</Text>} name="accessToken" rules={[{ required: true, message: 'Vui lòng nhập Access Token' }]}>
            <Input.TextArea rows={3} placeholder="Nhập Access Token hiện tại" />
          </Form.Item>

          <Form.Item label={<Text strong>Refresh Token</Text>} name="refreshToken" rules={[{ required: true, message: 'Vui lòng nhập Refresh Token' }]}>
            <Input.TextArea rows={3} placeholder="Nhập Refresh Token hiện tại" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" size="large" icon={<SaveOutlined />} loading={saving}>
                Lưu cấu hình
              </Button>
              {config && (
                <Button size="large" onClick={() => setIsEditing(false)}>
                  Hủy
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      )}
    </Card>
  );
}
