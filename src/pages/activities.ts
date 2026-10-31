import { h, icon, chip } from '../ui/dom';
import { page, backLink } from '../ui/shell';
import { loadBook } from '../content';
import { store } from '../store';
import { valueById, VALUE_GROUPS } from '../values';
import { Narrator } from '../narrator';
import { sceneLayers, buildProcLayer, sceneThumb, buildImageLayer } from '../art/scenes';
import type { Book } from '../types';

const narrator = new Narrator();

function stars(n: number, total: number) {
  return h(
    'div',
    { class: 'stars-row', 'aria-label': `${total} yıldızdan ${n}` },
    ...Array.from({ length: total }, (_, i) => {
      const s = icon.star();
      if (i >= n) s.classList.add('off');
      return s;
    }),
  );
}

/* ---------------- end of book ---------------- */

export async function renderEnd(root: HTMLElement, id: string) {
  const book = await loadBook(id);
  const p = store.progress(id);
  const read = p.read.length;
  const card = (href: string, title: string, text: string, status: string) =>
    h('a', { class: 'end-card', href }, h('h2', null, title), h('p', null, text), h('span', { class: 'status' }, status));
  root.replaceChildren(
    ...page(
      'none',
      h(
        'div',
        { class: 'page-head' },
        backLink('#/', 'Kitaplar'),
        h('h1', { style: 'margin-top:18px' }, 'Kitap bitti, aferin!'),
        h('p', null, `${book.title} kitabının ${book.pages.length} sayfasından ${read} tanesini okudun. Şimdi ne yapmak istersin?`),
        stars(read, book.pages.length),
      ),
      h(
        'div',
        { class: 'end-grid' },
        card(`#/kitap/${id}/quiz`, 'Bilgi yarışması', `${book.quiz.length} soruyla hikâyeyi ne kadar hatırladığını gör.`, p.quiz !== undefined ? `En iyi sonucun ${p.quiz} / ${book.quiz.length}` : 'Başla'),
        card(`#/kitap/${id}/degerler`, 'Değer avı', 'Resimlere bak ve hikâyedeki değerleri bul.', p.hunt ? 'Tamamlandı' : 'Başla'),
        card(`#/kitap/${id}/aile`, 'Aile köşesi', 'Ebeveynler için konuşma soruları, kelimeler ve bir aile görevi.', 'Aç'),
      ),
      h(
        'div',
        { class: 'hero-actions', style: 'margin-top:28px' },
        h('a', { class: 'btn turq', href: '#/sandik' }, icon.chest(), `Kelime Sandığım (${store.treasureCount})`),
        h('a', { class: 'btn light', href: `#/kitap/${id}/1` }, 'Tekrar oku'),
      ),
    ),
  );
  document.title = `${book.title}: Kitap bitti | Hikâyelerle Kültürüm`;
}

/* ---------------- quiz ---------------- */

