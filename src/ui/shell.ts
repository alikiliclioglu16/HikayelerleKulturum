import { h, tulipLogo, icon } from './dom';
import { store } from '../store';

export function header(active: 'home' | 'chest' | 'parents' | 'none' = 'none') {
  const count = store.treasureCount;
  const link = (href: string, label: string, key: string, extra?: Node) =>
    h('a', { href, 'aria-current': active === key ? 'page' : undefined }, label, extra ?? null);
  return h(
    'header',
    { class: 'site-header' },
    h('a', { class: 'logo', href: '#/' }, tulipLogo(), h('span', null, 'Hikâyelerle Kültürüm', h('small', null, 'Türk kültürüyle büyüyen resimli kitaplar'))),
    h(
      'nav',
      { class: 'site-nav', 'aria-label': 'Ana menü' },
      link('#/', 'Kitaplar', 'home'),
      link('#/sandik', 'Kelime Sandığım', 'chest', h('span', { class: 'count', 'aria-label': `${count} kültür hazinesi` }, String(count))),
      link('#/ebeveyn', 'Ebeveynler için', 'parents'),
    ),
  );
}

export function footer() {
  return h(
    'footer',
    { class: 'site-footer' },
    h('p', null, 'Hesap yok, çerez yok, reklam yok. Okuma ilerlemesi ve Kelime Sandığı yalnızca bu cihazda saklanır.'),
    h('p', null, 'Bu bir prototiptir; resimler ve anlatıcı sesi geçicidir.'),
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
