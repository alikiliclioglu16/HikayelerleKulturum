# 15 Kitaplık Plan

Hedef kitle: ABD'de yaşayan, 4–11 yaş arası, Türkçe öğrenen çift dilli çocuklar.
Her kitap: 8 sayfa, tek tam metin (4–11 yaş), İngilizce çeviri, "Biliyor musun?" kültür notları, sözlük, 5 soruluk yarışma, değer avı ve aile köşesi.

Kitaplar aynı ailenin hikâyesini sürdürür (Elif, Can, anne, baba, İzmir'deki babaanne ve dede). Masal kitaplarında (Nasreddin Hoca, Keloğlan, Karagöz) bu aile hikâyeyi bir kitaptan okur ya da dededen dinler; böylece seri bir bütün olur.

## Maarif değerlerinin dağılımı

20 değerin hepsi en az bir kitapta ana değer olarak işlenir.

| Değer | Kitaplar |
|---|---|
| Saygı | 1, 11, 13 |
| Sorumluluk | 9 |
| Adalet | 1, 2, 11 |
| Tasarruf | 6, 15 |
| Sabır | 3, 5, 9, 11, 14 |
| Mahremiyet | 13 |
| Mütevazılık | 10 |
| Sağlıklı yaşam | 3, 14 |
| Çalışkanlık | 3, 12 |
| Sevgi | 4 |
| Dostluk | 1, 10, 14 |
| Özgürlük | 4 |
| Dürüstlük | 2, 15 |
| Vatanseverlik | 4, 15 |
| Yardımseverlik | 6, 12, 13 |
| Aile bütünlüğü | 1, 12 |
| Temizlik | 8 |
| Duyarlılık | 7 |
| Estetik | 5 |
| Merhamet | 7, 8 |

## Kitaplar

Model adları gönderilen pakettekilerdir (`GLB'ler/…`). "Kenney" kitleri CC0 lisanslıdır (serbestçe kullanılabilir).

### 1. Bayram Sabahı (hazır)
- **Kültür:** Ramazan Bayramı, bayramlık, el öpme, harçlık, bayram şekeri.
- **Değerler:** saygı, aile bütünlüğü, adalet, dostluk.
- **3D:** her sayfada: halı, saksı, hediye kutusu, yastık, sofra üstünde baklava, çaydanlık ve çay, simit, kâse, sallanan ağaç; kapıda oturan kedi, odada gezinen kedi, bahçede koşturan köpek. Masada çaydanlık, çay, baklava, dondurma.

### 2. Nasreddin Hoca ve Kazan (hazır)
- **Kültür:** Nasreddin Hoca fıkraları, Akşehir, mizahla düşünmek.
- **Konu:** Hoca komşusundan kazan ödünç alır, içine küçük bir tencere koyup "Kazanınız doğurdu" der. Bir dahaki sefere "Kazanınız öldü" deyince komşu itiraz eder. Elif ile Can, dedeleriyle bu fıkrayı konuşup adaletin iki yönlü olduğunu fark eder.
- **Değerler:** adalet, dürüstlük.
- **3D (kullanıldı):** Nasreddin Hoca (yürür, bekler), komşu `npc_featured_craftsman_male` (konuşur, şaşırır), pazardaki yolcu `npc_featured_traveler` (konuşur), bakır renge boyanmış Kenney `pot` (kazan ve yavru tencere, titrer), Fantasy Town `tree-high-round` (sallanır), `fountain-round`, `stall-red`, `stall-green`, `cart`, `fence`, `lantern`; Food `watermelon`, `grapes`, `eggplant`, `tomato`; Furniture `rugRound`, `tableCoffee`, `pottedPlant`, `books`; yürüyen sokak kedisi, köpek; masada çaydanlık, çay, kahve, simit.
- **Sahne yapısı:** Arkada kodla çizilmiş Akşehir (Sultan Dağları, Akşehir Gölü, minareler), önde 3D oyuncular. Çerçeve hikâyede (1. ve 8. sayfa) Dede, Elif ve Can sedirde.

### 3. Keloğlan ve Üç Tohum (hazır)
- **Kültür:** Keloğlan masalları, Anadolu köyü, toprak ve hasat.
- **Konu:** Annesinin verdiği üç tohumu sabırla eken Keloğlan, kuraklıkta suyu paylaşır ve bütün köye bereket getirir.
- **Değerler:** çalışkanlık, sabır, sağlıklı yaşam.
- **Çerçeve:** Elif ile Can Amerika'daki bahçelerine tohum eker; Anne masalı anlatır; sonda filizler çıkar ve çoban salatası yapılır.
- **3D (kullanıldı):** Keloğlan (su taşırken yürür, yağmurda koşar), Hasan Amca ve köylü (konuşur, üzülür), büyüyen filizler, mısır, lahana, havuç, kabak, domates; çapa, kürek, kova, kaya, çit, kuru ve yeşil ağaçlar, sebze arabası, tezgâh; bahçede gezen kedi ve köpek.

### 4. 23 Nisan Şenliği
- **Kültür:** Ulusal Egemenlik ve Çocuk Bayramı, dünyanın dört bir yanından çocuklar, bayrak, şiir.
- **Konu:** Elif'in Amerika'daki okulunda 23 Nisan için uluslararası bir şenlik hazırlanır; her çocuk kendi dilinde bir söz öğretir.
- **Değerler:** sevgi, vatanseverlik, özgürlük.
- **3D:** Mini Skate `character-skate-boy`, `character-skate-girl` (sınıf arkadaşları), Fantasy Town `banner-red`, Holiday `lights-red`, `present-a-cube`. Rafta Türk bayrağı.

### 5. Ebru'nun Renkleri
- **Kültür:** ebru sanatı, sabırla çalışmak, lale ve karanfil desenleri.
- **Konu:** Can dedesinin atölyesinde ilk ebrusunu yapar; boya batınca yeniden dener.
- **Değerler:** estetik, sabır.
- **3D:** usta için `npc/npc_featured_craftsman_male`, Furniture `table`, `bookcaseOpen`, `lampSquareTable`. Rafta ebru.

### 6. Mahalle Fırını
- **Kültür:** mahalle fırını, sıcak simit, askıda ekmek geleneği.
- **Konu:** Fırıncı Ali Amca bayat ekmeği atmaz, ekmek tatlısı yapar; çocuklar "askıda ekmek" ile ihtiyacı olana yardım etmeyi öğrenir.
- **Değerler:** tasarruf, yardımseverlik.
- **3D:** fırıncı `npc/npc_featured_craftsman_male`, Mini Market `display-bread`, Food `bread`, `loaf`, `loaf-round`, `rollingPin`; Fantasy Town `stall-red`; sokak kedisi ve köpeği. Rafta simit.

### 7. Kapadokya'nın Güzel Atları
- **Kültür:** Kapadokya ("güzel atlar diyarı"), peri bacaları, sıcak hava balonları, yer altı şehirleri.
- **Konu:** Zeynep peri bacaları arasında yaralı bir tay bulur; balonlar havalanırken ona su ve gölge bulur.
- **Değerler:** duyarlılık, merhamet.
- **3D:** `props/kit_anatolian_horse` (at), `props/kit_deer`, Modular Cave `gate-rock`, `room-small` (yer altı şehri), Survival `rock-sand-a/b/c`. Rafta peri bacası ve balon.

### 8. Martı ile Simit
- **Kültür:** İstanbul vapurları, martılar, Kız Kulesi, Boğaz.
- **Konu:** Vapurda simit isteyen bir martı. Can simidini paylaşır, Elif denize atılan çöpleri görüp kardeşiyle denizi temiz tutmaya söz verir.
- **Değerler:** temizlik, merhamet.
- **3D:** `props/kit_gull` (uçan martı; lisansı kontrol edilmeli, aşağıya bakın), Survival `fish`, `bucket`, Train kit yerine vapur için basit model. Rafta Kız Kulesi ve simit.

### 9. Davulcu Dede
- **Kültür:** Ramazan davulcusu, sahur, mani söyleme, iftar sofrası.
- **Konu:** Yaşlanan davulcu dede bu yıl yardımcı arar; Can her gece erkenden kalkıp fener taşır.
- **Değerler:** sorumluluk, sabır.
- **3D:** davulcu için `npc/npc_featured_traveler` (konuşma animasyonu), Fantasy Town `lantern`, `wall-window-shutters`, `roof`; Holiday `lantern-hanging`. Rafta davul.

### 10. Karagöz ile Hacivat'ın Gölgesi
- **Kültür:** gölge oyunu, Bursa, Karagöz ile Hacivat'ın atışmaları.
- **Konu:** Çok bilmiş Hacivat ile her şeyi yanlış anlayan Karagöz bir türlü anlaşamaz; sonunda ikisi de birbirinden bir şey öğrenir.
- **Değerler:** dostluk, mütevazılık.
- **3D:** rafta Karagöz perdesi; sahneler kâğıt kesik (gölge oyunu tekniğine uygun), ışık için Fantasy Town `lantern`.

### 11. Mangala Turnuvası
- **Kültür:** mangala, zekâ ve strateji oyunları.
- **Konu:** Can ilk turnuvasında kaybeder, rakibini tebrik etmeyi ve tekrar çalışmayı öğrenir.
- **Değerler:** adalet, saygı, sabır.
- **3D:** Furniture `table`, `chair`, `chairCushion`; sınıf arkadaşları Mini Skate karakterleri. Rafta mangala.

### 12. Dedemin Köyünde İmece
- **Kültür:** imece, köy hayatı, hasat, değirmen, tandır.
- **Konu:** Bütün köy bir komşunun ekinini toplar; Elif değirmene un taşır, akşam herkes birlikte yemek yer.
- **Değerler:** yardımseverlik, çalışkanlık, aile bütünlüğü.
- **3D:** `props/kit_anatolian_horse`, Fantasy Town `watermill`, `windmill`, `cart`, `fence`; Survival `barrel`, `resource-wood`, `tool-axe`; Food `bread`, `bowl-soup`.

### 13. Kapıdaki Yolcu
- **Kültür:** Türk misafirperverliği, "Tanrı misafiri", ayakkabıları kapıda çıkarmak, kapıyı çalıp izin istemek.
- **Konu:** Yorgun bir yolcu kapıyı çalar. Aile onu ağırlar; Can da odasına girmeden önce kapıyı çalmayı öğrenir.
- **Değerler:** mahremiyet, yardımseverlik, saygı.
- **3D:** `npc/npc_featured_traveler`, Furniture `loungeSofa`, `rugRound`, `tableCoffee`, `doorwayOpen`; Food `bowl-soup`, `bread`, `cup-tea`.

### 14. Doğu Ekspresi ile Kars'a
- **Kültür:** Doğu Ekspresi, Kars, kar, kızak, sahlep, Ani harabeleri.
- **Konu:** Uzun tren yolculuğunda Elif ile Can kompartımandaki bir çocukla arkadaş olur; Kars'ta kızak kayıp sahlep içerler.
- **Değerler:** sağlıklı yaşam, sabır, dostluk.
- **3D:** Train kit `train-locomotive-a`, `train-carriage-*`, `railroad-straight`; Holiday kit `sled`, `snowman`, `tree-snow-a/b/c`, `cabin-*`, `snow-pile`, `rocks-large`. (Noel ve Hanuka objeleri bu kitapta kullanılmayacak.)

### 15. Türk Marketinde Bir Gün
- **Kültür:** ABD'deki Türk marketleri, tanıdık ürünler, alışverişte Türkçe konuşmak.
- **Konu:** Elif alışveriş listesiyle markete gider; kasiyer fazla para üstü verince bunu söyler. Teşekkür olarak bir kutu lokum kazanır.
- **Değerler:** tasarruf, dürüstlük, vatanseverlik.
- **3D:** Mini Market kitinin tamamı (`cash-register`, `shelf-boxes`, `display-fruit`, `shopping-basket`, `shopping-cart`, `character-employee`); Food `cheese`, `bread`, `tomato`, `honey`. Rafta lokum, çay.

## Ana sayfada kullanılanlar

- Nasreddin Hoca ve Keloğlan kendi kitaplarının yanında duruyor (bekleme animasyonu). Dokununca seslenip kitabı açıyorlar.
- Sokak kedisi ara sıra büfenin önünden yürüyerek geçiyor; dokununca miyavlıyor ve "kedi" kelimesi sandığa ekleniyor.

## Kullanılmayanlar ve nedenleri

- Holiday kit içindeki Noel ağacı, Noel çorabı, ren geyiği, Hanuka ve Kwanzaa objeleri: kitapların kültürel odağı dışında.
- Food kit içindeki domuz eti ürünleri (`bacon`, `whole-ham`, `hot-dog`, `sausage` vb.) ve şarap şişeleri: içerik açısından uygun değil.
- `npc_featured_soldier` (yay ve okla asker): çocuk kitaplarında gerek yok.
- Mini Skate rampa parçaları ve Train kit ray parçalarının çoğu: sahnelerde birkaç parça yeterli.

## Lisans notları

- **Kenney kitleri** (Fantasy Town, Food, Furniture, Holiday, Mini Market, Modular Cave, Survival, Train, Mini Forest, Mini Skate): CC0, atıf gerekmez, ticari kullanım serbest.
- **heroes/** ve **npc/** karakterleri ile **props/** hayvanları: Kaynağı paketten anlaşılmıyor. Kendiniz Meshy gibi bir araçla ürettiyseniz ücretli plan koşullarına göre kullanılabilir. Başka bir siteden indirildiyse lisansını kontrol edin.
- **props/kit_gull** (martı): Sketchfab'den geldiği görülüyor (`Sketchfab_Scene`). Yayına almadan önce modelin Sketchfab sayfasındaki lisansı kontrol edilmeli; CC BY ise kredilerde yazara atıf verilmeli.
