import React from 'react';
import { Layout, Input, Badge, Avatar, Dropdown } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { FaSearch, FaBell } from 'react-icons/fa';
import { useSelector } from 'react-redux';

const { Header: AntdHeader } = Layout;

const Header = () => {
  const { user } = useSelector((state) => state.auth);

  const notificationMenu = [
    {
      key: '1',
      label: 'Không có thông báo mới',
      disabled: true,
    }
  ];

  return (
    <AntdHeader 
      style={{ 
        background: '#ffffff', 
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        height: 64,
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}
    >
      {/* Search Bar - Removed */}
      <div style={{ flex: 1 }}></div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        
        <div style={{ cursor: 'pointer' }}>
          <Avatar 
            size={36} 
            src={user?.avatar || undefined} 
            icon={<UserOutlined />}
            style={{ backgroundColor: '#111827' }} 
          />
        </div>
      </div>
    </AntdHeader>
  );
};

export default Header;
