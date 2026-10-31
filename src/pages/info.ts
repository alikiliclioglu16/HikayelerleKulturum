import { h, icon } from '../ui/dom';
import { page } from '../ui/shell';
import { store } from '../store';
import { TREASURES, GROUPS, type Treasure } from '../treasures';
import { Narrator } from '../narrator';
import { VALUES, VALUE_GROUPS, type ValueGroup } from '../values';

const narrator = new Narrator();

/** Where a treasure is found, in words: "Kültür rafında", "Bayram Sabahı kitabında"… */
const PLACE: Record<string, string> = {
  raf: 'ana sayfadaki kültür rafında',
  'bayram-sabahi': 'Bayram Sabahı kitabında',
  'keloglan-tohum': 'Keloğlan ve Üç Tohum kitabında',
  'nasreddin-hoca-kazan': 'Nasreddin Hoca ve Kazan kitabında',
  '23-nisan': '23 Nisan Şenliği kitabında',
};

/**
 * The Kelime Sandığı: the culture treasures a child has found, in groups (tastes, art and music, places,
 * traditions, tale heroes). Found ones show their picture; the others wait as dark silhouettes with a hint.
 * A found treasure opens a card with its 3D model turning on a stand and a short text about its place in
 * Turkish culture, which can be listened to.
 */
