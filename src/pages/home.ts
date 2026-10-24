import { h, icon, chip, tulipLogo } from '../ui/dom';
import { loadListing, loadCulture, coverCanvas, cloneCanvas, fonts } from '../content';
import { store } from '../store';
import { LEVELS, valueById } from '../values';
import { Narrator } from '../narrator';
import { sfx } from '../sfx';
import { HomeScene, ITEM_GAP, type CultureDef } from '../home3d/homeScene';
import { MOTIFS } from '../home3d/kilim';
import type { BookListing, LevelId } from '../types';

/**
 * The home page is a 3D room: a shelf of Turkish culture objects on top and a shelf of books below.
 */
export async function renderHome(root: HTMLElement): Promise<() => void> {
  const shell = h('div', { class: 'home3d' }, h('div', { class: 'loading home-loading' }, 'Raflar diziliyor…'));
  root.replaceChildren(shell);

  const [list, culture] = await Promise.all([loadListing(), loadCulture(), fonts()]);
  const covers = await Promise.all(list.map((b) => coverCanvas(b, 700)));
  const narrator = new Narrator();

  /* ---------- DOM ---------- */
  const sceneHost = h('div', { class: 'scene-host' });
  const vignette = h('div', { class: 'vignette', 'aria-hidden': 'true' });

  const statPages = h('span', null);
  const statChest = h('span', null);
  const statCulture = h('span', null);
  const stats = h('a', { class: 'home-stats', href: '#/sandik' }, statPages, statChest, statCulture);
  const soundBtn = h('button', { class: 'round-btn', type: 'button' });
  const musicBtn = h('button', { class: 'round-btn', type: 'button' });
  const chestBadge = h('span', { class: 'badge' }, '0');
  const hud = h(
    'header',
    { class: 'home-hud' },
    h(
      'div',
      { class: 'home-left' },
      h('a', { class: 'home-brand', href: '#/' }, tulipLogo(), h('span', { class: 'wm' }, h('span', null, 'Hikâyelerle'), ' ', h('span', null, 'Kültürüm'))),
      stats,
    ),
    h(
      'nav',
      { class: 'home-actions', 'aria-label': 'Menü' },
      musicBtn,
      soundBtn,
      h('a', { class: 'round-btn', href: '#/sandik', 'aria-label': 'Kelime Sandığım', title: 'Kelime Sandığım' }, icon.chest(), chestBadge),
      h('a', { class: 'round-btn', href: '#/ebeveyn', 'aria-label': 'Ebeveynler için', title: 'Ebeveynler için' }, icon.parents()),
    ),
  );

  const shelfPrev = h('button', { class: 'shelf-btn prev', type: 'button', 'aria-label': 'Rafı sola kaydır' }, icon.back());
  const shelfNext = h('button', { class: 'shelf-btn next', type: 'button', 'aria-label': 'Rafı sağa kaydır' }, icon.next());
  const carPrev = h('button', { class: 'round-btn car-arrow prev', type: 'button', 'aria-label': 'Önceki kitaplar' }, icon.back());
  const carNext = h('button', { class: 'round-btn car-arrow next', type: 'button', 'aria-label': 'Sonraki kitaplar' }, icon.next());
  const dots = h('div', { class: 'car-dots', role: 'group', 'aria-label': 'Kitap sayfaları' });
  const ring = h('div', { class: 'item-ring', hidden: true, 'aria-hidden': 'true' });
  const motifName = h('strong', null, '');
  const motifText = h('span', null, '');
  const motifCap = h('div', { class: 'motif-cap', role: 'status', 'aria-live': 'polite' }, h('span', { class: 'mc-dot', 'aria-hidden': 'true' }), h('span', { class: 'mc-body' }, motifName, motifText));
  const hint = h('div', { class: 'home-hint', hidden: true, role: 'status' }, icon.tulip(), 'Raftaki nesnelere dokun, Türkçe adlarını duy!');

  const cards = list.map((b, i) => {
    const soon = b.status === 'soon';
    const bar = h('i', null);
    const meta = h('span', null);
    const card = h(
      'button',
      { class: `book-card${soon ? ' soon' : ''}`, type: 'button', 'aria-label': `${b.title}${soon ? ', yakında' : ''}` },
      h('span', { class: 't' }, b.title),
      h('span', { class: 'bar' }, bar),
      h('span', { class: 'meta' }, meta, soon ? h('span', { class: 'soon-badge' }, 'Yakında') : h('span', { class: 'en' }, b.titleEn)),
    );
    card.addEventListener('click', () => openBook(i));
    return { card, bar, meta, book: b };
  });
  const cardLayer = h('div', { class: 'card-layer' }, ...cards.map((c) => c.card));

  const srItems = h(
    'ul',
    { class: 'sr-only', 'aria-label': 'Kültür rafı' },
    ...culture.map((c, i) => {
      const b = h('button', { type: 'button' }, `${c.name} (${c.en})`);
      b.addEventListener('focus', () => focusItem(i));
      b.addEventListener('blur', () => focusItem(null));
      b.addEventListener('click', () => activateItem(i));
      return h('li', null, b);
    }),
  );

  shell.replaceChildren(
    h('h1', { class: 'sr-only' }, 'Hikâyelerle Kültürüm: Türk kültürüyle büyüyen resimli kitaplar'),
    sceneHost,
    vignette,
    hud,
    shelfPrev,
    shelfNext,
    ring,
    hint,
    motifCap,
    cardLayer,
    carPrev,
    carNext,
    dots,
    srItems,
  );

  /* ---------- 3D ---------- */
  const scene = new HomeScene(sceneHost);
  if (store.settings.calm) scene.reducedMotion = true;
  scene.setItems(culture);
  scene.setBooks(list.map((b, i) => ({ id: b.id, cover: covers[i], spine: b.cover.color ?? '#1C3F8C' })));

  /* ---------- stats & sound ---------- */
  function updateStats() {
    const ready = list.filter((b) => b.status === 'ready');
    const total = ready.reduce((a, b) => a + (b.pages ?? 0), 0);
    const read = ready.reduce((a, b) => a + store.progress(b.id).read.length, 0);
    const words = Object.keys(store.chest).length;
    statPages.replaceChildren(icon.star(), `${read}/${total}`);
    statChest.replaceChildren(icon.chest(), String(words));
    statCulture.replaceChildren(icon.tulip(), `${store.culture.length}/${culture.length}`);
    stats.setAttribute('aria-label', `${total} sayfanın ${read} tanesi okundu, sandıkta ${words} kelime, kültür rafında ${culture.length} nesneden ${store.culture.length} tanesi keşfedildi`);
    stats.title = 'Okunan sayfalar, sandıktaki kelimeler, keşfedilen kültür nesneleri';
    chestBadge.textContent = String(words);
    cards.forEach(({ book, bar, meta }) => {
      if (book.status === 'soon') {
        bar.style.width = '0%';
        meta.textContent = `${book.values.map((v) => valueById(v).name).join(', ')}`;
        return;
      }
      const r = store.progress(book.id).read.length;
      const n = book.pages ?? 0;
      bar.style.width = `${n ? (r / n) * 100 : 0}%`;
      meta.textContent = r ? `${r}/${n} sayfa okundu` : `${n} sayfa`;
    });
  }
  function updateSound() {
    const on = store.settings.sound;
    soundBtn.replaceChildren(on ? icon.speaker() : icon.mute());
    soundBtn.setAttribute('aria-label', on ? 'Sesleri kapat' : 'Sesleri aç');
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.title = on ? 'Sesler açık' : 'Sesler kapalı';
    const m = store.settings.music && on;
    musicBtn.replaceChildren(icon.music());
    musicBtn.setAttribute('aria-label', m ? 'Müziği kapat' : 'Müziği aç');
    musicBtn.setAttribute('aria-pressed', String(m));
    musicBtn.title = m ? 'Arka plan müziği açık' : 'Arka plan müziği kapalı';
    musicBtn.toggleAttribute('disabled', !on);
  }
  soundBtn.addEventListener('click', () => {
    store.setSettings({ sound: !store.settings.sound });
    if (!store.settings.sound) {
      narrator.stop();
      sfx.stopMusic(0.3);
    } else {
      sfx.tap();
      sfx.startMusic();
    }
    updateSound();
  });
  musicBtn.addEventListener('click', () => {
    store.setSettings({ music: !store.settings.music });
    if (store.settings.music) sfx.startMusic();
    else sfx.stopMusic();
    updateSound();
  });
  // starts now, or right after the first tap or key press (browsers require one)
  sfx.startMusic();

  /* ---------- culture bubble ---------- */
  let popIndex: number | null = null;
  let popEl: HTMLElement | null = null;
  let popTimer = 0;

  function closePop() {
    popEl?.remove();
    popEl = null;
    popIndex = null;
    window.clearTimeout(popTimer);
  }

  function showPop(i: number, isNew: boolean) {
    closePop();
    const c = culture[i];
    const say = h('button', { class: 'round-btn small cp-say', type: 'button', 'aria-label': `${c.name} kelimesini dinle` }, icon.speaker());
    say.addEventListener('click', () => speak(c.name, true));
    popEl = h(
      'div',
      { class: 'culture-pop', role: 'status' },
      say,
      h('div', { class: 'cp-head' }, c.icon ? h('span', { class: 'cp-ico', 'aria-hidden': 'true' }, c.icon) : null, h('span', { class: 'cp-name', lang: 'tr' }, c.name)),
      h('div', { class: 'cp-en', lang: 'en' }, c.en),
      h('p', { class: 'cp-fact', lang: 'tr' }, c.fact.tr),
      h('p', { class: 'cp-fact-en', lang: 'en' }, c.fact.en),
      isNew ? h('span', { class: 'cp-new' }, 'Yeni keşif! Sandığına eklendi') : null,
    );
    shell.append(popEl);
    popIndex = i;
    positionPop();
    popTimer = window.setTimeout(closePop, 9000);
  }

  function positionPop() {
    if (!popEl || popIndex === null) return;
    if (!scene.itemVisible(popIndex)) {
      popEl.style.visibility = 'hidden';
      return;
    }
    popEl.style.visibility = '';
    const a = scene.itemAnchor(popIndex);
    const W = shell.clientWidth;
    const bw = popEl.offsetWidth;
    const left = Math.max(12, Math.min(W - bw - 12, a.x - bw / 2));
    popEl.style.left = `${left}px`;
    popEl.style.top = `${a.y + 14}px`;
    popEl.style.setProperty('--ax', `${Math.max(22, Math.min(bw - 22, a.x - left))}px`);
  }

  let duckTimer = 0;
  function speak(text: string, force = false) {
    if (!store.settings.sound && !force) return;
    sfx.duck(true);
    window.clearTimeout(duckTimer);
    duckTimer = window.setTimeout(() => sfx.duck(false), 2600);
    narrator.say(text);
  }

  function activateItem(i: number) {
    const c = culture[i];
    scene.ensureItemVisible(i);
    scene.hopItem(i);
    scene.sparkle('item', i, 1.8);
    const isNew = store.discover(c.id);
    store.addWord({ lemma: c.name, en: c.en, icon: c.icon, book: 'kultur-rafi', at: Date.now() });
    sfx.item(c.id, i);
    if (isNew) sfx.chime();
    speak(c.name);
    showPop(i, isNew);
    updateStats();
    if (!hint.hidden) {
      hint.hidden = true;
      store.markHint('shelf');
    }
  }

  let focused: number | null = null;
  function focusItem(i: number | null) {
    focused = i;
    if (i !== null) scene.sparkle('item', i, 0.8);
    scene.hoverItem(i);
    if (i !== null) scene.ensureItemVisible(i);
    syncDom();
  }

  /* ---------- book sheet ---------- */
  let sheetClose: (() => void) | null = null;
  function openBook(i: number) {
    const b = list[i];
    closePop();
    scene.setPage(scene.pageOfBook(i));
    scene.pullBook(i);
    scene.sparkle('book', i, 1.4);
    sfx.slide();
    sheetClose?.();
    const soon = b.status === 'soon';
    const cover = cloneCanvas(covers[i], `${b.title} kitabının kapağı`);
    const close = () => {
      backdrop.remove();
      scene.pullBook(null);
      sheetClose = null;
      cards[i].card.focus({ preventScroll: true });
    };
    const closeBtn = h('button', { class: 'btn light small icon-only sheet-x', type: 'button', 'aria-label': 'Kapat' }, icon.close());
    closeBtn.addEventListener('click', close);
    const body: Node[] = [
      h('h2', { class: 'bs-title' }, b.title),
      h('p', { class: 'bs-en' }, b.titleEn),
      h('div', { class: 'bs-chips' }, ...b.values.map((v) => chip(valueById(v).name, valueById(v).group))),
      h('p', { class: 'bs-sum', lang: 'tr' }, b.blurb.tr),
      h('p', { class: 'bs-sum-en', lang: 'en' }, b.blurb.en),
    ];
    if (soon) {
      body.push(h('p', { class: 'bs-soon' }, 'Bu kitap yakında rafta olacak. Şimdilik Bayram Sabahı’nı okuyabilirsin.'));
      body.push(h('div', { class: 'bs-actions' }, h('button', { class: 'btn light', type: 'button', onclick: close }, 'Kapat')));
    } else {
      const prog = store.progress(b.id);
      const level = store.settings.level;
      const radios = LEVELS.map((lv) => {
        const id = `bs-lv-${lv.id}`;
        const input = h('input', { type: 'radio', name: 'bs-level', id, value: lv.id, checked: lv.id === level });
        input.addEventListener('change', () => store.setSettings({ level: lv.id as LevelId }));
        return h('div', { class: 'level' }, input, h('label', { for: id }, h('span', { class: 'lv-name' }, lv.name), h('span', { class: 'lv-ages' }, lv.ages)));
      });
      const started = prog.page > 0 && prog.page < (b.pages ?? 0);
      body.push(
        h('fieldset', { class: 'level-picker' }, h('legend', null, 'Okuma seviyesi'), h('div', { class: 'levels' }, ...radios)),
        h(
          'div',
          { class: 'bs-actions' },
          h('a', { class: 'btn', href: `#/kitap/${b.id}` }, icon.book(), started ? 'Kaldığın yerden oku' : 'Kitabı aç'),
          started ? h('a', { class: 'btn light', href: `#/kitap/${b.id}/1` }, 'Baştan başla') : null,
        ),
      );
    }
    const sheet = h(
      'div',
      { class: 'book-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': b.title },
      closeBtn,
      h('div', { class: 'bs-cover' }, cover),
      h('div', { class: 'bs-body' }, ...body),
    );
    const backdrop = h('div', { class: 'book-sheet-backdrop' }, sheet);
    backdrop.addEventListener('click', (e) => e.target === backdrop && close());
    shell.append(backdrop);
    sheetClose = close;
    (sheet.querySelector('a.btn, button.btn:not(.sheet-x)') as HTMLElement | null)?.focus({ preventScroll: true });
  }

  /* ---------- carousel ---------- */
  function renderDots() {
    const n = scene.pageCount;
    dots.replaceChildren(
      ...Array.from({ length: n }, (_, p) => {
        const d = h('button', { class: 'dot', type: 'button', 'aria-label': `Kitaplar, ${p + 1}. sayfa`, 'aria-current': p === scene.page ? 'true' : undefined });
        d.addEventListener('click', () => goPage(p));
        return d;
      }),
    );
    dots.hidden = n < 2;
    carPrev.hidden = n < 2;
    carNext.hidden = n < 2;
    carPrev.toggleAttribute('disabled', scene.page === 0);
    carNext.toggleAttribute('disabled', scene.page >= n - 1);
  }
  function goPage(p: number) {
    if (p < 0 || p >= scene.pageCount || p === scene.page) return;
    closePop();
    scene.setPage(p);
    sfx.slide();
    renderDots();
  }
  carPrev.addEventListener('click', () => goPage(scene.page - 1));
  carNext.addEventListener('click', () => goPage(scene.page + 1));
  shelfPrev.addEventListener('click', () => scene.scrollShelfBy(3 * ITEM_GAP));
  shelfNext.addEventListener('click', () => scene.scrollShelfBy(-3 * ITEM_GAP));

  /* ---------- layout & DOM sync ---------- */
  let compact = false;
  let cardW = 220;
  let cardH = 116;

  function layout() {
    const W = shell.clientWidth;
    const H = shell.clientHeight;
    compact = H < 560;
    shell.classList.toggle('compact', compact);
    shell.classList.toggle('narrow', W < 640);
    cardH = compact ? 44 : 118;
    // the interface floats over the room, like a toy shelf seen up close
    const top = compact ? 50 : W < 640 ? 104 : 40;
    const bottom = cardH + (compact ? 22 : 40);
    scene.layout(top, bottom);
    cardW = Math.round(Math.max(90, Math.min(270, scene.ppu * 1.2)));
    cards.forEach(({ card }) => {
      card.style.width = `${cardW}px`;
      card.style.height = `${cardH}px`;
      card.classList.toggle('compact', compact);
    });
    renderDots();
    syncDom();
  }

  function syncDom() {
    const W = shell.clientWidth;
    const firstOnPage = scene.page * scene.perPage;
    let cardTop = 0;
    cards.forEach(({ card }, i) => {
      const a = scene.bookAnchor(i);
      const onPage = i >= firstOnPage && i < firstOnPage + scene.perPage;
      card.style.transform = `translate(${Math.round(a.x - cardW / 2)}px, ${Math.round(a.y - 6)}px)`;
      card.setAttribute('aria-hidden', String(!onPage));
      card.tabIndex = onPage ? 0 : -1;
      cardTop = a.y - 6;
    });
    const mid = cardTop + cardH / 2;
    carPrev.style.top = `${mid - 28}px`;
    carNext.style.top = `${mid - 28}px`;
    dots.style.top = `${cardTop + cardH + (compact ? 6 : 12)}px`;
    const [sTop, sBottom] = scene.shelfBand();
    const sMid = (sTop + sBottom) / 2;
    shelfPrev.style.top = `${sMid - 22}px`;
    shelfNext.style.top = `${sMid - 22}px`;
    shelfPrev.hidden = scene.offset >= scene.maxOff - 0.01;
    shelfNext.hidden = scene.offset <= -scene.maxOff + 0.01;
    hint.style.top = `${sBottom + 18}px`;
    const narrowNow = shell.clientWidth < 720;
    motifCap.style.top = `${sBottom + 14}px`;
    motifCap.style.visibility = narrowNow && !hint.hidden ? 'hidden' : '';
    if (focused !== null) {
      const a = scene.itemAnchor(focused);
      const w = ITEM_GAP * scene.ppuShelf;
      const hh = 0.76 * scene.ppuShelf;
      Object.assign(ring.style, { left: `${a.x - w / 2}px`, top: `${a.y - hh}px`, width: `${w}px`, height: `${hh}px` });
      ring.hidden = false;
    } else ring.hidden = true;
    positionPop();
    void W;
  }
  scene.onFrame = syncDom;

  const ro = new ResizeObserver(() => layout());
  ro.observe(shell);

  /* ---------- pointer input ---------- */
  type Drag = { id: number; x0: number; y0: number; zone: 'shelf' | 'books' | 'none'; off0: number; moved: boolean; lx: number; lt: number; v: number };
  let drag: Drag | null = null;
  let hovered = '';
  const canvasEl = sceneHost;

  canvasEl.addEventListener('pointerdown', (e) => {
    const [sTop, sBottom] = scene.shelfBand();
    const [bTop, bBottom] = scene.bookBand();
    const zone = e.clientY >= sTop && e.clientY <= sBottom ? 'shelf' : e.clientY >= bTop && e.clientY <= bBottom ? 'books' : 'none';
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, zone, off0: scene.offset, moved: false, lx: e.clientX, lt: performance.now(), v: 0 };
    scene.vel = 0;
    canvasEl.setPointerCapture(e.pointerId);
  });
  canvasEl.addEventListener('pointermove', (e) => {
    if (!drag) {
      if (e.pointerType === 'mouse') {
        const hit = scene.pick(e.clientX, e.clientY);
        scene.hoverItem(hit?.kind === 'item' ? hit.index : focused);
        scene.hoverBook(hit?.kind === 'book' ? hit.index : null);
        canvasEl.classList.toggle('pickable', !!hit);
        const key = hit ? `${hit.kind}:${hit.index}` : '';
        if (key !== hovered) {
          hovered = key;
          if (hit) {
            scene.sparkle(hit.kind, hit.index);
            if (hit.kind === 'item') sfx.item(culture[hit.index].id, hit.index);
            else sfx.shimmer();
          }
        }
      }
      return;
    }
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    if (!drag.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) drag.moved = true;
    if (drag.moved && drag.zone === 'shelf') {
      scene.setOffset(drag.off0 + dx / scene.ppuShelf);
      const now = performance.now();
      const dt = Math.max(1, now - drag.lt);
      drag.v = 0.7 * drag.v + 0.3 * ((e.clientX - drag.lx) / scene.ppuShelf / dt);
      drag.lx = e.clientX;
      drag.lt = now;
    }
  });
  const endDrag = (e: PointerEvent) => {
    if (!drag || drag.id !== e.pointerId) return;
    const d = drag;
    drag = null;
    const dx = e.clientX - d.x0;
    if (d.moved) {
      if (d.zone === 'shelf') scene.fling(d.v);
      else if (d.zone === 'books' && Math.abs(dx) > 40) goPage(scene.page + (dx < 0 ? 1 : -1));
      return;
    }
    if (e.type === 'pointercancel') return;
    const hit = scene.pick(e.clientX, e.clientY);
    if (hit?.kind === 'item') activateItem(hit.index);
    else if (hit?.kind === 'book') openBook(hit.index);
    else closePop();
  };
  canvasEl.addEventListener('pointerup', endDrag);
  canvasEl.addEventListener('pointercancel', endDrag);
  canvasEl.addEventListener('pointerleave', () => {
    hovered = '';
    if (!drag) {
      scene.hoverItem(focused);
      scene.hoverBook(null);
    }
  });
  canvasEl.addEventListener(
    'wheel',
    (e) => {
      const [sTop, sBottom] = scene.shelfBand();
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if ((horizontal || e.shiftKey) && e.clientY >= sTop - 40 && e.clientY <= sBottom + 40) {
        e.preventDefault();
        scene.setOffset(scene.offset - (horizontal ? e.deltaX : e.deltaY) / scene.ppuShelf);
      }
    },
    { passive: false },
  );

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (sheetClose) sheetClose();
    else closePop();
  };
  window.addEventListener('keydown', onKey);

  /* ---------- kilim motifs on the wall, a new one every 5 seconds ---------- */
  function showMotif(i: number) {
    const m = MOTIFS[i];
    motifCap.classList.remove('show');
    window.setTimeout(() => {
      motifName.textContent = `${m.name} motifi`;
      motifText.textContent = m.meaning;
      motifCap.title = m.en;
      (motifCap.querySelector('.mc-dot') as HTMLElement).style.background = m.palette.b;
      motifCap.classList.add('show');
    }, 350);
  }
  let motifTimer = 0;
  showMotif(0);
  motifTimer = window.setInterval(() => {
    if (document.hidden) return;
    const next = (scene.motif + 1) % MOTIFS.length;
    scene.setMotif(next);
    showMotif(next);
  }, 5000);

  /* ---------- start ---------- */
  updateStats();
  updateSound();
  layout();
  scene.intro();
  if (!store.seenHint('shelf') && store.culture.length === 0) {
    window.setTimeout(() => {
      if (store.culture.length === 0) hint.hidden = false;
    }, 1600);
  }

  return () => {
    window.removeEventListener('keydown', onKey);
    sfx.stopMusic(0.6);
    window.clearInterval(motifTimer);
    ro.disconnect();
    narrator.stop();
    closePop();
    scene.dispose();
  };
}

export type { CultureDef, BookListing };
