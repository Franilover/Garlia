// next.config.mjs
import withPWAInit from 'next-pwa';
import million from 'million/compiler';
import withBundleAnalyzer from '@next/bundle-analyzer';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest\.json$/],
  swSrc: 'public/custom-sw.js',
  sw: 'sw.js',
});

const nextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ftdxthnizdosaaavjhah.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

const analyze = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default analyze(million.next(withPWA(nextConfig), {
  auto: { rsc: false },
}));