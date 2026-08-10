import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/router';
import { ConfigProvider, Form, Input, Button, Segmented, Typography, App } from 'antd';
import { login, register, reset } from '../../features/auth/authSlice';
import styles from './index.module.css';

const { Title, Text } = Typography;

const BRAND_NAME = "MobyFlow";
const LOGO_URL = "/logo mobyflow2-01.png";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('Đăng nhập'); // 'Đăng nhập' | 'Đăng ký'
  const [form] = Form.useForm();
  const { message: messageApi } = App.useApp();
  const dispatch = useDispatch();
  const router = useRouter();

  const { user, isLoading, isError, isSuccess, message: authMessage } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (isError) {
      messageApi.error(authMessage || 'Đã có lỗi xảy ra!');
    }

    if (isSuccess && user) {
      messageApi.success(`${activeTab === 'Đăng nhập' ? 'Đăng nhập' : 'Đăng ký'} thành công!`);
      // Đợi nửa giây để người dùng kịp nhìn thấy thông báo thành công trước khi chuyển trang
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    }

    dispatch(reset());
  }, [user, isError, isSuccess, authMessage, dispatch, router, activeTab]);

  const handleFinish = (values) => {
    if (activeTab === 'Đăng nhập') {
      dispatch(login({ email: values.email, password: values.password }));
    } else {
      dispatch(register({
        fullName: values.fullName,
        email: values.email,
        password: values.password
      }));
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0d6e57',
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        },
        components: {
          Segmented: {
            itemColor: '#0d6e57',
            itemHoverColor: '#0a5644',
            itemSelectedColor: '#ffffff',
            itemSelectedBg: '#0d6e57',
            trackBg: '#eef7f5',
            trackPadding: 4,
            borderRadius: 8,
          },
          Form: {
            labelColor: '#374151',
            labelFontSize: 13,
            itemMarginBottom: 14, // Giảm khoảng cách giữa các trường nhập liệu
          }
        }
      }}
    >
      <div className={styles.mobyContainer}>
        <div className={styles.mobyCard}>
          <div className={styles.mobyBrand}>
            {LOGO_URL ? (
              <img src={LOGO_URL} alt={`${BRAND_NAME} Logo`} className={styles.mobyLogo} />
            ) : (
              <h1 className={styles.mobyBrandText}>{BRAND_NAME}</h1>
            )}
          </div>

          <Segmented
            block
            size="large"
            options={['Đăng nhập', 'Đăng ký']}
            value={activeTab}
            onChange={(val) => {
              setActiveTab(val);
              form.resetFields();
            }}
            style={{ marginBottom: 24, fontWeight: 600 }}
          />

          <div className={styles.mobyHeader}>
            <Title level={3} style={{ marginTop: 0, marginBottom: 8, color: '#111827', fontWeight: 700 }}>
              {activeTab === 'Đăng nhập' ? 'Chào mừng trở lại' : 'Tạo tài khoản'}
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              {activeTab === 'Đăng nhập'
                ? 'Đăng nhập để quản lý dự án của bạn.'
                : 'Đăng ký để bắt đầu quản lý dự án.'}
            </Text>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            requiredMark={false}
          >
            {activeTab === 'Đăng ký' && (
              <Form.Item
                label={<span style={{ fontWeight: 600 }}>Họ và tên hoặc Tên Shop</span>}
                name="fullName"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên hoặc tên Shop' }]}
              >
                <Input placeholder="Nguyễn Văn A hoặc Tên Shop" size="large" />
              </Form.Item>
            )}

            <Form.Item
              label={<span style={{ fontWeight: 600 }}>Email</span>}
              name="email"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Định dạng email không hợp lệ' }
              ]}
            >
              <Input placeholder="you@example.com" size="large" />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600 }}>Mật khẩu</span>}
              name="password"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu' },
                { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' }
              ]}
            >
              <Input.Password placeholder="••••••••" size="large" />
            </Form.Item>

            {activeTab === 'Đăng ký' && (
              <Form.Item
                label={<span style={{ fontWeight: 600 }}>Xác nhận mật khẩu</span>}
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="••••••••" size="large" />
              </Form.Item>
            )}

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={isLoading}
                style={{ fontWeight: 600, height: 48 }}
              >
                {activeTab}
              </Button>
            </Form.Item>
          </Form>

          {activeTab === 'Đăng nhập' && (
            <div className={styles.mobyForgotWrapper}>
              <a href="#forgot-password" className={styles.mobyForgotLink}>
                Quên mật khẩu?
              </a>
            </div>
          )}
        </div>
      </div>
    </ConfigProvider>
  );
}
