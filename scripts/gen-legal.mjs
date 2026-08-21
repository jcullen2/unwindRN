#!/usr/bin/env node
/**
 * Legal pages: docs/legal/*.md is the single authoritative source; the public
 * HTML at web/privacy/ and web/terms/ is GENERATED — never edit it by hand.
 *   node scripts/gen-legal.mjs          # regenerate both pages
 *   node scripts/gen-legal.mjs --check  # fail if the HTML drifted from the md
 * Deterministic: same input, same bytes. `npm run check` runs --check so a
 * second legal master can never quietly come back.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const DOCS = [
  {
    md: 'docs/legal/privacy-policy.md',
    out: 'web/privacy/index.html',
    title: 'Privacy Policy — unwindRN',
    description:
      'unwindRN privacy policy: your voice never leaves your phone, debrief words are not written to our database, no ads, no tracking, delete means delete.',
    footer: '© 2026 unwindRN LLC · <a href="/terms" style="color:inherit">Terms of Service</a>',
  },
  {
    md: 'docs/legal/terms-of-service.md',
    out: 'web/terms/index.html',
    title: 'Terms of Service — unwindRN',
    description:
      'unwindRN terms of service: not therapy or medical care, your records are yours, written to be read.',
    footer: '© 2026 unwindRN LLC · <a href="/privacy" style="color:inherit">Privacy Policy</a>',
  },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Inline markdown: **bold**, [text](url), bare https:// links, bare emails. */
function inline(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(?<!["=>])\bhttps:\/\/[^\s<]+[^\s<.,)]/g, (m) => `<a href="${m}">${m.replace('https://', '')}</a>`)
    .replace(/\b([\w.+-]+@[\w-]+\.[A-Za-z]{2,})\b/g, '<a href="mailto:$1">$1</a>');
}

function render(md) {
  const lines = md
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n');
  const out = [];
  let para = [];
  let inList = false;

  const flushPara = () => {
    if (para.length) {
      out.push(`  <p>${inline(para.join(' '))}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (inList) {
      out.push('  </ul>');
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const t = line.trim();
    if (!t) {
      flushPara();
      closeList();
    } else if (t.startsWith('# ')) {
      flushPara();
      closeList();
      out.push(`  <h1>${inline(t.slice(2))}</h1>`);
    } else if (t.startsWith('## ')) {
      flushPara();
      closeList();
      out.push(`  <h2>${inline(t.slice(3))}</h2>`);
    } else if (/^\*[^*].*\*$/.test(t)) {
      flushPara();
      closeList();
      out.push(`  <p class="date">${inline(t.slice(1, -1))}</p>`);
    } else if (t.startsWith('- ')) {
      flushPara();
      if (!inList) {
        out.push('  <ul>');
        inList = true;
      }
      out.push(`    <li>${inline(t.slice(2))}</li>`);
    } else if (inList) {
      // continuation of the previous bullet
      out[out.length - 1] = out[out.length - 1].replace(/<\/li>$/, ` ${inline(t)}</li>`);
    } else {
      para.push(t);
    }
  }
  flushPara();
  closeList();
  return out.join('\n');
}

function page({ title, description, footer }, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/icon-256.png">
<style>
  :root{
    --night:#090F0E; --ink:#EAF1EC; --ink-dim:rgba(234,241,236,.66);
    --ink-faint:rgba(234,241,236,.38); --amber:#FFB65C;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--night); color:var(--ink);
    font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    -webkit-font-smoothing:antialiased}
  header{padding:28px 24px; max-width:720px; margin:0 auto}
  header a{color:var(--ink-dim); text-decoration:none; font-size:14px}
  header a:hover{color:var(--amber)}
  article{max-width:720px; margin:0 auto; padding:16px 24px 80px}
  h1{font-family:"Bricolage Grotesque",sans-serif; font-weight:600; font-size:34px; letter-spacing:-.4px}
  .date{color:var(--ink-faint); font-size:14px; margin:10px 0 30px}
  h2{font-family:"Bricolage Grotesque",sans-serif; font-weight:600; font-size:21px; margin:40px 0 12px}
  p{color:var(--ink-dim); margin-bottom:14px}
  p strong, li strong{color:var(--ink)}
  ul{color:var(--ink-dim); margin:0 0 14px 22px}
  li{margin-bottom:8px}
  a{color:var(--amber)}
  footer{max-width:720px; margin:0 auto; padding:0 24px 56px; color:var(--ink-faint); font-size:13.5px}
</style>
</head>
<body>
<header><a href="/">← unwindRN</a></header>
<article>
${body}
</article>
<footer>${footer}</footer>
</body>
</html>
`;
}

const checkMode = process.argv.includes('--check');
let drift = false;

for (const doc of DOCS) {
  const md = readFileSync(resolve(root, doc.md), 'utf8');
  const html = page(doc, render(md));
  const outPath = resolve(root, doc.out);
  if (checkMode) {
    let current = '';
    try {
      current = readFileSync(outPath, 'utf8');
    } catch {
      // missing counts as drift
    }
    if (current !== html) {
      drift = true;
      console.error(`DRIFT: ${doc.out} does not match ${doc.md} — run \`npm run gen:legal\``);
    }
  } else {
    writeFileSync(outPath, html);
    console.log(`generated ${doc.out} from ${doc.md}`);
  }
}

if (checkMode) {
  if (drift) process.exit(1);
  console.log('legal pages match their markdown sources');
}