export function renderChest(root: HTMLElement): () => void {
  const found = store.treasures;
  const total = TREASURES.length;
  const count = TREASURES.filter((t) => found[t.id]).length;
  const calm = store.settings.calm || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closeCard: (() => void) | null = null;

  const head = h(
    'div',
    { class: 'chest-head' },
    h(
      'div',
      null,
      h('h1', null, 'Kelime Sandığım'),
      h('p', null, 'Kitaplarda ve kültür rafında bulduğun Türk kültürü hazineleri burada. Bir hazineye dokun: onu çevirip incele, hikâyesini dinle.'),
    ),
    h(
      'div',
      { class: 'chest-meter', role: 'img', 'aria-label': `${total} hazineden ${count} tanesini buldun` },
      h('div', { class: 'cm-num' }, h('strong', null, String(count)), ` / ${total}`),
      h('div', { class: 'cm-label' }, 'hazine'),
      h('div', { class: 'cm-bar' }, h('span', { style: `width:${Math.round((count / total) * 100)}%` })),
    ),
  );

  const opened = TREASURES.filter((t) => found[t.id]);
  function openCard(t: Treasure) {
    closeCard?.();
    let current = t;
    const canvas = h('canvas', { class: 'tv-canvas', 'aria-label': `${t.name} (üç boyutlu, sürükleyerek çevir)` }) as HTMLCanvasElement;
    const chip = h('span', { class: 'tc-chip' });
    const title = h('h2', { lang: 'tr' });
    const fact = h('p', { class: 'tc-fact', lang: 'tr' });
    const where = h('p', { class: 'tc-where' });
    const listen = h('button', { class: 'btn turq', type: 'button' }, icon.speaker(), 'Dinle');
    const prev = h('button', { class: 'btn light icon-only', type: 'button', 'aria-label': 'Önceki hazine' }, icon.back());
    const next = h('button', { class: 'btn light icon-only', type: 'button', 'aria-label': 'Sonraki hazine' }, icon.next());
    const close = h('button', { class: 'btn light small icon-only tc-close', type: 'button', 'aria-label': 'Kapat' }, icon.close());
    const dlg = h(
      'div',
      { class: 'tc-card', role: 'dialog', 'aria-modal': 'true' },
      close,
      h('div', { class: 'tc-view' }, canvas, h('span', { class: 'tc-drag', 'aria-hidden': 'true' }, 'Çevirmek için sürükle')),
      h('div', { class: 'tc-info' }, chip, title, fact, where, h('div', { class: 'tc-actions' }, listen, h('span', { class: 'tc-nav' }, prev, next))),
    );
    const backdrop = h('div', { class: 'tc-backdrop' }, dlg);
    document.body.append(backdrop);
    document.body.classList.add('no-scroll');
    let viewer: import('../three/treasureViewer').TreasureViewer | null = null;
    const show = (x: Treasure) => {
      current = x;
      dlg.setAttribute('aria-label', x.name);
      dlg.dataset.group = x.group;
      chip.textContent = GROUPS.find((g) => g.id === x.group)?.name ?? '';
      title.textContent = x.name;
      fact.textContent = x.fact;
      const f = found[x.id];
      where.textContent = f ? `Bu hazineyi ${PLACE[f.from] ?? 'bir kitapta'} buldun.` : '';
      const i = opened.indexOf(x);
      prev.toggleAttribute('disabled', opened.length < 2);
      next.toggleAttribute('disabled', opened.length < 2);
      prev.dataset.to = opened[(i - 1 + opened.length) % opened.length]?.id ?? '';
      next.dataset.to = opened[(i + 1) % opened.length]?.id ?? '';
      void viewer?.show(x.model);
    };
    import('../three/treasureViewer').then(({ TreasureViewer }) => {
      if (!backdrop.isConnected) return;
      viewer = new TreasureViewer(canvas, calm);
      void viewer.show(current.model);
    });
    show(t);
    const go = (id?: string) => {
      const x = opened.find((o) => o.id === id);
      if (x) {
        narrator.stop();
        show(x);
      }
    };
    prev.addEventListener('click', () => go(prev.dataset.to));
    next.addEventListener('click', () => go(next.dataset.to));
    listen.addEventListener('click', () => narrator.ready.then(() => narrator.say(`${current.name}. ${current.fact}`)));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') shut();
      else if (e.key === 'ArrowRight') go(next.dataset.to);
      else if (e.key === 'ArrowLeft') go(prev.dataset.to);
    };
    const shut = () => {
      if (!backdrop.isConnected) return;
      narrator.stop();
      viewer?.dispose();
      backdrop.remove();
      document.body.classList.remove('no-scroll');
      window.removeEventListener('keydown', onKey);
      closeCard = null;
      cardBtn(current.id)?.focus();
    };
    close.addEventListener('click', shut);
    backdrop.addEventListener('click', (e) => e.target === backdrop && shut());
    window.addEventListener('keydown', onKey);
    closeCard = shut;
    narrator.ready.then(() => backdrop.isConnected && narrator.say(t.name));
    close.focus();
  }

  const grid = new Map<string, HTMLElement>();
  const cardBtn = (id: string) => grid.get(id) ?? null;
  const sections = GROUPS.map((g) => {
    const items = TREASURES.filter((t) => t.group === g.id);
    const n = items.filter((t) => found[t.id]).length;
    return h(
      'section',
      { class: `t-group g-${g.id}`, 'aria-label': g.name },
      h('h2', null, g.name, h('span', { class: 'n' }, `${n} / ${items.length}`)),
      h(
        'div',
        { class: 't-grid' },
        ...items.map((t) => {
          const f = found[t.id];
          if (!f) {
            const hint = t.found.map((k) => PLACE[k]).filter(Boolean)[0] ?? '';
            return h(
              'div',
              { class: 't-card locked', role: 'img', 'aria-label': `Henüz bulunmadı. İpucu: ${hint}` },
              h('span', { class: 't-stage' }, h('img', { src: t.thumb, alt: '', loading: 'lazy', draggable: 'false' }), h('span', { class: 'q', 'aria-hidden': 'true' }, '?')),
              h('span', { class: 't-name' }, '?'),
              h('span', { class: 't-hint' }, `İpucu: ${hint}`),
            );
          }
          const b = h(
            'button',
            { class: 't-card', type: 'button', 'aria-label': `${t.name}: aç` },
            h('span', { class: 't-stage' }, h('img', { src: t.thumb, alt: '', loading: 'lazy', draggable: 'false' })),
            h('span', { class: 't-name', lang: 'tr' }, t.name),
          );
          b.addEventListener('click', () => openCard(t));
          grid.set(t.id, b);
          return b;
        }),
      ),
    );
  });

  const body: Node[] = [head];
  if (!count) {
    body.push(
      h(
        'div',
        { class: 'empty chest-empty' },
        h('p', null, 'Sandığın henüz boş. Kitaplarda altı noktalı kelimelere ya da resimdeki nesnelere, ana sayfada da kültür rafındaki nesnelere dokun: Türk kültürüne ait her hazine buraya gelir.'),
        h('a', { class: 'btn', href: '#/' }, icon.book(), 'Kitaplara git'),
      ),
    );
  }
  body.push(...sections);
  root.replaceChildren(...page('chest', ...body));
  document.title = 'Kelime Sandığım | Hikâyelerle Kültürüm';
  return () => {
    closeCard?.();
    narrator.stop();
  };
}

