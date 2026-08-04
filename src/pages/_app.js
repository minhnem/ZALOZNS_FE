import '@/styles/globals.css';
import React from 'react';
import { Provider } from 'react-redux';
import { ConfigProvider, App as AntdApp } from 'antd';
import { store } from '@/redux/store';

export default function App({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <ConfigProvider theme={{ cssVar: true, hashed: false }}>
        <AntdApp>
          <Component {...pageProps} />
        </AntdApp>
      </ConfigProvider>
    </Provider>
  );
}
