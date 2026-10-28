# Hareket eden hikâye karakterleri

Bu belge, Bayram Sabahı kitabındaki aile karakterlerinin (Elif, Can, Maya, Anne, Baba, Babaanne, Dede, Ayşe Teyze) nasıl hazırlandığını ve sayfalarda nasıl oynatıldığını anlatır.

## 1. Gelen GLB dosyalarının incelemesi

| Dosya | Boyut | Düğüm | Mesh | İskelet (skin) | Hazır animasyon | Yüz ifadesi (morph/blendshape) | Doku |
|---|---|---|---|---|---|---|---|
| elif.glb | 16,6 MB | 1 | 1 | **yok** | **yok** | **yok** | 3 resim |
| can.glb | 16,4 MB | 1 | 1 | yok | yok | yok | 3 |
| maya.glb | 15,9 MB | 1 | 1 | yok | yok | yok | 3 |
| anne.glb | 16,4 MB | 1 | 1 | yok | yok | yok | 3 |
| baba.glb | 16,4 MB | 1 | 1 | yok | yok | yok | 3 |
| babaanne.glb | 17,5 MB | 1 | 1 | yok | yok | yok | 3 |
| dede.glb | 18,1 MB | 1 | 1 | yok | yok | yok | 3 |
| ayse-teyze.glb | 17,6 MB | 1 | 1 | yok | yok | yok | 3 |
| karagoz.glb | 18,8 MB | 1 | 1 | yok | yok | yok | 3 |

Dokuz dosyanın hepsi Blender'dan çıkmış, **tek parça, iskeletsiz ve animasyonsuz** heykel gibi modellerdir. Bu hâliyle bir model ancak bütün olarak kaydırılabilir, döndürülebilir ya da sallanabilir; kol kaldırmak, doğrulmak ya da gerinmek mümkün değildir.

### Elif'in uyanma sahnesi için eksik olanlar

| Hareket | Gereken | Dosyada var mıydı? | Ne yapıldı |
|---|---|---|---|
| Uyuyor, gözleri kapalı | Göz kapağı (blendshape veya kemik) | Yok | Kafa kemiğine bağlı, ten renginde **göz kapakları** eklendi; açılıp kapanır, kırpılır. |
| Doğrulma | Omurga ve göğüs kemikleri | Yok | Otomatik **iskelet** kuruldu (kalça, omurga, göğüs, boyun, kafa). |
| Gerinme, kol kaldırma | Omuz, üst kol, ön kol, el kemikleri ve ağırlıklar | Yok | Kol kemikleri ve deri ağırlıkları eklendi; kolların eteğe/gövdeye yapışması temizlendi. |
| Çevresine bakma | Boyun/kafa kemiği | Yok | Bakış sistemi boyun ve kafayı hedefe çevirir. |
| Yataktan fırlama | Bacak kemikleri | Yok | Kalça, diz, ayak bileği kemikleri eklendi. |
| Gülümseme, ağız açma, dudak senkronu | Yüz blendshape'leri | Yok | **Yapılamadı** (aşağıya bakın). |

## 2. Hazırlık hattı (bir kez yapıldı)

1. Blender (Python modülü, ekransız) ile her modele aynı adlı 19 kemikli bir iskelet kuruldu: `hips, spine, chest, neck, head`, `shoulder_L/R, upper_arm_L/R, forearm_L/R, hand_L/R`, `thigh_L/R, shin_L/R, foot_L/R`.
2. Eklem yerleri her karakterin boyuna göre ayarlandı (boyun, omuz, kalça, diz, ayak bileği). Ağırlıklar ısı yöntemiyle verildi; kolun eteğe ya da gövdeye sızan etkisi temizlendi, her köşe en çok 4 kemiğe bağlandı.
3. Dokular 1024 piksele ve WebP'ye indirildi. Dosya boyutu karakter başına **16–19 MB’tan 0,6–0,8 MB’a** düştü; telefonda ve tablette hızlı açılır.
4. Çıktılar: `public/models/aile/*.glb`. Karagöz bu kitapta karakter olarak kullanılmadı; ileride bir gölge oyunu kitabında aynı yolla hazırlanabilir.

