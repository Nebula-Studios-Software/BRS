/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  // Configurazione per la produzione
  distDir: 'dist',
  // Configurazione per il routing
  trailingSlash: true,
  poweredByHeader: false,
  // Configurazione per la build statica
  reactStrictMode: true,
  swcMinify: true,
  // Configurazione per i file statici
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : '',
  basePath: process.env.NODE_ENV === 'production' ? '' : '',
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
