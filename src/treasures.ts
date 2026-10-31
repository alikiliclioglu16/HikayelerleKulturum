/**
 * The culture treasures of the Kelime Sandığı (word chest): things from Turkish culture, each with a 3D model,
 * a picture (rendered from the model) and a short text on how it belongs to the culture.
 * Only these are collected. A child finds one by tapping one of its words in a book (a dotted word or a thing in
 * the pop-up) or by tapping it on the culture shelf on the home page.
 * To add one: an entry here (its words in lower case) and a 320×320 transparent picture of its model in
 * public/culture/hazine/<id>.webp. `found` lists where it can be found (shown as a hint while it is hidden).
 */

export type TreasureGroup = 'lezzet' | 'sanat' | 'yer' | 'gelenek' | 'masal';

export interface Treasure {
  id: string;
  group: TreasureGroup;
  name: string;
  /** The 3D model (shown turning in the treasure's card). */
  model: string;
  /** A picture of the model (and, darkened, its silhouette before it is found). */
  thumb: string;
  /** Words (lower case) that reveal it. */
  words: string[];
  /** How it belongs to Turkish culture. */
  fact: string;
  /** Where to find it: 'raf' (the home shelf) or book ids. */
  found: string[];
}

export const GROUPS: { id: TreasureGroup; name: string }[] = [
  {
    "id": "lezzet",
    "name": "Lezzetler"
  },
  {
    "id": "sanat",
    "name": "Sanat ve Müzik"
  },
  {
    "id": "yer",
    "name": "Yerler ve Yapılar"
  },
  {
    "id": "gelenek",
    "name": "Gelenekler"
  },
  {
    "id": "masal",
    "name": "Masal ve Fıkra Kahramanları"
  }
];

