// Builds the static site into dist/ from content/*.json.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const langs = ['en', 'ta'];
const docs = Object.fromEntries(langs.map((l) => [l, JSON.parse(read(`content/${l}.json`))]));
const meta = JSON.parse(read('content/meta.json'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtDate = (l) => new Date(meta.updatedAt).toLocaleDateString(l === 'ta' ? 'ta-IN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
const pdfName = (l) => `pdf/family-estate-planning-guide-${l}.pdf`;

const ICON = {
  logo: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#1F3D2F"/><path d="M16 7c-4 3.2-6 6.6-6 10.2A6 6 0 0 0 16 23a6 6 0 0 0 6-5.8C22 13.6 20 10.2 16 7Z" fill="none" stroke="#E3B23C" stroke-width="1.8"/><path d="M16 12v14" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M16 18l-3-2.5M16 16l3-2.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  dl: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M5 19h14"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 5 6v5.5c0 4.3 3 8 7 9.5 4-1.5 7-5.2 7-9.5V6l-7-3Z"/><path d="M12 8v5M12 16h.01"/></svg>`,
  up: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 19V5m0 0-6 6m6-6 6 6"/></svg>`,
  motif: `<svg class="motif" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width=".7" aria-hidden="true"><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="34"/><circle cx="50" cy="50" r="22"/><path d="M50 4v92M4 50h92M17 17l66 66M83 17 17 83"/><g fill="currentColor" stroke="none"><circle cx="50" cy="16" r="1.5"/><circle cx="84" cy="50" r="1.5"/><circle cx="50" cy="84" r="1.5"/><circle cx="16" cy="50" r="1.5"/><circle cx="26" cy="26" r="1.5"/><circle cx="74" cy="26" r="1.5"/><circle cx="74" cy="74" r="1.5"/><circle cx="26" cy="74" r="1.5"/></g></svg>`,
};

const tocItems = (l) => docs[l].sections.map((s) => `<li><a href="#${l}-${s.id}" data-sec="${s.id}"><span class="n">${s.num || '·'}</span><span>${esc(s.title)}</span></a></li>`).join('');

const sectionHtml = (l, s) => `<section class="doc" id="${l}-${s.id}" data-sec="${s.id}">
<h2>${s.num ? `<span class="n">${s.num}</span>` : ''}<span>${esc(s.title)}</span><a class="anchor" href="#${l}-${s.id}" aria-label="Link to this section">#</a></h2>
${s.html}
</section>`;

const block = (l) => {
  const d = docs[l], u = cfg.ui[l];
  return `<div data-lang-block="${l}" lang="${l}">
<section class="hero"><div class="hero-in">${ICON.motif}
<p class="kicker">${esc(u.kicker)}</p>
<h1>${esc(d.meta.title)}</h1>
${d.meta.subtitle ? `<p class="sub">${esc(d.meta.subtitle)}</p>` : ''}
<p class="by">${esc(d.meta.byline)}</p>
<p class="updated">${esc(u.updated)}: ${fmtDate(l)}</p>
</div></section>
<div class="layout">
<nav class="toc" aria-label="${esc(u.contents)}"><h2>${esc(u.contents)}</h2><ol>${tocItems(l)}</ol></nav>
<main>
<details class="toc-mobile"><summary>${esc(u.contents)}</summary><ol>${tocItems(l)}</ol></details>
<div class="lead-disclaimer" role="note">${ICON.shield}<div><strong>${esc(u.disclaimer)}:</strong> ${esc(d.meta.disclaimer)}</div></div>
${d.sections.map((s) => sectionHtml(l, s)).join('\n')}
</main>
</div>
</div>`;
};

const footer = langs.map((l) => {
  const d = docs[l], u = cfg.ui[l];
  return `<div data-lang-block="${l}"><div class="in"><p><strong>${esc(u.disclaimer)}:</strong> ${esc(d.meta.disclaimer)}</p><p>${esc(d.meta.byline)} · <a href="mailto:${cfg.feedbackEmail}">${esc(u.feedback)}</a></p></div></div>`;
}).join('');

const desc = 'A plain-language guide to Wills, Revocable Living Trusts and Transfer on Death Deeds in Virginia, in English and Tamil. General awareness only, not legal advice.';
const index = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(docs.en.meta.title)} - ${esc(docs.en.meta.subtitle)}</title>
<meta name="title-en" content="${esc(docs.en.meta.title)} - ${esc(docs.en.meta.subtitle)}">
<meta name="title-ta" content="${esc(docs.ta.meta.title)} - ${esc(docs.ta.meta.subtitle)}">
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(docs.en.meta.title)} - ${esc(docs.en.meta.subtitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${cfg.siteUrl}">
<meta name="theme-color" content="#1F3D2F">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="fonts/hind-madurai-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/hind-madurai-tamil-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="styles.css">
<script>(function(){try{var q=new URLSearchParams(location.search).get('lang')||localStorage.getItem('fepg-lang');if(q==='ta'||q==='en')document.documentElement.lang=q;}catch(e){}})();</script>
</head>
<body>
<a href="#main" class="sr-only" style="position:absolute;left:-9999px">Skip to content</a>
<header class="top">
<a class="brand" href="./">${ICON.logo}<span data-lang-block="en">${esc(cfg.ui.en.brand)}</span><span data-lang-block="ta">${esc(cfg.ui.ta.brand)}</span></a>
<div class="actions">
<div class="lang" role="group" aria-label="Language"><button type="button" data-l="en" aria-pressed="true">EN</button><button type="button" data-l="ta" aria-pressed="false" lang="ta">தமிழ்</button></div>
<a class="btn" data-pdf data-pdf-e-n="${pdfName('en')}" data-pdf-t-a="${pdfName('ta')}" href="${pdfName('en')}" download>${ICON.dl}<span data-lang-block="en"><span class="label-long">Download </span>PDF</span><span data-lang-block="ta">PDF<span class="label-long"> பதிவிறக்கம்</span></span></a>
</div>
</header>
<div id="main">
${langs.map(block).join('\n')}
</div>
<footer class="site-foot">${footer}</footer>
<a class="to-top" href="#main" aria-label="Back to top">${ICON.up}</a>
<script>${read('src/app.js')}</script>
</body>
</html>`;

// ---------- print (PDF source) ----------
const printPage = (l) => {
  const d = docs[l], u = cfg.ui[l];
  return `<!doctype html><html lang="${l}"><head><meta charset="utf-8"><title>${esc(d.meta.title)}</title>
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="print.css"></head>
<body class="print">
<section class="cover">
<div class="cover-top">${ICON.logo}<span>${esc(u.brand)}</span></div>
<p class="kicker">${esc(u.kicker)}</p>
<h1>${esc(d.meta.title)}</h1>
${d.meta.subtitle ? `<p class="sub">${esc(d.meta.subtitle)}</p>` : ''}
<p class="by">${esc(d.meta.byline)}</p>
<div class="cover-disclaimer"><strong>${esc(u.disclaimer)}</strong><p>${esc(d.meta.disclaimer)}</p></div>
<p class="cover-meta">${esc(u.updated)}: ${fmtDate(l)} · ${cfg.siteUrl.replace(/^https?:\/\//, '')}</p>
</section>
<section class="print-toc"><h2>${esc(u.contents)}</h2><ol>${d.sections.map((s) => `<li><span class="n">${s.num || '·'}</span><span>${esc(s.title)}</span></li>`).join('')}</ol></section>
<main>${d.sections.map((s) => sectionHtml(l, s)).join('\n')}
<div class="lead-disclaimer end">${ICON.shield}<div><strong>${esc(u.disclaimer)}:</strong> ${esc(d.meta.disclaimer)}</div></div>
</main>
</body></html>`;
};

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'fonts'), { recursive: true });
fs.writeFileSync(path.join(dist, 'index.html'), index);
for (const l of langs) fs.writeFileSync(path.join(dist, `print-${l}.html`), printPage(l));
fs.copyFileSync(path.join(root, 'src/styles.css'), path.join(dist, 'styles.css'));
fs.copyFileSync(path.join(root, 'src/print.css'), path.join(dist, 'print.css'));
for (const f of fs.readdirSync(path.join(root, 'src/fonts'))) fs.copyFileSync(path.join(root, 'src/fonts', f), path.join(dist, 'fonts', f));
fs.writeFileSync(path.join(dist, 'favicon.svg'), ICON.logo.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
const pub = path.join(root, 'public');
if (fs.existsSync(pub)) fs.cpSync(pub, dist, { recursive: true });
console.log('Built dist/ (' + langs.map((l) => `${l}: ${docs[l].sections.length} sections`).join(', ') + ')');
