import '@/styles/globals.css';
import React from 'react';
import { Provider } from 'react-redux';
import { ConfigProvider, App as AntdApp } from 'antd';
import { store } from '@/redux/store';

export default function App({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <ConfigProvider 
        theme={{ 
          cssVar: true, 
          hashed: false,
          token: {
            colorPrimary: '#0d6e57',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          },
          components: {
            Menu: {
              itemActiveBg: '#eef7f5',
              itemSelectedBg: '#eef7f5',
              itemSelectedColor: '#0d6e57',
              itemHoverBg: '#f3f4f6',
              itemBorderRadius: 8,
              itemMarginInline: 8,
              iconSize: 18,
            },
            Layout: {
              bodyBg: '#f3f4f6',
              headerBg: '#ffffff',
            }
          }
        }}
      >
        <AntdApp>
          <Component {...pageProps} />
        </AntdApp>
      </ConfigProvider>
    </Provider>
  );
}