export const TREASURES: Treasure[] = [
  {
    "id": "simit",
    "group": "lezzet",
    "name": "simit",
    "model": "/models/culture/simit.glb",
    "thumb": "/culture/hazine/simit.webp",
    "words": [
      "simit"
    ],
    "fact": "Simit, susamlı ve halka şeklinde bir ekmektir. Kahvaltıda çayla çok yakışır. İstanbul’da simitçiler simitleri tablalarda taşıyıp satar.",
    "found": [
      "raf",
      "bayram-sabahi",
      "keloglan-tohum",
      "nasreddin-hoca-kazan"
    ]
  },
  {
    "id": "cay",
    "group": "lezzet",
    "name": "çay",
    "model": "/models/culture/cay.glb",
    "thumb": "/culture/hazine/cay.webp",
    "words": [
      "çay"
    ],
    "fact": "Türkiye'de çay ince belli bardaklarda içilir. Türkiye, dünyada en çok çay içilen ülkelerden biridir. Misafire ilk ikram çoğu zaman bir bardak çaydır.",
    "found": [
      "raf",
      "bayram-sabahi",
      "keloglan-tohum",
      "nasreddin-hoca-kazan"
    ]
  },
  {
    "id": "caydanlik",
    "group": "lezzet",
    "name": "çaydanlık",
    "model": "/models/culture/caydanlik.glb",
    "thumb": "/culture/hazine/caydanlik.webp",
    "words": [
      "çaydanlık"
    ],
    "fact": "Çaydanlık iki katlıdır: altta su kaynar, üstte çay demlenir. Ocağın üstünde ağır ağır demlenen çay, Türk evlerinin vazgeçilmezidir.",
    "found": [
      "raf",
      "bayram-sabahi",
      "keloglan-tohum",
      "nasreddin-hoca-kazan"
    ]
  },
  {
    "id": "kahve",
    "group": "lezzet",
    "name": "Türk kahvesi",
    "model": "/models/culture/kahve.glb",
    "thumb": "/culture/hazine/kahve.webp",
    "words": [
      "kahve",
      "türk kahvesi"
    ],
    "fact": "Türk kahvesi cezvede pişirilir ve köpüklü içilir. Yanında bir bardak su ve lokum ikram edilir. Türk kahvesi kültürü, UNESCO’nun Somut Olmayan Kültürel Miras listesinde yer alır.",
    "found": [
      "raf",
      "nasreddin-hoca-kazan"
    ]
  },
  {
    "id": "baklava",
    "group": "lezzet",
    "name": "baklava",
    "model": "/models/culture/baklava.glb",
    "thumb": "/culture/hazine/baklava.webp",
    "words": [
      "baklava"
    ],
    "fact": "Baklava, ince yufkalar, ceviz ya da fıstık ve şerbetle yapılan bir tatlıdır. Bayram sofralarının baş tacıdır.",
    "found": [
      "raf",
      "bayram-sabahi",
      "keloglan-tohum"
    ]
  },
  {
    "id": "lokum",
    "group": "lezzet",
    "name": "lokum",
    "model": "/models/culture/lokum.glb",
    "thumb": "/culture/hazine/lokum.webp",
    "words": [
      "lokum",
      "bayram şekeri"
    ],
    "fact": "Lokum yumuşacık bir Türk tatlısıdır. Gül, nar ya da fıstıklı olabilir ve pudra şekerine bulanır. Bayramlarda misafirlere lokum ve şeker ikram edilir.",
    "found": [
      "raf",
      "bayram-sabahi"
    ]
  },
  {
    "id": "dondurma",
    "group": "lezzet",
    "name": "Maraş dondurması",
    "model": "/models/culture/dondurma.glb",
    "thumb": "/culture/hazine/dondurma.webp",
    "words": [
      "dondurma",
      "maraş dondurması"
    ],
    "fact": "Maraş dondurması salep ve keçi sütüyle yapılır. O kadar sıkıdır ki uzar ve bıçakla kesilir.",
    "found": [
      "raf",
      "bayram-sabahi"
    ]
  },
  {
    "id": "pilav",
    "group": "lezzet",
    "name": "pilav",
    "model": "/models/masal/pilav.glb",
    "thumb": "/culture/hazine/pilav.webp",
    "words": [
      "pilav"
    ],
    "fact": "Pilav, Türk mutfağının en sevilen yemeklerinden biridir. Pirinç önce tereyağında kavrulur, sonra suyunu çekene kadar pişirilir. Düğünlerde ve bayramlarda büyük kazanlarda herkes için pilav yapılır.",
    "found": [
      "nasreddin-hoca-kazan"
    ]
  },
  {
    "id": "kazan",
    "group": "lezzet",
    "name": "bakır kazan",
    "model": "/models/masal/kazan.glb",
    "thumb": "/culture/hazine/kazan.webp",
    "words": [
      "kazan",
      "tencere"
    ],
    "fact": "Bakır kazanlar Anadolu mutfağının en eski eşyalarındandır. Düğünlerde, bayramlarda ve imecelerde koca kazanlarda herkese yetecek kadar yemek pişirilir. Nasreddin Hoca’nın en ünlü fıkrasında da bir kazan vardır!",
    "found": [
      "nasreddin-hoca-kazan"
    ]
  },
  {
    "id": "baglama",
    "group": "sanat",
    "name": "bağlama",
    "model": "/models/culture/baglama.glb",
    "thumb": "/culture/hazine/baglama.webp",
    "words": [
      "bağlama",
      "saz"
    ],
    "fact": "Bağlama ya da saz, türkülerde çalınan telli bir çalgıdır. Âşıklar sözlerini sazla söyler.",
    "found": [
      "raf"
    ]
  },
  {
    "id": "davul",
    "group": "sanat",
    "name": "davul",
    "model": "/models/culture/davul.glb",
    "thumb": "/culture/hazine/davul.webp",
    "words": [
      "davul",
      "halay"
    ],
    "fact": "Davul, Anadolu’nun en coşkulu çalgısıdır. Düğünlerde ve bayramlarda davul zurna çalınır, herkes el ele tutuşup halay çeker. Ramazan’da davulcular sahur vakti sokakları gezip herkesi uyandırır.",
    "found": [
      "raf",
      "23-nisan"
    ]
  },
  {
    "id": "cini",
    "group": "sanat",
    "name": "çini",
    "model": "/models/culture/cini.glb",
    "thumb": "/culture/hazine/cini.webp",
    "words": [
      "çini"
    ],
    "fact": "İznik çinileri mavi, turkuaz ve kırmızı renkleriyle ünlüdür. Camileri ve sarayları süsler.",
    "found": [
      "raf"
    ]
  },
  {
    "id": "ebru",
    "group": "sanat",
    "name": "ebru",
    "model": "/models/culture/ebru.glb",
    "thumb": "/culture/hazine/ebru.webp",
    "words": [
      "ebru"
    ],
    "fact": "Ebru, su üstüne boya damlatılarak yapılan bir sanattır. Sudaki desen sonra kâğıda aktarılır. Ebru sanatı UNESCO’nun koruduğu kültürel miraslar arasındadır.",
    "found": [
      "raf"
    ]
  },
  {
    "id": "karagoz",
    "group": "sanat",
    "name": "Karagöz ile Hacivat",
    "model": "/models/culture/karagoz.glb",
    "thumb": "/culture/hazine/karagoz.webp",
    "words": [
      "karagöz ile hacivat",
      "karagöz",
      "hacivat"
    ],
    "fact": "Karagöz ile Hacivat, ışıklı bir perdeye yansıyan renkli figürlerle oynanan bir gölge oyunudur. Karagöz gölge oyunu da UNESCO listesinde yer alır.",
    "found": [
      "raf"
    ]
  },
  {
    "id": "lale",
    "group": "sanat",
    "name": "lale",
    "model": "/models/culture/lale.glb",
    "thumb": "/culture/hazine/lale.webp",
    "words": [
      "lale"
    ],
    "fact": "Lale, Türk sanatının en sevilen çiçeğidir. Çinilerde, kilimlerde ve kumaşlarda lale desenleri görürsün.",
    "found": [
      "raf",
      "bayram-sabahi",
      "23-nisan"
    ]
  },
  {
    "id": "galata",
    "group": "yer",
    "name": "Galata Kulesi",
    "model": "/models/culture/galata.glb",
    "thumb": "/culture/hazine/galata.webp",
    "words": [
      "galata kulesi"
    ],
    "fact": "Galata Kulesi İstanbul'dadır. Yüzyıllardır şehri ve denizi tepeden seyreder.",
    "found": [
      "raf"
    ]
  },
  {
    "id": "kiz-kulesi",
    "group": "yer",
    "name": "Kız Kulesi",
    "model": "/models/culture/kiz-kulesi.glb",
    "thumb": "/culture/hazine/kiz-kulesi.webp",
    "words": [
      "kız kulesi"
    ],
    "fact": "Kız Kulesi, İstanbul Boğazı'nda küçük bir adacığın üstünde durur. Efsaneleriyle ve manzarasıyla İstanbul’un simgelerinden biridir.",
    "found": [
      "raf"
    ]
  },
  {
    "id": "peri-bacasi",
    "group": "yer",
    "name": "peri bacası",
    "model": "/models/culture/peri-bacasi.glb",
    "thumb": "/culture/hazine/peri-bacasi.webp",
    "words": [
      "peri bacası"
    ],
    "fact": "Peri bacaları Kapadokya'dadır. Rüzgâr ve yağmur, yumuşak kayaları çok uzun yıllar boyunca bu şekle sokmuştur.",
    "found": [
      "raf"
    ]
  },
  {
    "id": "balon",
    "group": "yer",
    "name": "sıcak hava balonu",
    "model": "/models/culture/balon.glb",
    "thumb": "/culture/hazine/balon.webp",
    "words": [
      "sıcak hava balonu"
    ],
    "fact": "Kapadokya'da sabahları gökyüzü rengârenk sıcak hava balonlarıyla dolar.",
    "found": [
      "raf"
    ]
  },
  {
    "id": "meclis",
    "group": "yer",
    "name": "Büyük Millet Meclisi",
    "model": "/models/23-nisan/meclis.glb",
    "thumb": "/culture/hazine/meclis.webp",
    "words": [
      "meclis",
      "23 nisan",
      "ankara",
      "egemenlik",
      "atatürk",
      "millet"
    ],
    "fact": "Türkiye Büyük Millet Meclisi 23 Nisan 1920’de Ankara’da açıldı. Atatürk bu günü çocuklara armağan etti. Her yıl 23 Nisan’da Ulusal Egemenlik ve Çocuk Bayramı’nı dünya çocuklarıyla birlikte kutlarız.",
    "found": [
      "23-nisan"
    ]
  },
  {
    "id": "tas-cesme",
    "group": "yer",
    "name": "taş çeşme",
    "model": "/models/masal/tas-cesme.glb",
    "thumb": "/culture/hazine/tas-cesme.webp",
    "words": [
      "çeşme"
    ],
    "fact": "Eski Türk şehirlerinde sokaklara taş çeşmeler yapılırdı. Çeşmeler herkes su içebilsin diye yaptırılan birer iyilikti. Üzerlerindeki lale ve yazı süslemeleri birer sanat eseridir.",
    "found": [
      "nasreddin-hoca-kazan"
    ]
  },
  {
    "id": "kerpic-ev",
    "group": "yer",
    "name": "kerpiç ev",
    "model": "/models/masal/kerpic-ev.glb",
    "thumb": "/culture/hazine/kerpic-ev.webp",
    "words": [
      "köy",
      "kerpiç"
    ],
    "fact": "Anadolu köylerinde evler eskiden kerpiçten yapılırdı. Kerpiç, çamur ve samanın karıştırılıp güneşte kurutulmasıyla yapılan bir tuğladır. Kerpiç evler yazın serin, kışın sıcak olur.",
    "found": [
      "keloglan-tohum"
    ]
  },
  {
    "id": "bayrak",
    "group": "gelenek",
    "name": "Türk bayrağı",
    "model": "/models/culture/bayrak.glb",
    "thumb": "/culture/hazine/bayrak.webp",
    "words": [
      "bayrak",
      "türk bayrağı"
    ],
    "fact": "Türk bayrağı kırmızı zemin üzerinde beyaz ay ve yıldızdan oluşur. Bayrağımız bağımsızlığımızın simgesidir; okullarda bayrak törenleri yapılır.",
    "found": [
      "raf",
      "23-nisan"
    ]
  },
  {
    "id": "hilal",
    "group": "gelenek",
    "name": "hilal",
    "model": "/models/bayram/hilal-acik.glb",
    "thumb": "/culture/hazine/hilal.webp",
    "words": [
      "hilal"
    ],
    "fact": "Hilal, ayın ince bir yay gibi göründüğü hâlidir. Eskiden Ramazan ayının ve bayramın gelişi, gökyüzünde hilal görülünce müjdelenirdi. Türk bayrağındaki ay da bir hilaldir.",
    "found": [
      "bayram-sabahi"
    ]
  },
  {
    "id": "nazar",
    "group": "gelenek",
    "name": "nazar boncuğu",
    "model": "/models/culture/nazar.glb",
    "thumb": "/culture/hazine/nazar.webp",
    "words": [
      "nazar boncuğu",
      "nazar"
    ],
    "fact": "Nazar boncuğu mavi camdan yapılan geleneksel bir süstür. Kapılara ve bebek odalarına iyi dilek olarak asılır.",
    "found": [
      "raf"
    ]
  },
  {
    "id": "mangala",
    "group": "gelenek",
    "name": "mangala",
    "model": "/models/culture/mangala.glb",
    "thumb": "/culture/hazine/mangala.webp",
    "words": [
      "mangala"
    ],
    "fact": "Mangala, çukurlara taş dağıtarak oynanan çok eski bir Türk zekâ oyunudur.",
    "found": [
      "raf"
    ]
  },
  {
    "id": "sedir",
    "group": "gelenek",
    "name": "sedir",
    "model": "/models/masal/sedir.glb",
    "thumb": "/culture/hazine/sedir.webp",
    "words": [
      "sedir"
    ],
    "fact": "Sedir, eski Türk evlerinde duvar boyunca uzanan alçak bir oturma yeridir. Üstüne minderler ve kilim yastıklar konur. Misafirler sedirde ağırlanır, çaylar burada içilir.",
    "found": [
      "nasreddin-hoca-kazan"
    ]
  },
  {
    "id": "sofra",
    "group": "gelenek",
    "name": "yer sofrası",
    "model": "/models/masal/koy-sofrasi.glb",
    "thumb": "/culture/hazine/sofra.webp",
    "words": [
      "sofra"
    ],
    "fact": "Anadolu’da aileler eskiden alçak, yuvarlak bir sininin çevresinde yere oturup yemek yerdi. Sofraya herkes birlikte oturur, ekmek paylaşılır. Büyükler başlamadan yemeğe başlanmaz; bu bir saygı geleneğidir.",
    "found": [
      "bayram-sabahi",
      "keloglan-tohum"
    ]
  },
  {
    "id": "pazar",
    "group": "gelenek",
    "name": "semt pazarı",
    "model": "/models/masal/pazar-tezgahi.glb",
    "thumb": "/culture/hazine/pazar.webp",
    "words": [
      "pazar",
      "tezgâh"
    ],
    "fact": "Türkiye’de her mahallede haftanın belli bir gününde semt pazarı kurulur. Tezgâhlarda taze meyveler ve sebzeler satılır. Pazarcılar ürünlerini tatlı tatlı seslenerek över.",
    "found": [
      "keloglan-tohum",
      "nasreddin-hoca-kazan"
    ]
  },
  {
    "id": "hoca",
    "group": "masal",
    "name": "Nasreddin Hoca",
    "model": "/models/masal/hoca.glb",
    "thumb": "/culture/hazine/hoca.webp",
    "words": [
      "nasreddin hoca",
      "fıkra",
      "akşehir"
    ],
    "fact": "Nasreddin Hoca, yüzyıllar önce Akşehir’de yaşamış bilge ve esprili bir halk kahramanıdır. Fıkraları hem güldürür hem düşündürür. Akşehir’de her yıl onun adına bir şenlik yapılır.",
    "found": [
      "nasreddin-hoca-kazan"
    ]
  },
  {
    "id": "esek",
    "group": "masal",
    "name": "Hoca’nın eşeği",
    "model": "/models/masal/esek.glb",
    "thumb": "/culture/hazine/esek.webp",
    "words": [
      "eşek"
    ],
    "fact": "Nasreddin Hoca fıkralarının çoğunda Hoca’nın sadık eşeği de vardır. Bir fıkrada Hoca eşeğine ters biner. Neden diye soranlara “Size sırtımı dönmek istemedim!” der.",
    "found": [
      "nasreddin-hoca-kazan"
    ]
  },
  {
    "id": "keloglan",
    "group": "masal",
    "name": "Keloğlan",
    "model": "/models/masal/keloglan.glb",
    "thumb": "/culture/hazine/keloglan.webp",
    "words": [
      "keloğlan",
      "masal"
    ],
    "fact": "Keloğlan, Türk masallarının en sevilen kahramanıdır. Saçı yoktur ama zekâsı ve iyi kalbiyle her zorluğun üstesinden gelir. Türk masalları çoğu zaman “Bir varmış, bir yokmuş” diye başlar.",
    "found": [
      "keloglan-tohum"
    ]
  }
];

const lower = (s: string) => s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();

const byWord = new Map<string, Treasure>();
for (const t of TREASURES) for (const w of t.words) byWord.set(w, t);

/** The treasure a word (a glossary lemma, a thing in a pop-up, a shelf item's name) reveals, if any. */
export function treasureFor(word: string): Treasure | null {
  return byWord.get(lower(word.trim())) ?? null;
}

export function treasureById(id: string): Treasure | null {
  return TREASURES.find((t) => t.id === id) ?? null;
}
