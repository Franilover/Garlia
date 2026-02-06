import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest\.json$/],
  swSrc: 'public/custom-sw.js', 
  sw: 'sw.js',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Movemos turbopack a la raíz del objeto de configuración
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

export default withPWA(nextConfig);