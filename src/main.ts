import './styles.css';
import { h } from './ui/dom';
import { page } from './ui/shell';
import { startStarTrail } from './ui/starTrail';

const app = document.getElementById('app')!;
startStarTrail();
let cleanup: (() => void) | null = null;
let routeId = 0;

async function route() {
  const id = ++routeId;
  cleanup?.();
  cleanup = null;
  const parts = (location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean).map(decodeURIComponent);
  window.scrollTo(0, 0);
  try {
    if (parts[0] === 'kitap' && parts[1]) {
      const bookId = parts[1];
      const sub = parts[2];
      // the activities after a book are gone: those addresses lead back to the shelf
      if (sub && !/^\d+$/.test(sub)) {
        location.replace('#/');
        return;
      }
      const n = sub ? Number.parseInt(sub, 10) - 1 : undefined;
      const { renderReader } = await import('./pages/reader');
      document.title = 'Hikâyelerle Kültürüm';
      const dispose = await renderReader(app, bookId, Number.isFinite(n) ? n : undefined);
      if (id !== routeId) dispose();
      else cleanup = dispose;
      return;
    }
    document.title = 'Hikâyelerle Kültürüm';
    // the word chest and the parents' page are gone
    if (parts[0] === 'sandik' || parts[0] === 'ebeveyn') {
      location.replace('#/');
      return;
    }
    document.title = 'Hikâyelerle Kültürüm | Türkçe sesli ve resimli kitaplar';
    const { renderHome } = await import('./pages/home');
    const disposeHome = await renderHome(app);
    if (id !== routeId) disposeHome();
    else cleanup = disposeHome;
  } catch (err) {
    console.error(err);
    if (id !== routeId) return;
    app.replaceChildren(
      ...page(
        'none',
        h(
          'div',
          { class: 'empty', style: 'margin-top:24px' },
          h('h1', { style: 'color:var(--cobalt)' }, 'Bu sayfa açılamadı'),
          h('p', null, 'İnternet bağlantını kontrol edip sayfayı yenile. Sorun sürerse kitaplara dönüp yeniden dene.'),
          h('a', { class: 'btn', href: '#/' }, 'Kitaplara dön'),
        ),
      ),
    );
  }
}

window.addEventListener('hashchange', route);
route();
