import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, theme, Typography } from 'antd';
import { 
  FaChartPie, 
  FaUsers, 
  FaBullhorn, 
  FaBolt, 
  FaChartBar, 
  FaCog,
  FaChevronDown,
  FaSignOutAlt,
  FaDatabase,
  FaFileAlt,
  FaBox
} from 'react-icons/fa';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import Header from '../components/Header';
import Footer from '../components/Footer';

const { Sider, Content } = Layout;
const { Text } = Typography;

const DashboardLayout = ({ children, title = 'MobyFlow' }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();
  
  const { token, user } = useSelector((state) => state.auth);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.push('/login');
    }
  }, [mounted, token, router]);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <FaChartPie size={18} />,
      label: <span style={{ fontWeight: 500 }}>Bảng điều khiển</span>,
    },
    {
      key: '/users',
      icon: <FaDatabase size={18} />,
      label: <span style={{ fontWeight: 500 }}>Quản lý dữ liệu</span>,
    },
    {
      key: '/products',
      icon: <FaBox size={18} />,
      label: <span style={{ fontWeight: 500 }}>Sản phẩm & Chu kỳ</span>,
    },
    {
      key: '/customers',
      icon: <FaUsers size={18} />,
      label: <span style={{ fontWeight: 500 }}>Khách hàng</span>,
    },
    {
      key: 'marketing-group',
      icon: <FaBullhorn size={18} />,
      label: <span style={{ fontWeight: 500 }}>Chiến dịch</span>,
      children: [
        {
          key: '/marketing',
          label: 'Danh sách chiến dịch',
        },
        {
          key: '/marketing/create',
          label: 'Tạo chiến dịch',
        }
      ]
    },
    {
      key: '/automation',
      icon: <FaBolt size={18} />,
      label: <span style={{ fontWeight: 500 }}>Tự động hóa</span>,
    },
    {
      key: '/zns-templates',
      icon: <FaFileAlt size={18} />,
      label: <span style={{ fontWeight: 500 }}>Template ZNS</span>,
    },
    {
      key: '/reports',
      icon: <FaChartBar size={18} />,
      label: <span style={{ fontWeight: 500 }}>Báo cáo</span>,
    },
    {
      key: '/settings',
      icon: <FaCog size={18} />,
      label: <span style={{ fontWeight: 500 }}>Cài đặt</span>,
    },
  ];

  const profileMenuItems = [
    {
      key: 'profile',
      label: 'Hồ sơ cá nhân',
    },
    {
      key: 'logout',
      icon: <FaSignOutAlt />,
      danger: true,
      label: 'Đăng xuất',
      onClick: handleLogout
    },
  ];

  if (!mounted || !token) {
    return <div style={{ minHeight: '100vh', background: '#f3f4f6' }} />;
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <Head>
        <title>{title} | Bảng điều khiển</title>
      </Head>
      <Sider 
        theme="light"
        width={260}
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        style={{ 
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          borderRight: '1px solid #e5e7eb',
          boxShadow: '2px 0 8px rgba(0,0,0,0.02)',
          zIndex: 100
        }}
      >
        {/* Logo Section */}
        <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: collapsed ? '0 14px' : '0 24px', cursor: 'pointer', overflow: 'hidden', transition: 'padding 0.3s ease' }} onClick={() => router.push('/dashboard')}>
          <img 
            src="/logo mobyflow2-01.png" 
            alt="MobyFlow Logo" 
            style={{ 
              height: 52, 
              objectFit: 'contain',
              maxWidth: collapsed ? 52 : 200,
              transition: 'max-width 0.3s ease',
              display: 'block'
            }} 
          />
        </div>

        {/* Profile Section */}
        {!collapsed && (
          <div style={{ padding: '16px 20px', marginBottom: 8 }}>
            <Dropdown menu={{ items: profileMenuItems }} trigger={['click']} placement="bottomLeft">
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar style={{ backgroundColor: '#111827' }} src={user?.avatar}>
                    {(user?.fullName || user?.name) ? (user.fullName || user.name).charAt(0).toUpperCase() : 'A'}
                  </Avatar>
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Admin:</Text>
                    <Text strong style={{ fontSize: 14 }}>{user?.fullName || user?.name || 'Người dùng'}</Text>
                  </div>
                </div>
                <FaChevronDown size={12} color="#6b7280" />
              </div>
            </Dropdown>
          </div>
        )}

        <div style={{ padding: '0 12px' }}>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[router.pathname]}
            defaultOpenKeys={menuItems.find(item => item.children?.some(child => router.pathname === child.key)) ? [menuItems.find(item => item.children?.some(child => router.pathname === child.key)).key] : []}
            items={menuItems}
            onClick={({ key }) => router.push(key)}
            style={{ borderRight: 'none' }}
          />
        </div>
      </Sider>

      <Layout style={{ background: '#f3f4f6', marginLeft: collapsed ? 80 : 260, transition: 'margin-left 0.2s' }}>
        <Header />
        <Content style={{ margin: '24px 24px 0', overflow: 'initial' }}>
          <div
            style={{
              padding: 24,
              minHeight: 'calc(100vh - 150px)', // adjusted for header and footer
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
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
