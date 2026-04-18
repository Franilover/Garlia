/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://franilover.vercel.app',
  generateRobotsTxt: true,
  stylesheet: '/sitemap.xsl',
  exclude: [], 
  transform: async (config, path) => {
    if (!path) return null;
    
    return {
      loc: path,
      changefreq: 'daily',
      priority: 0.7,
      lastmod: new Date().toISOString(),
    };
  },
}