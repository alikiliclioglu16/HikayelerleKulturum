# Hikâyelerle Kültürüm

Amerika'da büyüyen 4–11 yaş arası çift dilli Türk çocukları için etkileşimli, açılır sayfalı (pop-up) resimli kitaplar. Her kitap bir Türk kültürü ögesini ve Türkiye Yüzyılı Maarif Modeli'nin değerlerini işler.

Bu sürümde **Bayram Sabahı** ve **Nasreddin Hoca ve Kazan** hazır; 15 kitaplık planın diğer 13 kitabı "Yakında" olarak listelenir (plan: `docs/kitap-plani.md`).

## Neler var?

- 3D ana sayfa: üst rafta 20 Türk kültürü ögesi (dokununca Türkçe adı okunur, İngilizcesi ve kısa bir bilgi çıkar, Kelime Sandığı'na eklenir), alt rafta kitaplar. Raf parmakla kaydırılır, kitaplar oklarla değişir.
- Masanın üstünde açılan 3D kitap; her sayfada kâğıttan kesilmiş arka planlar ayağa kalkar, önlerinde 3D karakterler, hayvanlar ve nesneler durur (yürüyen, konuşan, sallanan modeller). Masada kültür rafındaki 3D nesneler (çaydanlık, buharı tüten çay, kahve, simit…) durur.
- Ana sayfada ve okurken sinematik kamera ve ışık hareketleri ile sakin arka plan müziği; "Sakin hareket" ayarı bunları durdurur.
- Ana sayfanın duvarında asılı bir Türk halısı; ortasındaki göbek motifi 5 saniyede bir değişir.
- Türkçe metin, üç okuma seviyesi: Tomurcuk (4–6), Lale (7–9), Çınar (10–11).
- Sesli okuma ve kelime kelime vurgulama (cihazın Türkçe sesiyle; ses yoksa kelimeler okuma hızında parlar).
- Altı noktalı kelimeye dokununca kelime okunur, İngilizcesi çıkar ve resimdeki nesne zıplar. Resimdeki nesneye dokununca da metindeki kelime parlar.
- Sayfanın İngilizce çevirisi, "Biliyor musun?" kültür notları.
- Kelime Sandığı, bilgi yarışması, değer avı ve ebeveynler için aile köşesi.
- Hesap, çerez, reklam ve analitik yok. İlerleme yalnızca tarayıcıda (localStorage) saklanır.

## GitHub'a yükleme ve yayın

1. Zip'teki her şeyi `Documents\GitHub\HikayelerleKulturum` klasörüne kopyalayın (README'nin üzerine yazılabilir).
2. GitHub Desktop'ta değişiklikleri görün, bir özet yazıp **Commit to main**, sonra **Push origin** deyin.
3. Vercel'de proje zaten bağlıysa her push sonrası site kendiliğinden güncellenir. İlk kez bağlıyorsanız Framework Preset olarak **Vite** seçilir; Build Command `npm run build`, Output Directory `dist`.

## Bilgisayarda çalıştırmak (isteğe bağlı)

