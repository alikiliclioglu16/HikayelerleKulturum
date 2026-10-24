# Görsel istemleri (ChatGPT / Gemini / Meshy)

Bu dosyadaki istemler, şu an kodla çizilen geçici sahnelerin yerine gerçek resimler üretmek içindir. İstemler İngilizce yazıldı; resim modelleri İngilizcede daha tutarlı sonuç veriyor.

## Genel kurallar

- Her sayfa üç ayrı resimden oluşur: **arka**, **orta**, **ön** katman. Her katmanı ayrı üretin.
- Arka planı **şeffaf** PNG isteyin (orta ve ön katmanlar için şart). Model şeffaf vermezse düz beyaz arka plan isteyip sonra arka planı silin.
- Resimde **yazı olmasın**. Metinler uygulamada ayrıca gösteriliyor.
- Karakterlerin her sayfada aynı görünmesi için her istemin başına aşağıdaki **Stil** ve ilgili **Karakter** satırlarını ekleyin. Mümkünse ilk ürettiğiniz karakter resmini referans olarak yükleyin.
- Dosya adı önerisi: `p1-arka.webp`, `p1-orta.webp`, `p1-on.webp` → `public/books/bayram-sabahi/art/` klasörüne.

**Stil (her isteme ekleyin):**

> Flat paper-cut children's book illustration, layered craft paper with subtle paper grain, soft shadows between paper layers, warm and friendly, rounded shapes, İznik tile inspired palette (cobalt blue #1C3F8C, turquoise #1FA4A0, coral red #D2372C, saffron #F2B33D, leaf green #3E8E4E), no text, no letters, transparent background.

**Karakterler:**

