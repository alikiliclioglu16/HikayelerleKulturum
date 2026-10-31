import './styles.css';
import { h } from './ui/dom';
import { page } from './ui/shell';
import { renderEnd, renderQuiz, renderHunt, renderFamily } from './pages/activities';
import { renderChest, renderParents } from './pages/info';

const app = document.getElementById('app')!;
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
      if (sub === 'bitti') return await renderEnd(app, bookId);
      if (sub === 'quiz') return await renderQuiz(app, bookId);
      if (sub === 'degerler') return await renderHunt(app, bookId);
      if (sub === 'aile') return await renderFamily(app, bookId);
      const n = sub ? Number.parseInt(sub, 10) - 1 : undefined;
      const { renderReader } = await import('./pages/reader');
      document.title = 'Okuyorum | Hikâyelerle Kültürüm';
      const dispose = await renderReader(app, bookId, Number.isFinite(n) ? n : undefined);
      if (id !== routeId) dispose();
      else cleanup = dispose;
      return;
    }
    document.title = 'Hikâyelerle Kültürüm';
    if (parts[0] === 'sandik') {
      cleanup = renderChest(app);
      return;
    }
    if (parts[0] === 'ebeveyn') return renderParents(app);
    document.title = 'Hikâyelerle Kültürüm | Türk kültürüyle büyüyen resimli kitaplar';
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
          h('p', null, 'Bağlantınızı kontrol edip sayfayı yenileyin. Sorun sürerse kitaplar sayfasından yeniden deneyin.'),
          h('a', { class: 'btn', href: '#/' }, 'Kitaplara dön'),
        ),
      ),
    );
  }
}

window.addEventListener('hashchange', route);
route();
