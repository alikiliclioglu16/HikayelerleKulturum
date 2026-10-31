import { h, icon } from '../ui/dom';
import { loadBook, loadListing, coverCanvas, fonts } from '../content';
import { store } from '../store';
import { treasureFor, type Treasure } from '../treasures';
import { tokenize, estimateMarks, type Token } from '../text';
import { Narrator } from '../narrator';
import { BookScene } from '../three/bookScene';
import { sceneLayers, buildProcLayer, buildImageLayer, type BuiltLayer } from '../art/scenes';
import type { Book, PageData, TableModel } from '../types';
import { sfx } from '../sfx';

/** Culture objects on the reading table when a book does not choose its own. */
const DEFAULT_TABLE: TableModel[] = [
  { src: '/models/culture/caydanlik.glb', word: 'çaydanlık', x: -2.55, z: -0.45, h: 0.36, rotY: 20 },
  { src: '/models/culture/cay.glb', word: 'çay', x: -3.15, z: -0.7, h: 0.2, steam: true },
  { src: '/models/culture/simit.glb', word: 'simit', x: 2.95, z: -1.2, h: 0.22, rotY: 10 },
];

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

export async function renderReader(root: HTMLElement, bookId: string, startPage?: number): Promise<() => void> {
  const shell = h('div', { class: 'reader', role: 'application', 'aria-label': 'Kitap okuyucu' }, h('div', { class: 'loading' }, 'Kitap açılıyor…'));
  root.replaceChildren(shell);

  const [book, listing] = await Promise.all([loadBook(bookId), loadListing(), fonts()]);
  const listingItem = listing.find((b) => b.id === bookId)!;
  const narrator = new Narrator();
  narrator.rate = store.settings.rate;

  /* ---------- state ---------- */
  const prog = store.progress(bookId);
  let index = Math.min(book.pages.length - 1, Math.max(0, startPage !== undefined ? startPage : prog.page));
  let tokens: Token[] = [];
  let plain = '';
  let playing = false;
  let busy = false;
  let wordEls: HTMLElement[] = [];
  let silentNoticeShown = false;
  const layerCache = new Map<string, Promise<BuiltLayer[]>>();

  /* ---------- DOM ---------- */
  const sceneHost = h('div', { class: 'scene-host' });
  const titleEl = h('strong', null, book.title);
  const pageNoEl = h('span', null, '');
  const chestCount = h('span', { class: 'count' }, String(store.treasureCount));
  const chestLink = h('a', { class: 'btn light small chest-link', href: '#/sandik', 'aria-label': 'Kelime Sandığım', title: 'Kelime Sandığım' }, icon.chest(), chestCount);
  const settingsBtn = h('button', { class: 'btn light small icon-only', type: 'button', 'aria-label': 'Ayarlar' }, icon.gear());
  const bar = h(
    'header',
    { class: 'reader-bar' },
    h('a', { class: 'btn light small', href: '#/', 'aria-label': 'Kitaplara dön' }, icon.home()),
    h('div', { class: 'reader-title' }, titleEl, pageNoEl),
    h('div', { class: 'bar-actions' }, chestLink, settingsBtn),
  );

  const textEl = h('section', { class: 'page-text', 'aria-live': 'polite' });
  const prevBtn = h('button', { class: 'btn turq icon-only', type: 'button', 'aria-label': 'Önceki sayfa' }, icon.back());
  const playLbl = h('span', { class: 'lbl' }, 'Bana oku');
  const playIcon = h('span', { style: 'display:contents' }, icon.play());
  const playBtn = h('button', { class: 'btn play', type: 'button' }, playIcon, playLbl);
  const nextBtn = h('button', { class: 'btn turq icon-only', type: 'button', 'aria-label': 'Sonraki sayfa' }, icon.next());
  const replayBtn = h('button', { class: 'btn light icon-only', type: 'button', 'aria-label': 'Sahneyi tekrar oynat', title: 'Tekrar oynat' }, icon.replay());
  const cultureBtn = h('button', { class: 'btn light icon-only', type: 'button', 'aria-label': 'Biliyor musun?', title: 'Biliyor musun?' }, icon.light());
  cultureBtn.addEventListener('click', () => page().culture && cultureSheet(page()));
  const controls = h('nav', { class: 'reader-controls', 'aria-label': 'Okuma kontrolleri' }, prevBtn, playBtn, replayBtn, cultureBtn, nextBtn);
  const castWait = h('div', { class: 'cast-wait', role: 'status', hidden: true }, h('span', { class: 'spinner', 'aria-hidden': 'true' }), h('span', { class: 'cw-text' }, 'Karakterler sahneye geliyor…'));

  shell.replaceChildren(sceneHost, bar, textEl, controls, castWait);

  /* ---------- 3D ---------- */
  const scene = new BookScene(sceneHost);
  // testing aid in development only: window.__sahne.seekStage(3.5) shows a moment of the page's play
  if (import.meta.env.DEV) (window as unknown as { __sahne: BookScene }).__sahne = scene;
  scene.toyCast = !!book.toyCast;
  scene.setCalm(store.settings.calm);
  // the sounds of each page's play: hops, knocks, magic, rain
  scene.onSound = (kind, delay, seconds) => sfx.scene(kind, delay, seconds);
  scene.onCastProgress = (n, total) => {
    castWait.hidden = total === 0 || n >= total;
    castWait.querySelector('.cw-text')!.textContent = `Karakterler sahneye geliyor… ${n}/${total}`;
  };
  void scene.setTable(book.table ?? DEFAULT_TABLE);
  scene.setWall(book.id, listingItem.carpet ?? { motif: 'elibelinde' });
  // the book's own music (it fades in over the home page lullaby)
  sfx.useMusic(book.music ?? null);
  sfx.startMusic();
  const cover = await coverCanvas(listingItem, 900);
  scene.setCover(cover);

  const getLayers = (p: PageData): Promise<BuiltLayer[]> => {
    if (!layerCache.has(p.id)) {
      layerCache.set(
        p.id,
        (async () => {
          if (p.layers?.length) return Promise.all(p.layers.map((l) => buildImageLayer(l, `/books/${book.id}/`)));
          const out: BuiltLayer[] = [];
          // paper-cut people (thumbOnly layers) stand in for the 3D characters while a page has none
          const has3dPeople = !!p.cast?.length || (p.models ?? []).some((m) => m.src?.includes('/models/characters/'));
          for (const l of sceneLayers(p.scene).filter((x) => !x.thumbOnly || !has3dPeople)) {
            out.push(buildProcLayer(l));
            await nextFrame();
          }
          return out;
        })(),
      );
    }
    return layerCache.get(p.id)!;
  };

  /* ---------- text ---------- */
  const page = () => book.pages[index];

  function renderText() {
    const p = page();
    const t = p.text;
    ({ tokens, plain } = tokenize(t.tr));
    const tr = h('p', { class: 'tr', lang: 'tr' });
    wordEls = [];
    for (const tok of tokens) {
      if (tok.kind === 'word') {
        const isGloss = !!(tok.lemma && book.glossary[tok.lemma]);
        const span = h('span', { class: `w${isGloss ? ' g' : ''}`, 'data-wi': tok.wi, 'data-lemma': isGloss ? tok.lemma : undefined }, tok.text);
        span.addEventListener('click', (e) => {
          e.stopPropagation();
          span.classList.remove('flash');
          void span.offsetWidth;
          span.classList.add('flash');
          const r = span.getBoundingClientRect();
          const sr = shell.getBoundingClientRect();
          onWord(tok, { x: r.left - sr.left + r.width / 2, y: r.top - sr.top });
        });
        wordEls.push(span);
        tr.append(span);
      } else tr.append(tok.text);
    }
    const actions = h('div', { class: 'text-actions' });
    if (p.culture) {
      actions.append(h('button', { class: 'btn light small', type: 'button', onclick: () => cultureSheet(p) }, icon.light(), 'Biliyor musun?'));
    }
    textEl.replaceChildren(h('div', { class: 'pg-title', lang: 'tr' }, p.title.tr), tr, actions);
    cultureBtn.hidden = !p.culture;
    nowEl = null;
    printPage();
    pageNoEl.replaceChildren(h('span', { class: 'pg-word' }, 'Sayfa '), `${index + 1} / ${book.pages.length}`);
    titleEl.hidden = false;
    prevBtn.disabled = index === 0;
    const last = index === book.pages.length - 1;
    nextBtn.setAttribute('aria-label', last ? 'Kitabı bitir' : 'Sonraki sayfa');
    nextBtn.classList.toggle('red', last);
  }

  /** The story text printed on the left page of the book (when the screen is wide enough to read it there). */
  function printPage() {
    const p = page();
    if (!onPage) {
      scene.setLeftPage({ title: p.title.tr, sub: `Sayfa ${index + 1}` });
      return;
    }
    const gloss = new Set<number>();
    for (const t of tokens) if (t.kind === 'word' && t.lemma && book.glossary[t.lemma]) gloss.add(t.wi!);
    scene.setPageText({ title: p.title.tr, sub: `Sayfa ${index + 1}`, tokens, gloss, big: store.settings.big });
  }

  /* ---------- layout ---------- */


  /**
   * Two layouts, like a film set seen through a camera:
   *  - book: wide screens; the story is printed on the left page of the open book, the pop-up stands on the
   *    right page, and the camera frames both (no text card on the screen)
   *  - portrait: tall, narrow screens (phones), where print on the page would be too small: the pop-up on top
   *    and a text card below
   * Between pages the camera pulls back to a wide shot of the whole table.
   */
  let onPage = true;
  function setMode(m: 'book' | 'portrait') {
    const was = onPage;
    onPage = m === 'book';
    scene.textOnPage = onPage;
    shell.classList.toggle('layout-book', onPage);
    shell.classList.toggle('layout-portrait', !onPage);
    if (was !== onPage || printedBig !== store.settings.big) {
      printedBig = store.settings.big;
      printPage();
    }
  }
  let printedBig = store.settings.big;

  function layout() {
    const W = shell.clientWidth;
    const H = shell.clientHeight;
    const big = store.settings.big;
    const ctrlH = controls.offsetHeight + 24;
    const barH = 64;
    const reset = { left: '', right: '', top: '', bottom: '', width: '', height: '', maxHeight: '', transform: '' };
    const wide = { x: 0, y: barH, w: W, h: H - barH - ctrlH };

    if (W / H >= 0.95 && W >= 640) {
      setMode('book');
      // the text card stays for screen readers only
      Object.assign(textEl.style, reset);
      scene.setLayout(wide, wide);
      return;
    }
    setMode('portrait');
    Object.assign(textEl.style, reset, { left: '12px', right: '12px', bottom: `${ctrlH}px`, maxHeight: `${Math.round(H * 0.46)}px`, fontSize: `${big ? 26 : W < 400 ? 20 : 22}px` });
    const top = H - ctrlH - textEl.offsetHeight;
    scene.setLayout({ x: 0, y: 56, w: W, h: Math.max(120, top - 56 - 8) }, { x: 0, y: 56, w: W, h: H - 56 - ctrlH });
  }
  scene.onResize = () => requestAnimationFrame(layout);

  /* ---------- words & pop-ups ---------- */
  let popTimer = 0;
  function bubble(cls: string, x: number, y: number, lemma: string, found: Treasure | null) {
    shell.querySelectorAll(`.${cls}`).forEach((e) => e.remove());
    const g = book.glossary[lemma];
    const el = h(
      'div',
      { class: `${cls}${found ? ' treasure' : ''}`, style: `left:${Math.round(x)}px;top:${Math.round(y)}px`, role: 'status' },
      h(
        'div',
        { class: 'bubble' },
        found
          ? h('img', { class: 'thumb', src: found.thumb, alt: '' })
          : g?.icon
            ? h('span', { class: 'ico', 'aria-hidden': 'true' }, g.icon)
            : null,
        h(
          'div',
          null,
          h('div', { class: 't', lang: 'tr' }, lemma),
          found ? h('span', { class: 'new' }, found.name === lemma ? 'Yeni kültür hazinesi! Sandığa eklendi' : `Yeni kültür hazinesi: ${found.name}`) : null,
        ),
      ),
    );
    // keep the bubble on screen
    shell.append(el);
    const b = el.getBoundingClientRect();
    const s = shell.getBoundingClientRect();
    if (b.left < s.left + 8) el.style.left = `${x + (s.left + 8 - b.left)}px`;
    if (b.right > s.right - 8) el.style.left = `${x - (b.right - s.right + 8)}px`;
    if (b.top < s.top + 8) el.style.top = `${y + (s.top + 8 - b.top)}px`;
    window.clearTimeout(popTimer);
    popTimer = window.setTimeout(() => shell.querySelectorAll('.word-pop, .tag3d').forEach((e) => e.remove()), found ? 4800 : 3200);
  }

  /** A word or a thing of the page was tapped: a culture treasure goes into the chest (the treasure, the first time). */
  function collect(word: string): Treasure | null {
    const t = treasureFor(word);
    if (!t || !store.addTreasure(t.id, book.id)) return null;
    chestCount.textContent = String(store.treasureCount);
    chestLink.classList.remove('got');
    void chestLink.offsetWidth;
    chestLink.classList.add('got');
    sfx.chime();
    return t;
  }

  function flashWords(lemma: string) {
    textEl.querySelectorAll<HTMLElement>(`.w[data-lemma="${CSS.escape(lemma)}"]`).forEach((el) => {
      el.classList.remove('flash');
      void el.offsetWidth;
      el.classList.add('flash');
    });
    scene.flashWords(tokens.filter((t) => t.kind === 'word' && t.lemma === lemma).map((t) => t.wi!));
  }

  let duckTimer = 0;
  function say(text: string) {
    sfx.duck(true);
    window.clearTimeout(duckTimer);
    duckTimer = window.setTimeout(() => !playing && sfx.duck(false), 1800 + text.length * 60);
    narrator.say(text);
  }

  /** A word was tapped (in the card or on the printed page); `at` is where it is on the screen. */
  function onWord(tok: Token, at: { x: number; y: number }) {
    if (playing) pause();
    say(tok.text);
    scene.flashWords([tok.wi!]);
    const lemma = tok.lemma && book.glossary[tok.lemma] ? tok.lemma : null;
    if (!lemma) return;
    bubble('word-pop', at.x, at.y, lemma, collect(lemma));
    const pt = scene.focusWord(lemma);
    if (pt) {
      const sp = h('div', { class: 'tag3d', style: `left:${pt.x}px;top:${pt.y}px` }, h('div', { class: 'bubble' }, h('span', { class: 't', lang: 'tr' }, lemma)));
      shell.querySelectorAll('.tag3d').forEach((e) => e.remove());
      shell.append(sp);
    }
  }

  // tapping objects in the pop-up
  let downAt: { x: number; y: number; t: number } | null = null;
  sceneHost.addEventListener('pointerdown', (e) => (downAt = { x: e.clientX, y: e.clientY, t: performance.now() }));
  sceneHost.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 12) return;
    downAt = null;
    // a word printed on the left page
    const pw = scene.pickPageWord(e.clientX, e.clientY);
    if (pw) {
      const tok = tokens.find((t) => t.kind === 'word' && t.wi === pw.wi);
      if (tok) {
        const sr = shell.getBoundingClientRect();
        const cr = sceneHost.getBoundingClientRect();
        onWord(tok, { x: pw.x + cr.left - sr.left, y: pw.y + cr.top - sr.top });
      }
      return;
    }
    const res = scene.pick(e.clientX, e.clientY);
    if (!res) return;
    if (playing) pause();
    say(res.word);
    bubble('tag3d', res.x, res.y, res.word, collect(res.word));
    flashWords(res.word);
  });
  let hoverT = 0;
  sceneHost.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const now = performance.now();
    if (now - hoverT < 70) return;
    hoverT = now;
    sceneHost.classList.toggle('pickable', scene.isPickable(e.clientX, e.clientY));
  });

  /** Every page is filmed from a slightly different side. */
  function angleFor(i: number) {
    return [-9, 8, -4, 11, -12, 5, -7, 10][i % 8];
  }

  /* ---------- narration ---------- */
  function setPlayUI() {
    playIcon.replaceChildren(playing ? icon.pause() : icon.play());
    const voiceLabel = narrator.mode === 'voice' || page().audio ? 'Bana oku' : 'Birlikte oku';
    playLbl.textContent = playing ? 'Duraklat' : voiceLabel;
    playBtn.setAttribute('aria-label', playing ? 'Okumayı duraklat' : voiceLabel);
    playBtn.setAttribute('aria-pressed', String(playing));
  }
  narrator.ready.then(setPlayUI);

  let nowEl: HTMLElement | null = null;
  function highlight(wi: number) {
    nowEl?.classList.remove('now');
    nowEl = wordEls[wi] ?? null;
    nowEl?.classList.add('now');
    scene.highlightWord(wi);
  }

  /** Match the page's play to the words of its text and start it from the beginning. */
  function prepareStage(withNarration: boolean) {
    const st = scene.stage;
    if (!st) return;
    scene.freeze(false);
    scene.resetStage();
    // the recorded narration's own word times (at the chosen speed), or an estimated reading pace
    const rec = page().audio;
    const speed = Math.max(0.6, Math.min(1.3, narrator.rate / 0.9));
    st.setText(tokens, rec && rec.marks.length > tokens.filter((t) => t.kind === 'word').length - 1 ? rec.marks.map((m) => m / speed) : estimateMarks(tokens, narrator.rate));
    if (withNarration) st.playWithNarration();
    else st.playAuto();
  }

  function startReading() {
    playing = true;
    prepareStage(true);
    sfx.duck(true);
    setPlayUI();
    const p = page();
    narrator.play(
      tokens,
      plain,
      {
        onWord: (wi) => {
          highlight(wi);
          scene.stage?.word(wi);
        },
        onEnd: () => {
          highlight(-1);
          if (index >= book.pages.length - 1 || !playing) sfx.duck(false);
          store.markRead(bookId, p.id);
          if (!playing) return;
          if (index < book.pages.length - 1) {
            window.setTimeout(() => playing && goTo(index + 1, true), 900);
          } else {
            playing = false;
            setPlayUI();
            toast('Kitap bitti, aferin! Sağ alttaki düğmeyle etkinliklere geç.');
          }
        },
      },
      p.audio,
    );
  }

  function pause() {
    const was = playing;
    playing = false;
    sfx.duck(false);
    narrator.stop();
    highlight(-1);
    setPlayUI();
    // the characters stop together with the narration
    if (was) scene.freeze(true);
  }

  replayBtn.addEventListener('click', () => {
    if (playing) {
      startReading();
      return;
    }
    prepareStage(false);
  });

  playBtn.addEventListener('click', async () => {
    if (playing) return pause();
    // iPhone/iPad only allow speech that starts directly inside the tap, so avoid waiting when possible
    if (!narrator.resolved) await narrator.ready;
    if (narrator.mode === 'silent' && !silentNoticeShown && !page().audio) {
      silentNoticeShown = true;
      voiceSheet(true, startReading);
      return;
    }
    startReading();
  });

  /* ---------- navigation ---------- */
  async function goTo(i: number, autoplay = false) {
    if (busy || i === index || i < 0) return;
    if (i >= book.pages.length) {
      store.setProgress(bookId, { done: true, page: book.pages.length - 1 });
      location.hash = `#/kitap/${bookId}/bitti`;
      return;
    }
    if (!autoplay) pause();
    else narrator.stop();
    scene.freeze(false);
    busy = true;
    const dir = i > index ? 1 : -1;
    index = i;
    store.setProgress(bookId, { page: index });
    history.replaceState(null, '', `#/kitap/${bookId}/${index + 1}`);
    textEl.style.transition = 'opacity .25s';
    textEl.style.opacity = '0';
    shell.querySelectorAll('.word-pop, .tag3d').forEach((e) => e.remove());
    const layers = await getLayers(page());
    // pull back to see the whole table while the page turns, then move in on the new pop-up from another side
    scene.shot('wide', 1000, angleFor(index));
    // the paper sound starts with the turn, once the pop-up has folded down
    window.setTimeout(() => sfx.pageTurn(), scene.reducedMotion ? 0 : 340);
    const shown = scene.showPage(layers, dir).then(() => {
      scene.shot('close', 1700, angleFor(index));
      void scene.setModels(page().models ?? []);
      sfx.setAmbience(page().ambience ?? null);
      return scene.setCast(page());
    });
    window.setTimeout(() => {
      renderText();
      layout();
      textEl.style.opacity = '1';
    }, scene.reducedMotion ? 0 : 520);
    await shown;
    busy = false;
    if (!(autoplay && playing)) prepareStage(false);
    if (autoplay && playing) startReading();
    if (index + 1 < book.pages.length) {
      getLayers(book.pages[index + 1]);
      scene.prefetch(book.pages[index + 1].models ?? []);
    }
  }

  prevBtn.addEventListener('click', () => goTo(index - 1));
  nextBtn.addEventListener('click', () => {
    if (index === book.pages.length - 1) {
      store.markRead(bookId, page().id);
      goTo(book.pages.length);
    } else {
      store.markRead(bookId, page().id);
      goTo(index + 1);
    }
  });

  /* ---------- sheets ---------- */
  function sheet(title: string, ...body: Node[]) {
    return sheetWith(title, null, ...body);
  }

  function sheetWith(title: string, onClose: (() => void) | null, ...body: Node[]) {
    const close = () => {
      if (!backdrop.isConnected) return;
      backdrop.remove();
      onClose?.();
    };
    const closeBtn = h('button', { class: 'btn light small icon-only close', type: 'button', 'aria-label': 'Kapat' }, icon.close());
    closeBtn.addEventListener('click', close);
    const dlg = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, closeBtn, h('h2', null, title), ...body);
    const backdrop = h('div', { class: 'sheet-backdrop' }, dlg);
    backdrop.addEventListener('click', (e) => e.target === backdrop && close());
    (backdrop as HTMLElement & { close?: () => void }).close = close;
    shell.append(backdrop);
    closeBtn.focus();
    return close;
  }

  function cultureSheet(p: PageData) {
    if (!p.culture) return;
    pause();
    const listen = h('button', { class: 'btn turq small', type: 'button' }, icon.speaker(), 'Dinle');
    listen.addEventListener('click', () => say(p.culture!.tr));
    sheet('Biliyor musun?', h('p', { lang: 'tr' }, p.culture.tr), narrator.voice ? listen : h('span'));
  }

  function voiceSheet(fromPlay = false, onClose: (() => void) | null = null) {
    const v = narrator.voice;
    sheetWith(
      v ? 'Türkçe ses hazır' : 'Bu cihazda Türkçe ses yok',
      onClose,
      v
        ? h('p', null, `Kitap, cihazınızdaki “${v.name}” sesiyle okunuyor.`)
        : h('p', null, 'Kelimeler okuma hızında sırayla parlayacak; çocuğunuzla birlikte sesli okuyabilirsiniz.'),
      v ? h('span') : h('p', null, 'Türkçe sesli okuma için Safari (iPhone, iPad, Mac), Microsoft Edge ya da Android’de Chrome kullanın. Windows’ta Ayarlar > Saat ve dil > Konuşma bölümünden Türkçe ses de ekleyebilirsiniz.'),
      fromPlay ? h('p', null, 'İleride kitaplara gerçek bir anlatıcının sesi de eklenecek.') : h('span'),
    );
  }

  settingsBtn.addEventListener('click', () => {
    pause();
    const s = store.settings;
    const rate = h('input', { type: 'range', min: '0.6', max: '1.2', step: '0.05', value: String(s.rate), 'aria-label': 'Okuma hızı' });
    rate.addEventListener('input', () => {
      narrator.rate = Number(rate.value);
      store.setSettings({ rate: narrator.rate });
    });
    const seg = (pressed: boolean, label: string, on: () => void) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(pressed) }, label);
      b.addEventListener('click', () => {
        on();
        b.parentElement?.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      });
      return b;
    };
    const size = h(
      'div',
      { class: 'seg', role: 'group', 'aria-label': 'Yazı boyutu' },
      seg(!s.big, 'Normal', () => {
        store.setSettings({ big: false });
        layout();
      }),
      seg(s.big, 'Büyük', () => {
        store.setSettings({ big: true });
        layout();
      }),
    );
    const calm = h('input', { type: 'checkbox', class: 'switch', checked: s.calm, 'aria-label': 'Sakin hareket' });
    calm.addEventListener('change', () => {
      store.setSettings({ calm: (calm as HTMLInputElement).checked });
      scene.setCalm((calm as HTMLInputElement).checked);
    });
    const music = h('input', { type: 'checkbox', class: 'switch', checked: s.music && s.sound, 'aria-label': 'Arka plan müziği' });
    music.addEventListener('change', () => {
      const on = (music as HTMLInputElement).checked;
      store.setSettings(on ? { music: true, sound: true } : { music: false });
      if (on) sfx.startMusic();
      else sfx.stopMusic();
    });
    const voiceBtn = h('button', { class: 'btn light small', type: 'button' }, narrator.voice ? 'Ses bilgisi' : 'Türkçe ses yok');
    voiceBtn.addEventListener('click', () => {
      (shell.querySelector('.sheet-backdrop') as (HTMLElement & { close?: () => void }) | null)?.close?.();
      voiceSheet();
    });
    sheet(
      'Ayarlar',
      h('div', { class: 'row' }, h('label', null, 'Okuma hızı', h('small', null, 'Yavaştan hızlıya')), rate),
      h('div', { class: 'row' }, h('label', null, 'Yazı boyutu'), size),
      h('div', { class: 'row' }, h('label', null, 'Arka plan müziği', h('small', null, 'Kitabın kendi müziği')), music),
      h('div', { class: 'row' }, h('label', null, 'Sakin hareket', h('small', null, 'Kamera ve ışık hareketleri durur, animasyonlar kısalır')), calm),
      h('div', { class: 'row' }, h('label', null, 'Anlatıcı sesi', h('small', null, narrator.voice ? narrator.voice.name : 'Cihazda Türkçe ses bulunamadı')), voiceBtn),
    );
  });

  let toastTimer = 0;
  function toast(msg: string) {
    shell.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = h('div', { class: 'toast', role: 'status' }, msg);
    shell.append(t);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => t.remove(), 4200);
  }

  /* ---------- keyboard ---------- */
  const onKey = (e: KeyboardEvent) => {
    if (shell.querySelector('.sheet-backdrop')) {
      if (e.key === 'Escape') (shell.querySelector('.sheet-backdrop') as (HTMLElement & { close?: () => void }) | null)?.close?.();
      return;
    }
    if (e.key === 'ArrowRight') nextBtn.click();
    else if (e.key === 'ArrowLeft') goTo(index - 1);
    else if (e.key === ' ' && document.activeElement === document.body) {
      e.preventDefault();
      playBtn.click();
    }
  };
  window.addEventListener('keydown', onKey);

  /* ---------- start ---------- */
  renderText();
  setPlayUI();
  layout();
  textEl.style.opacity = '0';
  const firstLayers = getLayers(page());
  scene.prefetch(page().models ?? []);
  // opening sequence: from high above the table, down to the closed book, it opens, then close on the pop-up
  scene.closeNow();
  scene.shot('overhead', 0);
  scene.shot('cover', 2200, undefined, 0.15);
  await new Promise((r) => window.setTimeout(r, scene.reducedMotion ? 0 : 1700));
  scene.shot('wide', 1600, angleFor(index));
  window.setTimeout(() => sfx.pageTurn(), scene.reducedMotion ? 0 : 450);
  await scene.open(true);
  scene.shot('close', 1800, angleFor(index));
  await scene.showPage(await firstLayers, 0);
  void scene.setModels(page().models ?? []);
  sfx.setAmbience(page().ambience ?? null);
  textEl.style.transition = 'opacity .4s';
  textEl.style.opacity = '1';
  void scene.setCast(page()).then(() => prepareStage(false));
  store.setProgress(bookId, { page: index });
  if (index + 1 < book.pages.length) getLayers(book.pages[index + 1]);
  // download the 3D models of the whole book in the background
  window.setTimeout(() => book.pages.forEach((p) => scene.prefetch(p.models ?? [])), 1500);

  return () => {
    sfx.setAmbience(null);
    window.removeEventListener('keydown', onKey);
    window.clearTimeout(duckTimer);
    sfx.duck(false);
    narrator.stop();
    scene.dispose();
  };
}

export type { Book };
