import { h, tulipLogo, icon } from './dom';

export function header(active: 'home' | 'chest' | 'parents' | 'none' = 'none') {
  const link = (href: string, label: string, key: string, extra?: Node) =>
    h('a', { href, 'aria-current': active === key ? 'page' : undefined }, label, extra ?? null);
  return h(
    'header',
    { class: 'site-header' },
    h('a', { class: 'logo', href: '#/' }, tulipLogo(), h('span', null, 'Hikâyelerle Kültürüm', h('small', null, 'Türkçe sesli ve resimli kitaplar'))),
    h(
      'nav',
      { class: 'site-nav', 'aria-label': 'Ana menü' },
      link('#/', 'Kitaplar', 'home'),
    ),
  );
}

export function footer() {
  return h(
    'footer',
    { class: 'site-footer' },
    h('p', null, 'Üyelik, çerez ve reklam yok. Okuma ilerlemen yalnızca bu cihazda saklanır.'),
  );
}

export function page(active: Parameters<typeof header>[0], ...content: Node[]) {
  const main = h('main', { id: 'main' }, ...content);
  return [header(active), main, footer()];
}

export function backLink(href: string, label: string) {
  const a = h('a', { class: 'btn light small', href }, icon.back(), label);
  return a;
}
