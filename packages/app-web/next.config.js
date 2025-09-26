/** @type {import('next').NextConfig} */
const nextConfig = {
  // basePath: '', // Указывает базовый путь для маршрутизации
  // assetPrefix: '', // Указывает базовый путь для загрузки статических ресурсов (JS, CSS)
  transpilePackages: ['@mui/material', '@mui/system', '@mui/icons-material'],
}

module.exports = nextConfig