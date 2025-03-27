/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  output: process.env.NODE_ENV === 'development' ? undefined : 'export',
  distDir: 'dist',
  assetPrefix: process.env.NODE_ENV === 'development' ? undefined : '.',
  basePath: process.env.NODE_ENV === 'development' ? undefined : '',
  trailingSlash: true,
  // Abilita il Fast Refresh in development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/.git/**', '**/node_modules/**']
      }
    }
    // Aggiungi gestione degli asset statici
    config.module.rules.push({
      test: /\.(png|jpg|gif|svg)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'static/images/[name][ext]'
      }
    })
    return config
  },
  // Assicurati che i percorsi siano corretti in produzione
  publicRuntimeConfig: {
    staticFolder: '.',
  }
}

module.exports = nextConfig
