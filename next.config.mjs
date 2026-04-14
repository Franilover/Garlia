// next.config.mjs
import withPWAInit from 'next-pwa';
import million from 'million/compiler';

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
// Million envuelve a withPWA, no al revés
export default million.next(withPWA(nextConfig), { auto: true });