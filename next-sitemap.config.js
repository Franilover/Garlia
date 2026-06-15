/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://franilover.vercel.app',
  generateRobotsTxt: true,
  stylesheet: '/sitemap.xsl',
  exclude: ['/auth/login', '/auth/*', '/admin/*', '/myself', '/myself/*'], 
  
  transform: async (config, path) => {
    let priority = 0.7;
    let changefreq = 'daily';

    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    } 
    else if (path.startsWith('/garlia') || path.startsWith('/personal')) {
      priority = 0.8;
      changefreq = 'weekly';
    }

    return {
      loc: path,
      changefreq: changefreq,
      priority: priority,
      lastmod: new Date().toISOString(),
    };
  },
}