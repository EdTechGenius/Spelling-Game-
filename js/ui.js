// Tiny DOM helpers
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const $app = () => document.getElementById('app');

export function mount(...nodes) {
  const app = $app();
  app.replaceChildren(...nodes);
  app.scrollTop = 0;
  window.scrollTo(0, 0);
}

export function toast(msg, kind = '') {
  const t = h('div', { class: `toast ${kind}` }, msg);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2600);
}

export function modal(content, { onClose } = {}) {
  const close = () => { wrap.remove(); onClose && onClose(); };
  const wrap = h('div', { class: 'modal-wrap', onclick: (e) => { if (e.target === wrap) close(); } },
    h('div', { class: 'modal' }, content));
  document.body.append(wrap);
  return close;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const sample = (arr, n) => shuffle(arr).slice(0, n);

// Input attributes that stop the iPad "helping" with spelling
export const spellInputAttrs = {
  autocomplete: 'off', autocorrect: 'off', autocapitalize: 'none', spellcheck: 'false',
  enterkeyhint: 'done', inputmode: 'text',
};

export function normalise(s) {
  return String(s || '').trim().toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ');
}

export function confetti(n = 40) {
  const colours = ['#f4c542', '#4caf50', '#2f8fdd', '#e2574c', '#9b59b6', '#ff9ec7'];
  for (let i = 0; i < n; i++) {
    const p = h('div', { class: 'confetti', style: {
      left: Math.random() * 100 + 'vw', background: colours[i % colours.length],
      animationDelay: Math.random() * 0.4 + 's', transform: `rotate(${Math.random() * 360}deg)`,
    } });
    document.body.append(p);
    setTimeout(() => p.remove(), 2500);
  }
}

// Let replaceChildren() ignore null/undefined/false like h() does (handy for optional parts)
const nativeReplace = Element.prototype.replaceChildren;
Element.prototype.replaceChildren = function (...kids) {
  return nativeReplace.apply(this, kids.flat(Infinity).filter((c) => c != null && c !== false));
};
