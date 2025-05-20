import fs from 'fs';
import path from 'path';

const xmlBefore = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`
const xmlAfter = `\n</urlset>`

export default function (domain: string, links: string[], vuepressPath: string, callback = () => { }) {
  const xmlItems = links.map(url => {
    // abc/def/ => abc/def/index.html
    if (url.endsWith('/')) url += 'index.html'
    // abc/def => abc/def.html
    else if (!url.endsWith('html')) url += '.html'
    return `  <url>
    <loc>${domain + url}</loc>
  </url>`
  }).join('\n')

  const rootPath = path.resolve(vuepressPath, './public')
  const staticExists = fs.existsSync(rootPath)
  if (!staticExists) fs.mkdirSync(rootPath)

  fs.writeFile(
    path.resolve(rootPath, 'sitemap.xml'),
    xmlBefore + xmlItems + xmlAfter,
    { encoding: 'utf-8' },
    callback
  )
}
