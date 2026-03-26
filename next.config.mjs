

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/api/credentials/:path*',
        headers: [
          // Prevent credentials routes from being logged
          { key: 'Cache-Control', value: 'no-store, no-cache' },
        ],
      },
    ]
  },
}

export default nextConfig