Model hareketleri kemik kemik yapılır. Bütün modeli sallamak hiçbir yerde kol ya da beden hareketinin yerine kullanılmaz; kök (root) yalnızca yürürken, yataktan inerken ve dönerken yer değiştirir.

## 3. Kod yapısı

| Dosya | Görevi |
|---|---|
| `src/three/performer.ts` | Bir karakter: modeli yükler, boyunu ayarlar, pozları kemiklere uygular, göz kapakları, bakış, elde tutulan eşya, yere bırakılan eşya. Boylar `CHARACTERS` içinde tek yerde durur. |
| `src/three/acts.ts` | Hareket sözlüğü (`wake`, `lookAround`, `cheer`, `hopOut`, `walkTo`, `talk`, `point`, `wave`, `offerHand`, `kissHand`, `give`, `receive`, `offer`, `put`, `fixBow`, `twirl`, `blowKiss`, `kissForehead`, `hug`, `nod`, `bow`, `turn`, `rest`, `pose`) ve pozlar. Hiçbir hareket kendi kendine tekrarlamaz. |
| `src/three/stage.ts` | Sayfanın sahnesi: her hareketi metindeki ipucu kelimesine bağlar, anlatıcı o kelimeye gelince başlatır. Duraklat, sürdür, baştan oynat, belirli ana atla. |
| `src/three/props.ts` | Kodla çizilen yatak, lale desenli yorgan, komodin, tablet ve elde taşınan eşyalar (baklava tepsisi, çay tepsisi, tabaklar, lokum kutusu, şeker kâsesi, harçlık, lokum tabağı, tek lokum). |

### Karakterlerin boyları

| Karakter | Yaş | Sayfa birimi |
|---|---|---|
| Can | 5 | 0,34 |
| Elif | 8 | 0,395 |
| Maya | 8 | 0,40 |
| Anne / Ayşe Teyze / Babaanne | yetişkin | 0,50 / 0,49 / 0,49 |
| Baba / Dede | yetişkin | 0,55 / 0,525 |

Boylar her sayfada aynıdır; yüz ve kıyafet aynı modelden geldiği için sahneler boyunca değişmez.

## 4. Sayfaya karakter eklemek

`book.json` içinde bir sayfaya üç alan eklenir:

```json
"cast": [
  { "id": "elif", "x": 0.068, "z": 0.646, "y": 0.14, "rotY": -60, "pose": "lying", "lie": 1, "eyes": 0 },
  { "id": "anne", "x": -0.33, "z": 0.5, "rotY": 12, "hold": "baklavaTepsisi", "pose": "hold" }
],
"spots": { "pencere": [0, 0.5, 0.04] },
"beats": [
  { "cue": ["günaydın", "uyand"], "who": "elif", "do": "wake", "focus": true, "look": "up" },
  { "cue": ["pencere", "güneş"], "who": "elif", "do": "lookAround", "target": "pencere", "focus": true },
  { "cue": ["fırladı"], "who": "elif", "do": "hopOut", "to": [-0.28, -0.14, 0.01], "face": 0, "look": "reader" }
]
```

