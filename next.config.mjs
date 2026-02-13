import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  // Es vital que esté deshabilitado en dev para que no te cree archivos basura locales
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // buildExcludes ayuda a evitar errores de compilación en Vercel
  buildExcludes: [/middleware-manifest\.json$/],
  // Esta es la clave: tu archivo de origen
  swSrc: 'public/custom-sw.js', 
  // Este es el archivo que se generará y que el navegador leerá
  sw: 'sw.js',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack aún tiene soporte limitado para Service Workers en algunas versiones,
  // pero dejar el objeto vacío está bien.
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