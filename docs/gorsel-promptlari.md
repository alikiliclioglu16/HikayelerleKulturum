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

## Meshy için 3D obje istemleri

Masadaki süs objeleri için (çay bardağı, lale vazosu vb.). Ticari kullanım için Meshy'nin ücretli planında üretin; ücretsiz plandaki modeller CC BY 4.0 lisanslıdır ve Meshy'ye atıf ister.

Ayarlar: **Text to 3D**, stilize, düşük poligon; **GLB** olarak dışa aktarın; 20.000 üçgenin altında, doku 1024 px.

- **Turkish tea glass:** "A traditional tulip-shaped Turkish tea glass filled with dark red tea on a small red and white saucer, stylized, clean, low poly."
- **Çaydanlık:** "A two-level Turkish teapot (çaydanlık), shiny silver lower kettle with a white porcelain teapot on top decorated with blue İznik flowers, stylized, low poly."
- **Lokum kutusu:** "An open red gift box of Turkish delight cubes, pink and white, dusted with powdered sugar, stylized, low poly."
- **Lale vazosu:** "A single red tulip in a slim turquoise ceramic vase with İznik patterns, stylized, low poly."
- **Nazar boncuğu (isteğe bağlı):** "A blue glass evil eye bead charm on a small stand, stylized, low poly."

GLB dosyalarını `public/models/` klasörüne koyun. Uygulamada bunları yükleyen kod bir sonraki adımda eklenecek.
