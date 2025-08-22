/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.prod.website-files.com'],
    unoptimized: true,
  },
  experimental: {
    appDir: true
  },
}

module.exports = nextConfig