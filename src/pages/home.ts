import { h, chip, icon } from '../ui/dom';
import { page } from '../ui/shell';
import { loadListing, loadBook, coverCanvas, cloneCanvas } from '../content';
import { store } from '../store';
import { VALUES, VALUE_GROUPS, LEVELS, valueById, type ValueGroup } from '../values';
import type { LevelId } from '../types';

export async function renderHome(root: HTMLElement) {
  const list = await loadListing();
  const featured = list.find((b) => b.status === 'ready')!;
  const book = await loadBook(featured.id);
  const soon = list.filter((b) => b.status === 'soon');

  const prog = store.progress(featured.id);
  const level = store.settings.level;

  // hero
  const coverHost = h('div', { class: 'hero-cover' });
  coverCanvas(featured).then((c) => coverHost.append(cloneCanvas(c, `${featured.title} kitabının kapağı`)));

  const levelInputs = LEVELS.map((lv) => {
    const id = `lv-${lv.id}`;
    const input = h('input', { type: 'radio', name: 'level', id, value: lv.id, checked: lv.id === level });
    input.addEventListener('change', () => store.setSettings({ level: lv.id as LevelId }));
    return h(
      'div',
      { class: 'level' },
      input,
      h('label', { for: id }, h('span', { class: 'lv-name' }, lv.name), h('span', { class: 'lv-ages' }, lv.ages), h('span', { class: 'lv-note' }, lv.note)),
    );
  });

  const started = prog.page > 0 && prog.page < book.pages.length;
  const actions = h(
    'div',
    { class: 'hero-actions' },
    h('a', { class: 'btn', href: `#/kitap/${featured.id}` }, icon.book(), started ? 'Kaldığın yerden oku' : 'Kitabı aç'),
    started ? h('a', { class: 'btn light', href: `#/kitap/${featured.id}/1` }, 'Baştan başla') : null,
    started ? h('span', { class: 'resume-note' }, `${book.pages.length} sayfanın ${prog.page + 1}. sayfasındasın`) : null,
  );

  const hero = h(
    'section',
    { class: 'hero', 'aria-labelledby': 'hero-title' },
    h('div', { class: 'hero-art' }, coverHost),
    h(
      'div',
      { class: 'hero-body' },
      h('h1', { id: 'hero-title' }, featured.title),
      h('p', { class: 'en-title' }, `${featured.titleEn}. ${book.culture.tr}, ${book.pages.length} sayfa.`),
      h('div', { class: 'chips' }, ...book.values.map((v) => chip(valueById(v).name, valueById(v).group))),
      h('p', { class: 'summary' }, book.summary.tr),
      h('p', { class: 'summary-en' }, book.summary.en),
      h('fieldset', { class: 'level-picker' }, h('legend', null, 'Okuma seviyesi'), h('div', { class: 'levels' }, ...levelInputs)),
      actions,
    ),
  );

  // coming soon
  const soonCards = soon.map((b) => {
    const wrap = h('div', { class: 'cover-wrap' }, chip('Yakında', 'soon'));
    coverCanvas(b, 420).then((c) => {
      const cv = cloneCanvas(c, `${b.title} kitabının kapağı`);
      cv.classList.add('cover-img');
      wrap.prepend(cv);
    });
    const card = h(
      'article',
      { class: 'soon-card' },
      wrap,
      h('h3', null, b.title),
      h('p', null, b.blurb.tr),
      h('div', { class: 'chips' }, ...b.values.map((v) => chip(valueById(v).name, valueById(v).group))),
    );
    return card;
  });
  const shelf = h(
    'section',
    { class: 'section', 'aria-labelledby': 'soon-title' },
    h('div', { class: 'section-head' }, h('h2', { id: 'soon-title' }, 'Yakında rafta'), h('p', null, 'Her kitap bir kültür ögesini ve Maarif Modeli değerlerinden birkaçını birlikte işler.')),
    h('div', { class: 'shelf' }, ...soonCards),
  );

  // values board
  const covered = new Set(list.flatMap((b) => b.values));
  const groups = (Object.keys(VALUE_GROUPS) as ValueGroup[]).map((g) =>
    h(
      'div',
      { class: 'value-group' },
      h('h3', null, VALUE_GROUPS[g].name),
      h('p', { class: 'en' }, VALUE_GROUPS[g].en),
      h('ul', null, ...VALUES.filter((v) => v.group === g).map((v) => h('li', { class: covered.has(v.id) ? 'in-book' : '' }, v.name))),
    ),
  );
  const values = h(
    'section',
    { class: 'section', 'aria-labelledby': 'values-title' },
    h(
      'div',
      { class: 'section-head' },
      h('h2', { id: 'values-title' }, 'Kitaplardaki değerler'),
      h('p', null, 'Türkiye Yüzyılı Maarif Modeli’nin 20 değeri. Sarı olanlar şu anki ve yakında gelecek kitaplarda işleniyor.'),
    ),
    h('div', { class: 'values-board' }, ...groups),
  );

  root.replaceChildren(...page('home', hero, shelf, values));
}