export async function renderQuiz(root: HTMLElement, id: string) {
  const book = await loadBook(id);
  let i = 0;
  let score = 0;
  let answered = false;
  const host = h('div', { class: 'quiz panel' });

  const draw = () => {
    if (i >= book.quiz.length) return finish();
    answered = false;
    const q = book.quiz[i];
    const feedback = h('div', { class: 'feedback', role: 'status' });
    const next = h('button', { class: 'btn', type: 'button', disabled: true }, i === book.quiz.length - 1 ? 'Sonucu gör' : 'Sıradaki soru', icon.next());
    next.addEventListener('click', () => {
      i++;
      draw();
    });
    const opts = q.options.map((o, oi) => {
      const b = h(
        'button',
        { class: 'option', type: 'button' },
        h('span', { class: 'letter' }, 'ABC'[oi]),
        h('span', null, h('span', { lang: 'tr' }, o.tr)),
      );
      b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const right = oi === q.answer;
        if (right) score++;
        b.classList.add(right ? 'right' : 'wrong');
        opts[q.answer].classList.add('right');
        opts.forEach((x) => x.setAttribute('disabled', ''));
        const pageNo = book.pages.findIndex((pg) => pg.id === q.page) + 1;
        feedback.replaceChildren(
          right ? h('strong', null, 'Doğru, harika!') : h('strong', null, 'Az kaldı!'),
          right ? '' : h('span', null, ' Doğru cevap yeşil olan. ', pageNo > 0 ? h('a', { href: `#/kitap/${id}/${pageNo}` }, `${pageNo}. sayfaya bak`) : null),
        );
        next.removeAttribute('disabled');
        next.focus();
      });
      return b;
    });
    const listen = h('button', { class: 'btn light small', type: 'button', 'aria-label': 'Soruyu dinle' }, icon.speaker(), 'Dinle');
    listen.addEventListener('click', () => narrator.ready.then(() => narrator.say(q.q.tr)));
    host.replaceChildren(
      h('div', { class: 'section-head', style: 'margin:0' }, h('span', { class: 'quiz-step' }, `Soru ${i + 1} / ${book.quiz.length}`), listen),
      h('p', { class: 'quiz-q', lang: 'tr' }, q.q.tr),
      h('div', { class: 'options' }, ...opts),
      feedback,
      h('div', { class: 'quiz-nav' }, h('span'), next),
    );
  };

  const finish = () => {
    const prev = store.progress(id).quiz ?? 0;
    store.setProgress(id, { quiz: Math.max(prev, score) });
    host.replaceChildren(
      h('p', { class: 'quiz-q' }, score === book.quiz.length ? 'Hepsini bildin!' : `${book.quiz.length} sorudan ${score} doğru`),
      stars(score, book.quiz.length),
      h('p', { class: 'quiz-en' }, `You got ${score} out of ${book.quiz.length}.`),
      h(
        'div',
        { class: 'hero-actions', style: 'margin-top:20px' },
        h('a', { class: 'btn', href: `#/kitap/${id}/degerler` }, 'Değer avına geç', icon.next()),
        h('button', { class: 'btn light', type: 'button', onclick: () => ((i = 0), (score = 0), draw()) }, 'Tekrar dene'),
      ),
    );
  };

  draw();
  root.replaceChildren(...page('none', h('div', { class: 'page-head' }, backLink(`#/kitap/${id}/bitti`, 'Geri'), h('h1', { style: 'margin-top:18px' }, 'Bilgi yarışması')), host));
  document.title = `${book.title}: Bilgi yarışması | Hikâyelerle Kültürüm`;
}

/* ---------------- value hunt ---------------- */

async function thumbFor(book: Book, pageId: string) {
  const p = book.pages.find((x) => x.id === pageId)!;
  const layers = p.layers?.length
    ? await Promise.all(p.layers.map((l) => buildImageLayer(l, `/books/${book.id}/`, 512)))
    : sceneLayers(p.scene).map((l) => buildProcLayer(l, 512));
  const c = sceneThumb(layers, 520);
  c.setAttribute('role', 'img');
  c.setAttribute('aria-label', `${p.title.tr} sayfasının resmi`);
  return c;
}

