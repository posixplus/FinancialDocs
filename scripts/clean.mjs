// Converts a Google Docs HTML export into clean, semantic HTML sections.
// Content is preserved verbatim; only Google's styling noise is removed.
import * as cheerio from 'cheerio';

const CALLOUT = /^(disclaimer|warning|important note|very important|பொறுப்பு துறப்பு|எச்சரிக்கை|முக்கிய குறிப்பு|மிக முக்கியம்)/i;
const WARN = /^(warning|எச்சரிக்கை)/i;
const LEGAL = /(legal advice|சட்ட ஆலோசனை)/i;

function styleMap($) {
  const css = $('style').text();
  const bold = new Set(), italic = new Set();
  for (const m of css.matchAll(/\.(c\d+)\{([^}]*)\}/g)) {
    if (/font-weight:\s*700/.test(m[2])) bold.add(m[1]);
    if (/font-style:\s*italic/.test(m[2])) italic.add(m[1]);
  }
  return { bold, italic };
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');

function realHref(h = '') {
  // Docs wraps links in google.com/url?q=..., sometimes more than once
  for (let i = 0; i < 4; i++) {
    try {
      const u = new URL(h);
      if (u.hostname.endsWith('google.com') && u.pathname === '/url' && u.searchParams.get('q')) { h = u.searchParams.get('q'); continue; }
    } catch {}
    break;
  }
  return h;
}

// Render inline children of a block element to clean HTML.
function inline($, el, st) {
  let out = '';
  $(el).contents().each((_, n) => {
    if (n.type === 'text') { out += esc(n.data.replace(/ /g, ' ')); return; }
    if (n.type !== 'tag') return;
    const tag = n.tagName;
    if (tag === 'br') { out += '<br>'; return; }
    if (tag === 'a') {
      const href = realHref($(n).attr('href'));
      const inner = inline($, n, st);
      if (!href || href.startsWith('#')) { out += inner; return; }
      out += `<a href="${attr(href)}" target="_blank" rel="noopener">${inner}</a>`;
      return;
    }
    if (tag === 'img') return;
    const cls = ($(n).attr('class') || '').split(/\s+/);
    let inner = inline($, n, st);
    if (tag === 'span' && inner.trim()) {
      if (cls.some((c) => st.italic.has(c))) inner = `<em>${inner}</em>`;
      if (cls.some((c) => st.bold.has(c))) inner = `<strong>${inner}</strong>`;
    }
    out += inner;
  });
  return out;
}

function tidy(html) {
  let h = html;
  // merge adjacent identical inline tags produced by Docs' span-per-run export
  for (let i = 0; i < 4; i++) h = h.replace(/<\/(strong|em)>(\s*)<\1>/g, '$2');
  h = h.replace(/<(strong|em)>(\s*)<\/\1>/g, '$2');
  h = h.replace(/(\s*<br>)+\s*$/g, '').replace(/(\s*<br>)+(\s*<\/(strong|em)>)+\s*$/g, '$2');
  return h.replace(/[ \t]{2,}/g, ' ').trim();
}

const textOf = ($, el) => $(el).text().replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function isAllBold($, el, st) {
  const spans = $(el).find('span').filter((_, s) => $(s).text().trim());
  if (!spans.length) return false;
  return spans.toArray().every((s) => ($(s).attr('class') || '').split(/\s+/).some((c) => st.bold.has(c)));
}

