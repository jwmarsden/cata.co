// @ts-nocheck
// A line of MOO output -> HTML (escaped): ANSI SGR colours (16, 256, 24-bit
// and SMud's true colour), backgrounds, bold, underline and reset; links and
// object numbers made clickable. Other escape sequences are dropped.

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// links and object numbers (#1024, not #-1 or a #fragment in a link)
const LINK_RE = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]|(?<![\w#$])#\d+\b/g;

// Plain text -> HTML (escaped) with links and object numbers clickable.
export function linkText(text) {
  let html = '', last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    const attr = m[0][0] === '#' ? 'data-obj' : 'data-url';
    html += esc(text.slice(last, m.index)) + `<a href="#" ${attr}="${esc(m[0])}">${esc(m[0])}</a>`;
    last = m.index + m[0].length;
  }
  return html + esc(text.slice(last));
}
const linkify = linkText;

// The xterm 256-colour palette above the first 16: a 6×6×6 cube, then greys.
function xterm256(n) {
  if (n >= 232) { const v = 8 + (n - 232) * 10; return rgb(v, v, v); }
  n -= 16;
  const step = (v) => (v ? 55 + v * 40 : 0);
  return rgb(step(Math.floor(n / 36)), step(Math.floor(n / 6) % 6), step(n % 6));
}
const rgb = (r, g, b) => '#' + [r, g, b].map((v) => (v & 255).toString(16).padStart(2, '0')).join('');

// SMud's true colour: one SGR parameter holding 0x1000000 + 0xRRGGBB for the
// foreground, or 0x2000000 + 0xRRGGBB for the background (as Rupert's
// colortest sends, e.g. ESC[33554435;16777450m).
const SMUD_FG = 0x1000000, SMUD_BG = 0x2000000;

// fg and bg are a palette index (0-15, styled by the c<n>/bg<n> classes) or
// a '#rrggbb' string (an inline style).
export function ansiToHtml(line) {
  if (!line.includes('\x1b')) return linkify(line);
  let html = '';
  let fg = null, bg = null, bold = false, under = false;
  const parts = line.split(/(\x1b\[[0-9;]*[A-Za-z])/);
  for (const p of parts) {
    if (p.startsWith('\x1b[')) {
      if (!p.endsWith('m')) continue;
      const codes = p.slice(2, -1).split(';').map((n) => Number(n || 0));
      for (let i = 0; i < codes.length; i++) {
        const c = codes[i];
        if (c === 0) { fg = bg = null; bold = under = false; }
        else if (c === 1) bold = true;
        else if (c === 22) bold = false;
        else if (c === 4) under = true;
        else if (c === 24) under = false;
        else if (c >= 30 && c <= 37) fg = c - 30;
        else if (c >= 90 && c <= 97) fg = c - 90 + 8;
        else if (c === 39) fg = null;
        else if (c >= 40 && c <= 47) bg = c - 40;
        else if (c >= 100 && c <= 107) bg = c - 100 + 8;
        else if (c === 49) bg = null;
        else if (c === 38 || c === 48) {
          // 38;5;n and 38;2;r;g;b (48 for the background)
          let col = null;
          if (codes[i + 1] === 5) { const n = codes[i + 2] ?? 0; col = n < 16 ? n : xterm256(n); i += 2; }
          else if (codes[i + 1] === 2) { col = rgb(codes[i + 2] ?? 0, codes[i + 3] ?? 0, codes[i + 4] ?? 0); i += 4; }
          if (c === 38) fg = col; else bg = col;
        }
        else if (c >= SMUD_BG && c < SMUD_BG + 0x1000000) bg = '#' + (c - SMUD_BG).toString(16).padStart(6, '0');
        else if (c >= SMUD_FG && c < SMUD_FG + 0x1000000) fg = '#' + (c - SMUD_FG).toString(16).padStart(6, '0');
      }
      continue;
    }
    if (!p) continue;
    const cls = [typeof fg === 'number' && `c${fg}`, typeof bg === 'number' && `bg${bg}`, bold && 'b', under && 'u'].filter(Boolean);
    const style = [typeof fg === 'string' && `color:${fg}`, typeof bg === 'string' && `background:${bg}`].filter(Boolean);
    html += cls.length || style.length
      ? `<span${cls.length ? ` class="${cls.join(' ')}"` : ''}${style.length ? ` style="${style.join(';')}"` : ''}>${linkify(p)}</span>`
      : linkify(p);
  }
  return html;
}
