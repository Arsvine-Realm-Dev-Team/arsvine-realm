const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/app/i18n/request.ts');

// 远程图床白名单集中在 config/image-hosts.js 维护，新增/删除域名只改那一处
const remotePatterns = require('./config/image-hosts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  reactStrictMode: true,
  // Allow accessing the dev server via the local hosts alias (scripts/dev-host-setup).
  // COS bucket cdn.arsvine.com only accepts Referer matching *.arsvine.com, so we
  // browse dev via dev.arsvine.com:3000 instead of localhost during development.
  allowedDevOrigins: ['dev.arsvine.com', '127.0.0.1', 'localhost'],
  images: {
    remotePatterns,
  },
  webpack: (config, { dev }) => {
    if (!dev && process.platform === 'win32') {
      config.cache = false;
    }
    return config;
  },
};

module.exports = withBundleAnalyzer(withNextIntl(nextConfig));
