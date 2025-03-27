/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  output: process.env.NODE_ENV === 'development' ? undefined : 'export',
  distDir: 'dist',
  assetPrefix: process.env.NODE_ENV === 'development' ? undefined : './',
  basePath: '',
  trailingSlash: true,
  // Abilita il Fast Refresh in development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/.git/**', '**/node_modules/**']
      }
    }
    return config
  }
}

module.exports = nextConfig