- **cast**: sayfadaki karakterler ve başlangıç durumları (`pose`, yatıyorsa `lie: 1`, gözler kapalıysa `eyes: 0`, elinde bir şey varsa `hold`). `screen: true` olan karakterler tabletin ekranında görüntülü konuşmada görünür.
- **spots**: bakılacak ya da gidilecek adlandırılmış yerler.
- **beats**: hikâye sırasıyla hareketler. `cue` kelime köklerinden biri metinde geçince hareket başlar (üç okuma seviyesinin hepsinde çalışsın diye birden çok kök yazılır). `optional: true` olan hareket, o seviyenin metninde kelime yoksa atlanır.
  - `look` / `target`: başka bir karakter (`"elif"`), bir yer (`"pencere"`), sayfadaki bir modelin kelimesi (`"kedi"`), `"reader"` (okuyucuya bakar), `"up"`, `"left"`, `"right"`, `"down"`.
  - `focus: true`: o karakter konuşuyor ya da anlatımda sözü ediliyor demektir; kamera ona yumuşakça yönelir, diğerleri görünür kalır.
  - `to`: yürüme veya inme için başlangıç yerine göre [x, y, z] farkı; `face`: sonunda bakılan yön (derece).
  - `len`: konuşma, gösterme gibi hareketlerin süresi (saniye).

Aynı karakterin hareketleri sırayla oynar; yalnızca bakma hareketleri (`lookAt`, `lookAround`) başka bir hareketle aynı anda olabilir.

## 5. Okuyucuyla bağlantı

- **Sesli okuma**: hareketler anlatıcının okuduğu kelimeye göre başlar. Ses yoksa sayfa, okuma hızına göre kendi kendine oynar.
- **Duraklat**: anlatım durunca karakterler de olduğu yerde durur, kamera kıpırdamaz.
- **İleri / geri**: sayfaya her dönüldüğünde karakterler başlangıç durumuna (yatakta uyuyan Elif gibi) döner, yere bırakılan eşyalar kaldırılır.
- **Tekrar oynat** düğmesi sayfanın sahnesini baştan oynatır.
- **Sakin hareket** ayarı (ya da cihazdaki "hareketi azalt" tercihi): adım, baş sallama, zıplama gibi ara hareketler atlanır, değişimler kısa ve yumuşak geçişle olur, kamera sabit kalır.
- **Yüklenirken**: karakterler gelene kadar "Karakterler sahneye geliyor… 2/4" yazısı görünür.

## 6. Sınırlar ve öneriler

- **Yüz ifadesi ve dudak senkronu yok.** Modellerde blendshape olmadığı için ağız açılıp kapanmaz, gülümseme değişmez. Konuşma; öne küçük bir adım, el açma ve baş sallama ile gösterilir. İstenirse Meshy/Blender'da ağız ve göz için birkaç blendshape (`mouthOpen`, `smile`, `blink`) eklenip `performer.ts`'e bağlanabilir.
- **İskelet otomatik kuruldu.** Elle yapılmış bir iskelet kadar temiz değildir: çok uç pozlarda (kolları başın arkasına götürmek gibi) dirsek ve omuzda hafif ezilme görülebilir. Hareketler bu yüzden sakin ve orta açılarda tutuldu. Daha temiz sonuç için modeller Mixamo veya Meshy'nin "rig" özelliğiyle iskeletlendirilip aynı kemik adlarıyla verilebilir; kod değişmeden çalışır (kemik adları bölüm 2'de).
- **Parmaklar tek parça.** Eller açılıp kapanmaz; tutma ve el öpme kol ve bilekle gösterilir.
- **Karagöz** bu kitapta kullanılmadı.

## 7. Masal karakterleri (2. ve 3. kitap): oyuncak gibi oynayanlar

Ekim 2026'da gelen dokuz masal karakteri **iskeletsiz** kullanılır: modelin kendisi hiç bükülmez, bir çocuğun elindeki oyuncak figür gibi bütün hâlinde zıplar, döner, öne eğilir, yana sallanır, basılıp esner (squash & stretch). Otomatik iskeletle kollar ve kıyafetler eğri büküldüğü için bu yol seçildi; sonuç daha temiz ve "pop-up kitap" hissine daha uygun. Dosyalar `public/models/masal/` klasöründe, gelen hâliyle (yalnızca doku küçültüldü).

