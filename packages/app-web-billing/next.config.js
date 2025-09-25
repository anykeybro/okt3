/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/billing', // Указывает базовый путь для маршрутизации
  assetPrefix: '/billing', // Указывает базовый путь для загрузки статических ресурсов (JS, CSS)
  transpilePackages: ['@mui/material', '@mui/system', '@mui/icons-material'],
}

module.exports = nextConfig