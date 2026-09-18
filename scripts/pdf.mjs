// Renders dist/print-<lang>.html to public/pdf/*.pdf with a disclaimer footer on every page.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const out = path.join(root, 'public', 'pdf');
fs.mkdirSync(out, { recursive: true });
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));

// Chromium's footer template can only use installed fonts, so install Hind Madurai for the current user.
import os from 'node:os';
import { execSync } from 'node:child_process';
const fontDir = path.join(os.homedir(), '.fonts');
fs.mkdirSync(fontDir, { recursive: true });
for (const f of fs.readdirSync(path.join(root, 'src/fonts')).filter((f) => f.startsWith('hind-madurai'))) fs.copyFileSync(path.join(root, 'src/fonts', f), path.join(fontDir, f));
try { execSync('fc-cache -f', { stdio: 'ignore' }); } catch {}

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(dist) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch();
for (const l of ['en', 'ta']) {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/print-${l}.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const file = path.join(out, `family-estate-planning-guide-${l}.pdf`);
  await page.pdf({
    path: file,
    format: 'Letter',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="font-family:'Hind Madurai',sans-serif;font-size:7.5pt;color:#6E7C74;width:100%;padding:0 17mm;display:flex;justify-content:space-between;align-items:flex-end;gap:16px"><span>${cfg.ui[l].pdfFooter}</span><span style="white-space:nowrap">${cfg.siteUrl.replace(/^https?:\/\//, '')} · <span class="pageNumber"></span>/<span class="totalPages"></span></span></div>`,
  });
  console.log('wrote', path.relative(root, file));
  await page.close();
}
await browser.close();
server.close();