Bir kitabı bu kipe almak için `book.json` içine `"toyCast": true` yazılır. O kitapta aile karakterleri de (Dede, Anne, Elif, Can) aynı şekilde oynar: kemikli modelleri bir kez rahat duruşa (kollar aşağıda) getirilir, sonra yalnızca bütün olarak hareket eder. 1. kitap (Bayram Sabahı) eskisi gibi kemikli oynar.

| Kitap | Karakter | id | Boy (sayfa birimi) |
|---|---|---|---|
| Nasreddin Hoca ve Kazan | Nasreddin Hoca | `hoca` | 0,53 |
| | Komşu | `komsu` | 0,52 |
| | Akşehirli Teyze | `aksehirli-teyze` | 0,47 |
| | Pazarcı Amca | `pazarci` | 0,53 |
| Keloğlan ve Üç Tohum | Keloğlan | `keloglan` | 0,45 |
| | Keloğlan'ın anası | `keloglan-anasi` | 0,47 |
| | Hasan Amca | `hasan-amca` | 0,49 |
| | Köylü çocuk | `koylu-cocuk` | 0,34 |
| | Köylü kadın | `koylu-kadin` | 0,47 |

**Oyuncak hareketleri** (`src/three/toy.ts` → TOY_ACTS; beat'lerde `do` ile yazılır):

| do | Ne yapar |
|---|---|
| `hop` | Yerinde küçük, sevinçli bir zıplama |
| `walkTo` | `to` noktasına küçük zıplamalarla gider, sonra `face` yönüne döner |
| `talk` | Dinleyene eğilir, konuşur gibi hafifçe sallanır |
| `nod` / `bow` | Başını sallar / öne eğilir (üzgün, teşekkür, saygı) |
| `cheer` | İki büyük zıplama, ikincisinde tam tur |
| `wave` | Sağa sola sallanıp zıplayarak selam verir |
| `point` / `angry` | Bir şeye doğru eğilir / öfkeyle tepinir |
| `knock` | Kapıya doğru iki kez eğilir |
| `turn` / `spin` | Zıplayarak döner / tam tur atar |
| `give` / `receive` | Elindekini verir / alır: eşya bir yay çizerek, yıldız izi bırakarak öbürüne uçar |
| `offer` / `put` / `hug` / `rest` | Uzatır / yere bırakır / sarılır / dik durur |

Elde tutulan eşyalar (`kazan`, `tencere`, `tohum`, `kova`, `sebze`; three/props.ts → HELD) büyükse göğsün önünde, küçükse sağ elin yanında süzülür. Kimse vermeden alınan bir eşya ışıltıyla belirir.

Beat'e `wait` (saniye) eklenirse hareket ipucu kelimesinden o kadar sonra başlar; filizlerin sırayla çıkması böyle yapılır.

### Masalsı nesneler

Sayfa modellerinden `id` verilenler hikâyeye katılır; `"magic": true` olanların arkasında altın bir hale parlar, ara ara pırıldar, hareket ederken yıldız izi bırakır. Kullanılan hareketler (`src/three/acts.ts` → THING_ACTS): `appear` (büyüyerek, parlayarak belirir), `vanish`, `rise` (`to` noktasına süzülür; `from` ile gökten iner), `sink` (toprağa gömülür), `ring` (titrer), `shine` (parlar), `grow` (topraktan büyüyerek çıkar), `rain` (bulut `len` saniye yağmur yağdırır), `spin`. `focus: true` kamerayı o nesneye yaklaştırır.

2. kitapta: hikâye başlarken çay masasının üstünde beliren küçük kazan, Hoca'nın aklındaki pilav ve kazan, kazandan "doğan" tencere, "ölünce" göğe süzülen kazan, pazarda dönen kazan ile yavrusu. 3. kitapta: Anne masala başlarken topraktan yükselen ışıklı tohum, saman, toprağa gömülen tohumlar, sırayla çıkan filizler, Hasan Amca'nın tarlasında paylaşınca çıkan filizler, yağmur yağdıran bulut ve ardından büyüyen sebzeler, gökten düşen üç elma.
