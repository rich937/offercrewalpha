/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  // Force webpack (Turbopack is causing issues with pdfjs)
  experimental: {
    turbopack: false,
  },
};

export default nextConfig;