- **Elif** (8): long brown hair in a ponytail with a small red ribbon, round face, rosy cheeks, blue dress.
- **Can** (5, Elif's little brother): short dark brown hair, white shirt, red bow tie, navy shorts.
- **Anne** (mother): shoulder-length dark brown hair, green dress, cream apron in the kitchen.
- **Baba** (father): short dark hair, neat mustache, light blue shirt, grey trousers.
- **Babaanne** (grandmother): purple headscarf with small white dots, round glasses, red cardigan.
- **Dede** (grandfather): white hair, white mustache, grey flat cap, brown vest.
- **Ayşe Teyze** (elderly neighbor): grey hair in a bun, round glasses, purple cardigan.
- **Maya** (8, American school friend): curly black hair, dark brown skin, yellow sweater, jeans.

## Kapak (oran 1 : 1,36, ör. 1000×1360)

> Book cover illustration: Elif in a blue dress holding a white bowl full of colorful wrapped candies, her little brother Can waving, morning sky, colorful bunting, a thin crescent moon, red and yellow tulips along the bottom, a frame of İznik tiles around the edge. Leave the top third empty for the title.

## Sayfa istemleri

Boyutlar: **arka** 1000×900, **orta** 1000×650, **ön** 1000×320 (yatay şeritler).

### 1. Bugün bayram!
- **Arka:** Arched bedroom wall in pale blue, a window with a smiling morning sun and green hills, turquoise curtains, colorful bunting across the top, a small shelf with books, a framed İznik tile.
- **Orta:** A wooden bed with a cobalt blanket decorated with small tulips; Elif in light turquoise pajamas sitting up and stretching both arms happily.
- **Ön:** A small wooden nightstand with a red alarm clock, a chair with a blue Bayram dress hanging on it, pink slippers, a potted plant.

### 2. Bayramlıklar
- **Arka:** Mint green wall with a tall oval gold mirror and a wooden wardrobe, bunting at the top.
- **Orta:** Elif in her new blue dress gently fixing the crooked red bow tie of her little brother Can, who wears a white shirt and navy shorts and grins.
- **Ön:** An open red shoe box with new shiny shoes, folded clothes on a stool, a potted plant.

### 3. Bayram sofrası
- **Arka:** Kitchen wall with a band of İznik tiles, a small window, shelves with a two-level Turkish teapot (çaydanlık) and tulip-shaped tea glasses.
- **Orta:** Anne in a green dress and cream apron holding a round tray of baklava; Baba with a tray of tulip-shaped tea glasses; Elif carrying white plates; Can carefully carrying a red box of Turkish delight.
- **Ön:** A table with a white tablecloth with a blue border, plates, tea glasses on red saucers, a plate of pink and white Turkish delight.

### 4. Uzaktan bayramlaşma
- **Arka:** Living room wall with a window, red curtains, a framed picture of İzmir's Clock Tower by the sea, bunting.
- **Orta:** A turquoise sofa; Elif and Can sitting on it, both waving.
- **Ön (ayrı, daha dar: 900×800):** A tablet on a stand, its screen showing Babaanne and Dede waving, with the sea and İzmir's Clock Tower behind them.

### 5. El öpme
- **Arka:** Entry hall with an open front door showing a sunny garden, coat hooks, a side table with a bowl of Bayram candy.
- **Orta:** Ayşe Teyze smiling and holding out her hand; Elif respectfully kissing her hand and touching it to her forehead; Ayşe Teyze holds a small envelope of pocket money in her other hand.
- **Ön:** A neat row of shoes left at the door on a mat, a potted plant.

### 6. Adil paylaşım
- **Arka:** Soft pink living room wall, a window with cobalt curtains, a framed tulip picture, bunting.
- **Orta:** Can hugging a big white bowl full of colorful wrapped candies; Elif smiling and gesturing to share.
- **Ön:** A wooden coffee table with two equal piles of wrapped candies and a small dish of candies set aside for guests.

### 7. Maya ile bayram
- **Arka:** Sunny suburban American front yard: a white house with a porch and red door, a round green tree, a mailbox, blue sky.
- **Orta:** Maya waving happily; Elif offering her an open box of Turkish delight.
- **Ön:** A flower bed full of red, yellow and pink tulips.

### 8. Bayramın anlamı
- **Arka:** Night sky in deep indigo with many small stars, a bright crescent moon and one big star, dark rooftops with warm lit windows.
- **Orta:** A house wall with a big window glowing warm yellow; inside, the family (Baba, Anne, Elif, Can) seen as warm silhouettes, hugging.
- **Ön:** A wooden window box with red and yellow tulips and a small glowing lantern.

## Meshy için kültür rafı modelleri (20 öge)

Ana sayfanın üst rafındaki 20 öge şu an kodla yapılmış geçici modellerdir. Meshy'den gelen GLB dosyaları bunların yerine geçer.

**Meshy ayarları**

- Ticari kullanım için ücretli planda üretin (ücretsiz plandaki modeller CC BY 4.0 lisanslıdır ve Meshy'ye atıf ister).
- Tek bir nesne, düz zeminde dik duran, önden bakınca tanınan bir oyuncak/biblo gibi olsun.
- Dışa aktarma: **GLB**, 20.000 üçgenin altı, doku 1024 px. Mümkünse sıkıştırma (Draco) kapalı.
- Dosya adı aşağıdaki tablodaki `id` ile aynı olsun, ör. `cay.glb`.

**Stil (her isteme ekleyin):**

> Cute stylized miniature figurine, hand-painted toy look, smooth rounded shapes, soft clay and painted wood materials, warm saturated colors, clean simple details, single object standing upright on a flat base, centered, front view.

| id | Öge | İstem (İngilizce) |
|---|---|---|
| `cay` | Çay | A tulip-shaped Turkish tea glass filled with dark red tea, gold rim, on a small red saucer with a white rim, a sugar cube and tiny spoon on the saucer |
| `caydanlik` | Çaydanlık | A two-level Turkish teapot: shiny silver kettle at the bottom, white porcelain teapot on top with a blue İznik flower band |
| `simit` | Simit | A Turkish simit, twisted sesame bread ring, golden brown, standing upright on a small wooden peg stand |
| `baglama` | Bağlama | A Turkish bağlama (saz) lute standing upright on a small stand, pear-shaped ribbed wooden body, long neck with frets and tuning pegs |
| `peri-bacasi` | Peri bacası | Three Cappadocia fairy chimneys of different heights with dark mushroom caps, tiny carved doors and windows, on a sandy rock base |
| `balon` | Sıcak hava balonu | A hot air balloon with red, yellow, cobalt blue and turquoise stripes and a small wicker basket, resting on its basket |
| `baklava` | Baklava | A round copper tray of diamond-shaped baklava pieces with green pistachio crumbs, leaning on a small wooden plate stand |
| `nazar` | Nazar boncuğu | A blue glass evil eye bead (nazar) hanging from a small brass stand on a wooden base, with a red string and tassel |
| `lale` | Lale | A single red tulip in a small white İznik vase painted with cobalt and red tulips |
| `kahve` | Türk kahvesi | A small Turkish coffee cup with saucer, foamy coffee, next to a copper cezve pot with a long brass handle |
| `lokum` | Lokum | A pyramid of pink and white Turkish delight cubes dusted with powdered sugar on a white footed dish |
| `galata` | Galata Kulesi | Istanbul's Galata Tower: round stone tower with small arched windows, a gallery and a grey conical roof |
| `kiz-kulesi` | Kız Kulesi | Istanbul's Maiden's Tower on a tiny rocky island in blue water: white building, red roof, small tower with a grey cupola and a tiny Turkish flag |
| `davul` | Davul | A traditional Turkish drum (davul) with red body and white zigzag ropes, lying on a small wooden cradle, with a mallet |
| `ebru` | Ebru | A small framed ebru (marbled paper) painting with swirls of blue, turquoise, red and yellow, on a wooden easel |
| `karagoz` | Karagöz ile Hacivat | A miniature shadow-puppet theater: a glowing white screen in a wooden frame with two colorful puppets, Karagöz with a round black beard and Hacivat with a pointed beard and tall hat, red cloth below |
| `dondurma` | Maraş dondurması | A Maraş ice cream cone with a white and a pistachio scoop, a stretchy tip on top, in a small wooden cone holder |
| `cini` | Çini | A round İznik ceramic plate with tulips, carnations and leaves in cobalt, turquoise and red, cobalt wave rim, on a plate stand |
| `mangala` | Mangala | A wooden mangala game board with two rows of six pits and colorful stones, leaning on a small stand |
| `bayrak` | Türk bayrağı | A small Turkish flag waving on a white pole with a gold ball, on a round wooden base |

**Modelleri siteye eklemek**

1. GLB dosyalarını `public/models/culture/` klasörüne koyun (ör. `public/models/culture/cay.glb`).
2. `public/culture/items.json` içinde ilgili ögeye `"model": "/models/culture/cay.glb"` satırını ekleyin.
3. Model ters ya da yan duruyorsa `"rotY": 180` gibi bir açı, çok küçük ya da büyük duruyorsa `"height": 0.5` gibi bir yükseklik ekleyin.

Dosyalar büyük gelirse (birkaç MB'tan fazla) bana gönderin; dokuları küçültüp sıkıştırarak yerleştiririm.
