import { h, icon } from '../ui/dom';
import { page } from '../ui/shell';
import { store } from '../store';
import { Narrator } from '../narrator';
import { LEVELS, VALUES, VALUE_GROUPS, type ValueGroup } from '../values';

const narrator = new Narrator();

export function renderChest(root: HTMLElement) {
  const words = Object.values(store.chest).sort((a, b) => b.at - a.at);
  const body: Node[] = [
    h(
      'div',
      { class: 'page-head' },
      h('h1', null, 'Kelime Sandığım'),
      h('p', null, 'Kitaplarda dokunduğun kelimeler burada toplanır. Bir karta dokun, kelimeyi dinle.'),
    ),
  ];
  if (!words.length) {
    body.push(
      h(
        'div',
        { class: 'empty' },
        h('p', null, 'Sandığın henüz boş. Kitapta altı noktalı kelimelere ya da resimdeki nesnelere dokunduğunda kelimeler buraya gelir.'),
        h('a', { class: 'btn', href: '#/kitap/bayram-sabahi' }, icon.book(), 'Kitabı aç'),
      ),
    );
  } else {
    const listenAll = h('button', { class: 'btn turq small', type: 'button' }, icon.speaker(), 'Hepsini dinle');
    listenAll.addEventListener('click', () => narrator.ready.then(() => narrator.say(words.map((w) => w.lemma).join(', '))));
    body.push(
      h('div', { class: 'hero-actions', style: 'margin-top:18px' }, listenAll, h('span', { class: 'resume-note' }, `${words.length} kelime`)),
      h(
        'div',
        { class: 'word-grid' },
        ...words.map((w) => {
          const say = h('button', { class: 'btn light small icon-only say', type: 'button', 'aria-label': `${w.lemma} kelimesini dinle` }, icon.speaker());
          say.addEventListener('click', () => narrator.ready.then(() => narrator.say(w.lemma)));
          return h(
            'article',
            { class: 'word-card' },
            say,
            h('span', { class: 'ico', 'aria-hidden': 'true' }, w.icon ?? ''),
            h('span', { class: 'tr', lang: 'tr' }, w.lemma),
            h('span', { class: 'en', lang: 'en' }, w.en),
          );
        }),
      ),
    );
  }
  root.replaceChildren(...page('chest', ...body));
  document.title = 'Kelime Sandığım | Hikâyelerle Kültürüm';
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
        h('p', null, 'Her kitap masanın üzerinde açılan, sayfaları kâğıttan sahnelerle canlanan bir resimli kitaptır. Metin Türkçedir; altı noktalı kelimelere dokununca kelime okunur ve İngilizce karşılığı görünür. Dil düğmesiyle sayfanın İngilizcesi de açılabilir.'),
        h('p', null, 'Resimdeki nesnelere dokunmak da işe yarar: dokunulan nesnenin Türkçesi okunur ve metindeki kelime parlar. Böylece çocuk kelimeyle resmi birlikte öğrenir.'),
        h('h2', null, 'Üç okuma seviyesi'),
        h('ul', null, ...LEVELS.map((l) => h('li', null, h('strong', null, `${l.name} (${l.ages}): `), l.note))),
        h('p', null, 'Aynı hikâye üç farklı uzunlukta yazıldı. Kardeşler aynı kitabı kendi seviyelerinde okuyabilir.'),
        h('h2', null, 'Değerler'),
        h('p', null, 'Kitaplar Türkiye Yüzyılı Maarif Modeli’nin Erdem-Değer-Eylem Çerçevesi’ndeki değerleri işler. Her kitabın sonunda bir değer avı, konuşma soruları ve küçük bir aile görevi vardır.'),
        h('ul', null, ...groups),
        h('h2', null, 'Sesli okuma'),
        h('p', null, 'Bu ilk sürümde sesli okuma cihazın kendi Türkçe sesiyle yapılır. iPhone, iPad ve Mac’te Safari, Windows’ta Microsoft Edge ve Android’de Chrome Türkçe ses sunar. Türkçe ses olmayan cihazlarda kelimeler okuma hızında sırayla parlar, siz sesli okursunuz. Sonraki sürümde kitaplar gerçek bir anlatıcının sesiyle gelecek.'),
        h('h2', null, 'Gizlilik'),
        h('p', null, 'Hesap açmak gerekmez. Çerez, reklam ya da izleme aracı kullanılmaz. Okuma ilerlemesi ve Kelime Sandığı yalnızca bu tarayıcıda saklanır ve başka bir yere gönderilmez.'),
        reset,
      ),
    ),
  );
  document.title = 'Ebeveynler için | Hikâyelerle Kültürüm';
}
