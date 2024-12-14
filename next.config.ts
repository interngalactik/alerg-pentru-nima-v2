/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.prod.website-files.com'],
  },
  experimental: {
    appDir: true
  }
}

module.exports = nextConfig