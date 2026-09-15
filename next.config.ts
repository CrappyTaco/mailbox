import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.MAILBOX_QA === 'true' ? '.next-qa' : '.next',
  devIndicators: false,
};

export default nextConfig;
