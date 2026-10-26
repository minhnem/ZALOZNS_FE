import React from 'react';
import { Layout, Avatar, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { FaCashRegister } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/router';

const { Header: AntdHeader } = Layout;

const Header = () => {
  const { user } = useSelector((state) => state.auth);
  const router = useRouter();

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
      {/* Left spacer */}
      <div style={{ flex: 1 }}></div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button
          type="primary"
          icon={<FaCashRegister style={{ marginRight: 4 }} />}
          onClick={() => router.push('/pos')}
          style={{
            background: '#0d6e57',
            borderColor: '#0d6e57',
            fontWeight: 600,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 2px 4px rgba(13, 110, 87, 0.2)'
          }}
        >
          Bán hàng POS
        </Button>

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