export async function renderHunt(root: HTMLElement, id: string) {
  const book = await loadBook(id);
  let found = 0;
  const cards = await Promise.all(
    book.valueHunt.map(async (item, n) => {
      const pg = book.pages.find((x) => x.id === item.page)!;
      const result = h('div', { role: 'status' });
      const choices = item.options.map((v) => {
        const b = h('button', { class: 'choice', type: 'button' }, valueById(v).name);
        b.addEventListener('click', () => {
          if (v === item.answer) {
            b.classList.add('right');
            choices.forEach((c) => c.setAttribute('disabled', ''));
            found++;
            result.replaceChildren(
              h('div', { class: 'stamp' }, icon.check(), valueById(v).name),
              h('p', { lang: 'tr' }, item.why.tr),
            );
            if (found === book.valueHunt.length) {
              store.setProgress(id, { hunt: true });
              done.hidden = false;
            }
          } else {
            b.classList.add('wrong');
            b.setAttribute('disabled', '');
          }
        });
        return b;
      });
      return h(
        'article',
        { class: 'hunt-card' },
        await thumbFor(book, item.page),
        h('p', null, h('strong', null, `${n + 1}. ${pg.title.tr}`), ' Bu sahnede hangi değeri görüyorsun?'),
        h('div', { class: 'choices' }, ...choices),
        result,
      );
    }),
  );
  const done = h(
    'div',
    { class: 'panel', hidden: true, style: 'margin-top:24px' },
    h('h2', { style: 'font-size:30px;color:var(--cobalt)' }, 'Bütün değerleri buldun!'),
    h('p', null, 'Bu değerleri bu hafta evde de yaşamaya ne dersin? Aile köşesinde küçük bir görev var.'),
    h('a', { class: 'btn', href: `#/kitap/${id}/aile` }, 'Aile köşesi', icon.next()),
  );
  root.replaceChildren(
    ...page(
      'none',
      h(
        'div',
        { class: 'page-head' },
        backLink(`#/kitap/${id}/bitti`, 'Geri'),
        h('h1', { style: 'margin-top:18px' }, 'Değer avı'),
        h('p', null, 'Her resimde bir değer saklı. Doğru değeri bulunca kısa bir açıklama çıkacak.'),
      ),
      h('div', { class: 'hunt' }, ...cards),
      done,
    ),
  );
  document.title = `${book.title}: Değer avı | Hikâyelerle Kültürüm`;
}

/* ---------------- family corner ---------------- */

export async function renderFamily(root: HTMLElement, id: string) {
  const book = await loadBook(id);
  const vals = book.values.map(valueById);
  const words = Object.entries(book.glossary);
  root.replaceChildren(
    ...page(
      'none',
      h(
        'div',
        { class: 'page-head' },
        backLink(`#/kitap/${id}/bitti`, 'Geri'),
        h('h1', { style: 'margin-top:18px' }, 'Aile köşesi'),
        h('p', null, `${book.title} kitabını çocuğunuzla konuşmak için kısa bir rehber.`),
      ),
      h(
        'div',
        { class: 'family' },
        h(
          'section',
          { class: 'panel' },
          h('h2', null, 'Konuşalım'),
          h('ol', null, ...book.family.talk.map((t) => h('li', null, h('span', { lang: 'tr' }, t.tr)))),
          h('h2', { style: 'margin-top:24px' }, 'Bu haftanın aile görevi'),
          h('p', { lang: 'tr' }, book.family.task.tr),
        ),
        h(
          'section',
          { class: 'panel' },
          h('h2', null, 'Kitaptaki değerler'),
          h('p', { class: 'en' }, 'Türkiye Yüzyılı Maarif Modeli, Erdem-Değer-Eylem Çerçevesi'),
          h('div', { class: 'chips', style: 'display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 18px' }, ...vals.map((v) => chip(v.name, v.group))),
          ...vals.map((v) => h('p', { style: 'margin:4px 0;font-size:15px;color:var(--ink-soft)' }, `${v.name}: ${VALUE_GROUPS[v.group].name}`)),
          h('h2', { style: 'margin-top:24px' }, 'Kültür notları'),
          ...book.pages.filter((p) => p.culture).map((p) => h('p', { style: 'font-size:16px' }, h('strong', null, /[.!?]$/.test(p.title.tr) ? `${p.title.tr} ` : `${p.title.tr}. `), p.culture!.tr)),
        ),
      ),
      h(
        'section',
        { class: 'section' },
        h('div', { class: 'section-head' }, h('h2', null, 'Kitaptaki kelimeler'), h('p', null, `${words.length} kelime ve kalıp.`)),
        h('div', { class: 'word-grid' }, ...words.map(([lemma, g]) => h('div', { class: 'word-card' }, h('span', { class: 'ico', 'aria-hidden': 'true' }, g.icon ?? ''), h('span', { class: 'tr', lang: 'tr' }, lemma)))),
      ),
    ),
  );
  document.title = `${book.title}: Aile köşesi | Hikâyelerle Kültürüm`;
}
