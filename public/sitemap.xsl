<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap — Garden of Sins / Personal</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #121212;
            color: #e0e0e0;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
          }
          h1 {
            font-size: 14px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 3px;
            color: #ffffff;
            border-bottom: 1px solid #2d2d2d;
            padding-bottom: 16px;
            margin-bottom: 8px;
          }
          .subtitle {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #666666;
            margin-bottom: 32px;
          }
          .counter {
            color: #888888;
            font-family: monospace;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background-color: #1a1a1a;
            border: 1px solid #2d2d2d;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          }
          th {
            background-color: #242424;
            color: #aaaaaa;
            text-align: left;
            padding: 14px 18px;
            font-size: 9px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            border-bottom: 1px solid #2d2d2d;
          }
          tr:nth-child(even) {
            background-color: #151515;
          }
          tr:hover {
            background-color: #222222;
          }
          td {
            padding: 14px 18px;
            font-size: 11px;
            border-bottom: 1px solid #2d2d2d;
            word-break: break-all;
          }
          a {
            color: #ffffff;
            text-decoration: none;
            font-weight: 500;
          }
          a:hover {
            color: #888888;
            text-decoration: underline;
          }
          .priority, .changefreq, .lastmod {
            font-family: monospace;
            font-size: 11px;
          }
          .priority {
            color: #aaaaaa;
            font-weight: bold;
          }
          .changefreq {
            color: #888888;
          }
          .lastmod {
            color: #666666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Mapa de Rutas XML</h1>
          <div class="subtitle">
            URLs Detectadas: <span class="counter"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Ruta </th>
                <th>Prioridad</th>
                <th>Frecuencia</th>
                <th>Última Modificación</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <xsl:sort select="sitemap:priority" order="descending"/>
                <tr>
                  <td>
                    <xsl:variable name="itemURL">
                      <xsl:value-of select="sitemap:loc"/>
                    </xsl:variable>
                    <a href="{$itemURL}">
                      <xsl:value-of select="sitemap:loc"/>
                    </a>
                  </td>
                  <td class="priority">
                    <xsl:value-of select="sitemap:priority"/>
                  </td>
                  <td class="changefreq">
                    <xsl:value-of select="sitemap:changefreq"/>
                  </td>
                  <td class="lastmod">
                    <xsl:value-of select="sitemap:lastmod"/>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>