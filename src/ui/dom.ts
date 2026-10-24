type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, unknown> & { class?: string; style?: string };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (k === 'html') el.innerHTML = String(v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function svg(markup: string): SVGElement {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as SVGElement;
}

const S = (d: string, extra = '') =>
  `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

export const icon = {
  back: () => svg(S('<path d="M15 5l-7 7 7 7"/>')),
  next: () => svg(S('<path d="M9 5l7 7-7 7"/>')),
  play: () => svg(S('<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>')),
  pause: () => svg(S('<rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/>')),
  speaker: () => svg(S('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>')),
  gear: () =>
    svg(
      S(
        '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5"/>',
      ),
    ),
  close: () => svg(S('<path d="M6 6l12 12M18 6L6 18"/>')),
  star: () => svg(S('<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8z" fill="currentColor" stroke-width="1.4"/>')),
  check: () => svg(S('<path d="M5 12.5l4.5 4.5L19 7.5"/>')),
  light: () => svg(S('<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.6 10.8c.8.6 1.1 1.4 1.1 2.2h5c0-.8.3-1.6 1.1-2.2A6 6 0 0012 3z"/>')),
  chest: () =>
    svg(
      S('<path d="M3.5 10.5h17v8a1.5 1.5 0 01-1.5 1.5H5a1.5 1.5 0 01-1.5-1.5z"/><path d="M3.5 10.5V9a5 5 0 015-5h7a5 5 0 015 5v1.5"/><path d="M10 10.5v3h4v-3"/>'),
    ),
  lang: () => svg(S('<path d="M4 6h8M8 4v2M5.5 6c.8 3 3 5.5 6 7M10.5 6c-.8 3-3.3 6-6.5 7.5"/><path d="M13 20l3.5-9 3.5 9M14.2 17h4.6"/>')),
  home: () => svg(S('<path d="M4 11l8-6.5 8 6.5"/><path d="M6 10v9.5h12V10"/>')),
  mute: () => svg(S('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>')),
  parents: () =>
    svg(
      S('<circle cx="8.5" cy="7.5" r="2.8"/><circle cx="16.5" cy="9" r="2.3"/><path d="M3.5 19.5c0-3.3 2.2-5.5 5-5.5s5 2.2 5 5.5"/><path d="M13.5 15c.8-.9 1.8-1.4 3-1.4 2.4 0 4 1.9 4 4.9"/>'),
    ),
  tulip: () =>
    svg(
      `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 21v-8" stroke="#5BC07A" stroke-width="2.2" stroke-linecap="round"/><path d="M12 17c-2.2-.3-4-2-4.6-4 2.4 0 4 1.5 4.6 4z" fill="#5BC07A"/><path d="M6.5 4c-.4 3.8 1.2 7.3 5.5 8 4.3-.7 5.9-4.2 5.5-8l-2.6 2.2L12 3 9.1 6.2z" fill="#F0614F"/></svg>`,
    ),
  book: () => svg(S('<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5z"/><path d="M12 6.5v13"/>')),
};

export const tulipLogo = () =>
  svg(`<svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
  <path d="M32 58V34" stroke="#3E8E4E" stroke-width="4" stroke-linecap="round"/>
  <path d="M32 46c-6-1-12-6-14-12 7 0 12 4 14 12z" fill="#3E8E4E"/>
  <path d="M32 42c6-1 11-5 13-10-7 0-11 3-13 10z" fill="#3E8E4E"/>
  <path d="M20 12c-1 10 3 20 12 22 9-2 13-12 12-22l-6 5-6-9-6 9z" fill="#D2372C"/>
  <path d="M32 8l-6 9c2 7 4 12 6 17 2-5 4-10 6-17z" fill="#E85A4C"/>
</svg>`);

export function chip(text: string, kind = '') {
  return h('span', { class: `chip ${kind}` }, text);
}
