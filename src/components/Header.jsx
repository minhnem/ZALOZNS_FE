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
      {/* Search Bar - Center/Left aligned based on image */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: 24 }}>
        <Input 
          placeholder="Tìm kiếm..." 
          prefix={<FaSearch color="#9ca3af" />} 
          style={{ width: 280, borderRadius: 20, background: '#f9fafb' }}
          bordered={false}
          size="large"
        />
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Dropdown menu={{ items: notificationMenu }} trigger={['click']} placement="bottomRight">
          <Badge count={2} size="small" style={{ backgroundColor: '#ef4444' }}>
            <div style={{ 
              width: 36, 
              height: 36, 
              borderRadius: '50%', 
              background: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#4b5563'
            }}>
              <FaBell size={16} />
            </div>
          </Badge>
        </Dropdown>
        
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