[Node.js 20+](https://nodejs.org) kurulu olmalı.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # yayın paketini dist/ klasörüne üretir
```

## Klasör yapısı

```
public/books/index.json            Raftaki kitaplar (hazır ve yakında)
public/books/bayram-sabahi/book.json   Kitabın bütün içeriği
public/culture/items.json          Kültür rafındaki 20 öge (ad, İngilizcesi, bilgi, isteğe bağlı 3D model)
src/home3d/                        3D ana sayfa: oda, raflar, geçici kültür modelleri, duvardaki kilim motifleri (kilim.ts)
src/art/                           Geçici çizimler (kod ile çizilen kâğıt-kesik sahneler)
src/three/bookScene.ts             3D masa, kitap, sayfa çevirme ve dokunma
src/pages/                         Ana sayfa, okuyucu, etkinlikler, sandık, ebeveyn sayfası
src/values.ts                      Maarif Modeli'nin 20 değeri
docs/gorsel-promptlari.md          ChatGPT/Gemini ve Meshy için hazır istemler
docs/kitap-plani.md                15 kitabın planı, değer dağılımı, kullanılacak 3D modeller ve lisans notları
public/models/characters, animals  Ana sayfadaki ve kitaplardaki animasyonlu karakterler
```

## Yeni kitap eklemek

1. `public/books/<kitap-id>/book.json` dosyasını `bayram-sabahi/book.json` örneğine göre oluşturun.
2. `public/books/index.json` içine kitabı `"status": "ready"` ile ekleyin.

Metin işaretleme kuralı:

- `{lokum}` → sözlükte `lokum` olarak geçen kelime.
- `{yatağından|yatak}` → metinde "yatağından" görünür, sözlükte `yatak` aranır.
- Birden fazla kelime de olur: `{Ellerinizden öperim|ellerinizden öperim}`.

Her sayfada `text` altında `"1"`, `"2"`, `"3"` seviyeleri vardır; her biri `tr` ve `en` içerir.

## Kendi resimlerinizi kullanmak

Bir sayfaya `layers` eklenirse kodla çizilen geçici sahne yerine sizin resimleriniz kullanılır. Resimler arka planı şeffaf PNG veya WebP olmalı.

```json
"layers": [
  { "src": "art/p1-arka.webp", "z": 0.04, "w": 0.96, "h": 0.86 },
  { "src": "art/p1-orta.webp", "z": 0.45, "w": 0.92, "h": 0.60,
    "hotspots": [{ "word": "yatak", "rect": [0.1, 0.3, 0.8, 0.7] }] },
  { "src": "art/p1-on.webp",   "z": 0.84, "w": 0.94, "h": 0.30 }
]
```

- `z`: sayfanın arkasından (0) önüne (1) konum.
- `w`, `h`: genişlik ve yükseklik, sayfa genişliğine göre. Resim oranı `h / w` olmalı (arka katman için yaklaşık 1000×900 px).
- `hotspots`: dokunulabilir alanlar; `rect` = [x, y, genişlik, yükseklik], resmin sol üst köşesinden 0–1 arası.
- Kapak için `index.json` içinde `"cover": { "src": "art/kapak.webp" }` (oran 1 : 1,36).

İstemler için `docs/gorsel-promptlari.md` dosyasına bakın.

## Kültür rafına 3D model eklemek

Meshy'den gelen GLB dosyalarını `public/models/culture/` klasörüne koyup `public/culture/items.json` içinde ögeye `"model": "/models/culture/<id>.glb"` ekleyin. Gerekirse `"rotY"` (derece), `"height"` (yükseklik) ve `"width"` (raftaki yer genişliği, varsayılan 0.46) ile yön ve boyut ayarlanır. Meshy dosyaları çok büyük gelirse (20 MB gibi) önce küçültülmeli; bunu Claude ile yapabilirsiniz. İstemler `docs/gorsel-promptlari.md` dosyasında.

## Sayfaya 3D model eklemek

Bir sayfaya `models` eklenirse GLB modeller açılır sayfanın üstünde durur ve dokununca kelimesi okunur:

```json
"models": [
  { "src": "/models/characters/nasreddin-hoca.glb", "word": "Nasreddin Hoca", "x": -0.36, "z": 0.66, "h": 0.42, "walkTo": [0.06, 0.6], "rotY": 90, "endRotY": 60 },
  { "src": "/models/characters/komsu.glb", "word": "komşu", "x": 0.3, "z": 0.5, "h": 0.41, "rotY": -40, "anim": "talk" },
  { "src": "/models/kenney/pot.glb", "word": "kazan", "x": 0.02, "z": 0.76, "h": 0.1, "w": 0.2, "tint": "#F0A060", "fx": "wobble" },
  { "src": "/models/kenney/tree-high-round.glb", "word": "ağaç", "x": -0.44, "z": 0.4, "h": 0.42, "fx": "sway" },
  { "src": "/models/animals/kedi-yuruyen.glb", "word": "kedi", "x": -0.4, "z": 0.95, "h": 0.12, "walkTo": [0.25, 0.95], "patrol": true, "speed": 0.06 }
]
```

- `x`: sayfa ortasına göre yatay konum (-0.5 … 0.5), `z`: arkadan (0) öne (1), `h`: yükseklik, `w`: en fazla genişlik (halı gibi yassı şeyler için), `y`: sayfadan yükseklik (masanın üstündeki çaydanlık gibi), `rotY`: dönüş (derece).
- `anim`: animasyon adı ya da bir parçası (`idle`, `talk`, `look`, `walk`), duruk için `"none"`.
- `walkTo`: model oraya yürür, sonra `anim` oynar ve `endRotY` yönüne döner. `patrol: true` ile iki nokta arasında gidip gelir.
- `fx`: duruk nesnelere hayat: `sway` (ağaç), `wobble` (titreyen kazan), `breathe` (saksı), `bob`, `swing`, `spin`.
- `tint`: modeli renklendirir (gri tencereyi bakır kazan yapmak gibi).
- `public/models/kenney/` içindeki hazır modeller Kenney kitlerinden (CC0) seçildi; yenileri eklenebilir.

Masadaki nesneler için `book.json` içine `table` eklenir (dünya birimi; kitap 2 birim genişliğinde):

```json
"table": [{ "src": "/models/culture/cay.glb", "word": "çay", "x": -1.3, "z": 0.56, "h": 0.2, "steam": true }]
```

Kod ile çizilen sahne katmanlarında `thumbOnly: true` olan katmanlar yalnızca etkinliklerdeki küçük resimlerde görünür (kitapta o rolü 3D modeller oynar).

## Gerçek anlatıcı sesi eklemek

Okuyucu kayıtlı sesi destekler. Bir sayfaya şunu ekleyin:

```json
"audio": {
  "2": { "src": "/books/bayram-sabahi/audio/p1-l2.mp3", "marks": [0.20, 0.55, 1.10] }
}
```

`marks`, metindeki her kelimenin saniye cinsinden başlangıç zamanıdır (sırayla). Bu zamanlar kelime zaman damgası veren bir seslendirme aracıyla ya da kayıt üzerinde hizalama yapan bir araçla çıkarılabilir. Ses varsa cihazın sesi yerine kayıt çalınır ve kelimeler kayda göre parlar.

## Güvenlik ve gizlilik

`vercel.json` içinde içerik güvenlik politikası (CSP) ve güvenlik başlıkları tanımlıdır. İleride dışarıdan bir analitik veya ödeme betiği eklenirse CSP'ye o alan adı eklenmelidir. Çocuklara yönelik bir üründe çerez kullanan analitik eklemeden önce gizlilik açısından hukuki görüş alın.

## Sonraki adımlar

- Resimlemeleri ChatGPT/Gemini ile üretip `layers` ile eklemek.
- Her seviye için gerçek anlatıcı kaydı.
- Yeni kitaplar: sırada Keloğlan ve Üç Tohum, 23 Nisan Şenliği, Ebru'nun Renkleri (`docs/kitap-plani.md`).
- Ebeveyn hesabı ve ödeme (Supabase + Stripe).
