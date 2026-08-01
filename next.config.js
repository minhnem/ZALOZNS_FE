const fs = require('fs');
const path = require('path');

const getAntdDeps = () => {
  try {
    const nodeModulesPath = path.resolve(__dirname, 'node_modules');
    const dirs = fs.readdirSync(nodeModulesPath);
    const deps = [];
    dirs.forEach(dir => {
      if (dir === '@ant-design') {
        const subDirs = fs.readdirSync(path.join(nodeModulesPath, dir));
        subDirs.forEach(sub => deps.push(`@ant-design/${sub}`));
      } else if (dir.startsWith('rc-')) {
        deps.push(dir);
      }
    });
    return deps;
  } catch (e) {
    return [];
  }
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    'query-string',
    'redux',
    'react-redux',
    '@reduxjs/toolkit',
    'antd',
    ...getAntdDeps()
  ],
}

module.exports = nextConfig
