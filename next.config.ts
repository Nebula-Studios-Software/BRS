import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  basePath: '',
  assetPrefix: './',
  distDir: 'out',
  trailingSlash: true
};

export default nextConfig;
