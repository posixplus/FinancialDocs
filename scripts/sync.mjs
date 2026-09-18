// Pulls both Google Docs (must be shared "Anyone with the link can view"),
// cleans them, and writes content/<lang>.json + content/<lang>.md.
// Refuses to overwrite content if a download looks wrong.
import fs from 'node:fs';
import path from 'node:path';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { cleanDoc } from './clean.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
const outDir = path.join(root, 'content');
fs.mkdirSync(outDir, { recursive: true });

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
td.use(gfm);

let changed = false;
for (const [lang, id] of Object.entries(cfg.docs)) {
  const url = `https://docs.google.com/document/d/${id}/export?format=html`;
  // SYNC_FROM_DIR=<dir> reads <dir>/<lang>.html instead of downloading (for offline testing)
  const local = process.env.SYNC_FROM_DIR && path.join(process.env.SYNC_FROM_DIR, `${lang}.html`);
  const res = local ? { ok: true, status: 200 } : await fetch(url, { redirect: 'follow' });
  const html = local ? fs.readFileSync(local, 'utf8') : await res.text();
  if (!res.ok || !/doc-content/.test(html)) {
    throw new Error(`[${lang}] Could not download the Google Doc (HTTP ${res.status}). Is it shared as "Anyone with the link can view"?`);
  }
  const doc = cleanDoc(html);
  if (doc.sections.length < 10) {
    throw new Error(`[${lang}] Only ${doc.sections.length} sections found - refusing to publish. Check the document structure.`);
  }
  const json = JSON.stringify({ lang, source: `https://docs.google.com/document/d/${id}`, ...doc }, null, 2) + '\n';
  const md = [`# ${doc.meta.title}${doc.meta.subtitle ? ' - ' + doc.meta.subtitle : ''}`, '', doc.meta.byline, '',
    `> ${doc.meta.disclaimer}`, '',
    ...doc.sections.map((s) => `## ${s.num ? s.num + '. ' : ''}${s.title}\n\n${td.turndown(s.html)}\n`)].join('\n');
  const jp = path.join(outDir, `${lang}.json`);
  const prev = fs.existsSync(jp) ? fs.readFileSync(jp, 'utf8') : '';
  if (prev !== json) {
    changed = true;
    fs.writeFileSync(jp, json);
    fs.writeFileSync(path.join(outDir, `${lang}.md`), md);
    console.log(`[${lang}] updated (${doc.sections.length} sections)`);
  } else {
    console.log(`[${lang}] no changes`);
  }
}
const metaPath = path.join(outDir, 'meta.json');
if (changed || !fs.existsSync(metaPath)) {
  fs.writeFileSync(metaPath, JSON.stringify({ updatedAt: new Date().toISOString() }, null, 2) + '\n');
}
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
