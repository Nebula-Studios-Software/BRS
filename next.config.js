/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  output: 'export',
  distDir: 'dist',
  assetPrefix: './',
  basePath: '',
  trailingSlash: true,
}

module.exports = nextConfig
