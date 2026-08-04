import React, { useState, useEffect } from 'react';
import { Layout, Menu, theme } from 'antd';
import { FaHome, FaFacebook, FaRobot, FaUsers, FaSms } from 'react-icons/fa';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSelector } from 'react-redux';
import Header from '../components/Header';
import Footer from '../components/Footer';

const { Sider, Content } = Layout;

const DashboardLayout = ({ children, title = 'Dashboard' }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Nếu app đã mount xong mà không có token (chưa đăng nhập), đá về trang login
    if (mounted && !token) {
      router.push('/login');
    }
  }, [mounted, token, router]);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <FaHome />,
      label: 'Overview',
    },
    {
      key: '/users',
      icon: <FaUsers />,
      label: 'Quản lý dữ liệu',
    },
    {
      key: '/bot-config',
      icon: <FaRobot />,
      label: 'Kịch bản Bot',
    },
    {
      key: '/zns-config',
      icon: <FaSms />,
      label: 'Cấu hình ZNS',
    },
  ];

  if (!mounted || !token) {
    // Trả về màn hình trắng trong lúc chờ chuyển hướng để không bị giật UI (Flash of content)
    return <div style={{ minHeight: '100vh', background: '#f5f5f5' }} />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Head>
        <title>{title} | AI Chatbot</title>
      </Head>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="h-16 flex items-center justify-center text-white text-xl font-bold m-2 bg-blue-600 rounded-md">
          {collapsed ? 'AI' : 'Chatbot AI'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[router.pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
        />
      </Sider>
      <Layout>
        <Header />
        <Content style={{ margin: '16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </div>
        </Content>
        <Footer />
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