export function renderParents(root: HTMLElement) {
  const reset = h('button', { class: 'btn light small', type: 'button' }, 'İlerlemeyi ve sandığı sıfırla');
  reset.addEventListener('click', () => {
    if (window.confirm('Bu cihazdaki okuma ilerlemesi ve Kelime Sandığı silinsin mi?')) {
      store.reset();
      renderParents(root);
    }
  });
  const groups = (Object.keys(VALUE_GROUPS) as ValueGroup[]).map((g) =>
    h('li', null, h('strong', null, `${VALUE_GROUPS[g].name}: `), VALUES.filter((v) => v.group === g).map((v) => v.name).join(', ')),
  );
  root.replaceChildren(
    ...page(
      'parents',
      h('div', { class: 'page-head' }, h('h1', null, 'Ebeveynler için'), h('p', null, 'Amerika’da büyüyen çocuklarımız için Türkçe ve Türk kültürüyle tanışmanın sıcak bir yolu.')),
      h(
        'div',
        { class: 'prose panel', style: 'margin-top:16px' },
        h('h2', { style: 'margin-top:0' }, 'Nasıl çalışır?'),
        h('p', null, 'Her kitap masanın üzerinde açılan, sayfaları kâğıttan sahnelerle canlanan bir resimli kitaptır. Metin Türkçedir; altı noktalı kelimelere dokununca kelime okunur ve resimdeki nesne zıplar. Her şey Türkçedir; çocuk dili, resimler, sesler ve 3D nesnelerle öğrenir.'),
        h('p', null, 'Resimdeki nesnelere dokunmak da işe yarar: dokunulan nesnenin Türkçesi okunur ve metindeki kelime parlar. Böylece çocuk kelimeyle resmi birlikte öğrenir.'),
        h('h2', null, 'Kültür rafı'),
        h('p', null, 'Ana sayfadaki üst rafta 20 Türk kültürü ögesi durur: çay, simit, bağlama, peri bacaları, nazar boncuğu, Karagöz ile Hacivat ve daha fazlası. Çocuk bir ögeye dokununca Türkçe adını duyar ve kısa bir bilgi okur; öge Kelime Sandığı’na hazine olarak eklenir.'),
        h('h2', null, 'Kimler için?'),
        h('p', null, 'Kitaplar 4–11 yaş için yazıldı. Küçükler dinleyip resimdeki nesnelere dokunarak, büyükler metni kendileri okuyarak takip eder. Türk kültürüne ait kelimeler (çay, bağlama, Nasreddin Hoca, Büyük Millet Meclisi…) Kelime Sandığı’nda birer hazine olur: çocuk onları üç boyutlu çevirip inceler, kültürümüzdeki yerini anlatan kısa metni dinler.'),
        h('h2', null, 'Değerler'),
        h('p', null, 'Kitaplar Türkiye Yüzyılı Maarif Modeli’nin Erdem-Değer-Eylem Çerçevesi’ndeki değerleri işler. Her kitabın sonunda bir değer avı, konuşma soruları ve küçük bir aile görevi vardır.'),
        h('ul', null, ...groups),
        h('h2', null, 'Sesli okuma'),
        h('p', null, 'Bu ilk sürümde sesli okuma cihazın kendi Türkçe sesiyle yapılır. iPhone, iPad ve Mac’te Safari, Windows’ta Microsoft Edge ve Android’de Chrome Türkçe ses sunar. Türkçe ses olmayan cihazlarda kelimeler okuma hızında sırayla parlar, siz sesli okursunuz. Sonraki sürümde kitaplar gerçek bir anlatıcının sesiyle gelecek.'),
        h('h2', null, 'Müzik ve sesler'),
        h('p', null, 'Her kitabın kendi müziği vardır: Bayram Sabahı’nda Rast, Nasreddin Hoca’da Hicaz, Keloğlan’da Uşşak makamında yazılmış kısa havalar. Müzikler FluidR3 GM ses bankasının (Frank Wen, CC BY 3.0) çalgı örnekleriyle hazırlandı. Sahnelerdeki sesler ve ana sayfadaki ninni tarayıcıda üretilir.'),
        h('h2', null, 'Gizlilik'),
        h('p', null, 'Hesap açmak gerekmez. Çerez, reklam ya da izleme aracı kullanılmaz. Okuma ilerlemesi ve Kelime Sandığı yalnızca bu tarayıcıda saklanır ve başka bir yere gönderilmez.'),
        reset,
      ),
    ),
  );
  document.title = 'Ebeveynler için | Hikâyelerle Kültürüm';
}
