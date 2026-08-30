import type { NextConfig } from 'next';
// Vercel: 정적 자산(public/data 123 MB)은 CDN으로 서빙됨. 서버 기능은 쓰지 않음.
const nextConfig: NextConfig = { reactStrictMode: true };
export default nextConfig;