export function cleanDoc(rawHtml) {
  const $ = cheerio.load(rawHtml);
  const st = styleMap($);
  const nodes = $('body').children().toArray();

  // Section level = tag of first numbered heading ("1. ...")
  const headings = nodes.filter((n) => /^h[1-6]$/.test(n.tagName));
  const first = headings.find((n) => /^\d+\./.test(textOf($, n)));
  const secTag = first ? first.tagName : 'h1';
  const secLevel = +secTag[1];
  const firstSecIdx = nodes.findIndex((n) => n.tagName === secTag && textOf($, n));

  // ---- Meta from preamble (title, subtitle, byline, disclaimer)
  const pre = nodes.slice(0, firstSecIdx);
  const titles = pre.filter((n) => /\btitle\b/.test($(n).attr('class') || '') || n.tagName === 'h1').map((n) => textOf($, n)).filter(Boolean);
  const meta = { title: '', subtitle: '', byline: '', disclaimer: '' };
  if (titles.length > 1) { meta.title = titles[0]; meta.subtitle = titles[titles.length - 1]; }
  else if (titles[0]) { const [a, ...b] = titles[0].split(/\s+-\s+/); meta.title = a; meta.subtitle = b.join(' - '); }
  for (const n of pre) {
    const t = textOf($, n);
    if (!meta.byline && /(Jayakanthan|ஜெயகாந்தன்)/.test(t)) meta.byline = t.replace(/^-\s*/, '');
    else if (!meta.disclaimer && LEGAL.test(t)) meta.disclaimer = t.replace(/^Disclaimer\s*:\s*/i, '');
  }

  // ---- Body
  const sections = [];
  let cur = null;
  const listCount = {};
  for (const n of nodes.slice(firstSecIdx)) {
    const tag = n.tagName;
    const t = textOf($, n);
    const hl = /^h([1-6])$/.exec(tag);
    if (hl && +hl[1] === secLevel && t) {
      const m = /^(\d+)\.\s*(.*)$/.exec(t);
      cur = { id: `s${sections.length}`, num: m ? m[1] : '', title: m ? m[2] : t, html: [] };
      sections.push(cur);
      continue;
    }
    if (!cur) continue;
    if (hl && t) { cur.html.push(`<h3>${tidy(inline($, n, st)).replace(/<\/?strong>/g, '')}</h3>`); continue; }
    if (tag === 'p') {
      if (!t) continue;
      const body = tidy(inline($, n, st));
      if (isAllBold($, n, st) && t.length < 110 && !/:\s*\S/.test(t) && !/[.!]$/.test(t)) {
        cur.html.push(`<h3>${body.replace(/<\/?strong>/g, '')}</h3>`);
      } else if (CALLOUT.test(t)) {
        cur.html.push(`<div class="callout${WARN.test(t) ? ' warn' : ''}"><p>${body}</p></div>`);
      } else {
        cur.html.push(`<p>${body}</p>`);
      }
      continue;
    }
    if (tag === 'ul' || tag === 'ol') {
      const cls = $(n).attr('class') || '';
      const lm = /lst-kix_([\w]+)-(\d+)/.exec(cls);
      const key = lm ? `${lm[1]}-${lm[2]}` : Math.random();
      const level = lm ? +lm[2] : 0;
      if (/\bstart\b/.test(cls)) listCount[key] = 0;
      const items = $(n).children('li').toArray().map((li) => tidy(inline($, li, st))).filter(Boolean);
      const start = listCount[key] || 0;
      listCount[key] = start + items.length;
      const startAttr = tag === 'ol' && start ? ` start="${start + 1}"` : '';
      cur.html.push(`<${tag} class="lvl-${level}"${startAttr}>${items.map((i) => `<li>${i}</li>`).join('')}</${tag}>`);
      continue;
    }
    if (tag === 'table') {
      const rows = $(n).find('tr').toArray();
      const cell = (td) => $(td).children('p').toArray().map((p) => tidy(inline($, p, st))).filter(Boolean);
      const render = (td, th) => {
        const parts = cell(td);
        const inner = parts.length > 1 ? parts.map((p) => `<p>${p}</p>`).join('') : (parts[0] || '');
        return th ? `<th>${inner.replace(/<\/?strong>/g, '')}</th>` : `<td>${inner}</td>`;
      };
      const head = rows[0] ? `<thead><tr>${$(rows[0]).children('td,th').toArray().map((c) => render(c, true)).join('')}</tr></thead>` : '';
      const bodyRows = rows.slice(1).map((r) => `<tr>${$(r).children('td,th').toArray().map((c) => render(c, false)).join('')}</tr>`).join('');
      const kind = rows[0] && $(rows[0]).children().length === 2 ? ' checklist' : '';
      cur.html.push(`<div class="table-wrap${kind}"><table>${head}<tbody>${bodyRows}</tbody></table></div>`);
      continue;
    }
    if (tag === 'div' || tag === 'hr') continue;
  }
  return { meta, sections: sections.map((s) => ({ ...s, html: s.html.join('\n') })) };
}
