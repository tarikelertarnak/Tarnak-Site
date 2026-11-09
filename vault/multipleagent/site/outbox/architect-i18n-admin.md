---
summary: Hero metin alanlarina dil-basina deger + admin'de yaninda dil secici. Karar - content.json'a OPSIYONEL `hero.i18n` blogu (B secenegi reddedildi, C gereksiz), zod'a eklenir YOKSA her kaydetmede silinir. Once admin `i18n[locale]`, sonra duz string TR, sonra xxContentOverlay. Overlay'ler SADECE FALLBACK kalir; build-embedded oldugu icin admin degeri ONCE okunur. Hepsi-tek "Kaydet" ayni POST /api/admin/content. UI - mevcut BilingualField genellestirilir (yeni bilesen yazilmaz). Kritik uyari - sunucu prerender'da hero HIC yerelleştirilmiyor (overlay server-only), yani bu ozellik istemci hidrasyonu olmadan gorunmez; secenek (A) hero'yu client bilesene cevir veya (B) bilincli kabul.
---

# Architect — Admin i18n (Hero alanlarına dil-başına değer + dil seçici)

**Tarih:** 2026-10-20 · **Durum:** TASARIM (kod yok) · **Kapsam:** `site/` · **Güven:** YÜKSEK (tüm ilgili dosyalar ölçüldü)

---

## 0. Önce: ÖLÇÜLEN GERÇEKLER (tasarımın temeli)

Bunlar varsayım değil, koddan okundu:

1. **`content.json` hero alanları düz string.** `data/content.json:2-9` → `tagline`, `exploreLabel`, `connectLabel`, `emoji` hepsi tek değer (TR). `SiteContent['hero']` `src/lib/content.ts:232-242`'de düz `string`.
2. **8 overlay dosyası build'e gömülü .ts.** `src/lib/i18n-content-{en,de,es,fr,ja,pt,ru}.ts` her biri `DeepPartial<SiteContent>`. `i18n-server.ts:79-87` `contentOverlays` map'i bunları **sunucuda** merge eder (`localizeContent`, satır 90-93).
3. **`i18n-content-tr.ts` ÖLÜ KOD.** `trContentOverlay` hiçbir yerden import EDİLMİYOR (grep: 0 import). `contentOverlays`'te `tr` yok — TR zaten base. Yani tr overlay dosyası işlevsiz duruyor.
4. **Sunucu prerender'da locale sabit 'tr'.** `getStaticLocale()` `'tr'` döner (`i18n-server.ts:129`), `getStaticLocalizedContent()` (satır 131-134) → `localizeContent(content, 'tr')` → overlay YOK → **prerender edilen HTML her zaman TR base içerik**. `(public)/page.tsx:26` `force-static`, satır 30 `getStaticLocalizedContent()`.
5. **İstemci içeriği YENİDEN YERELLEŞTİRMİYOR.** `LocaleProvider` (`locale-provider.tsx`) sadece `lang`/`dir` ve `useT()` sözlüğünü çevirir. `HeroSection` (`hero-section.tsx:52`) `content.hero`'yu server prop'tan okur, `useLocale()` bile çağırmaz. `Footer` de öyle (`footer.tsx:80`). → **Public sitede hero tagline/buton yazıları dil değişince DEĞİŞMEZ, her zaman TR kalır** (searcher envanteri satır 33 bunu bağımsız doğruluyor: sunucu içeriği istemcide geri çevrilmiyor).
6. **İçerik kaynağı zinciri:** `getContent()` (`content.ts:495`) → Supabase `site_content` (id='main'), yoksa `data/content.json` (gömülü). `saveContent` (`content.ts:730`) Supabase-first, disk fallback. **`public.site_content` tablosu canlıda YOK** (AGENTS.md §12, 2026-10-17) → şu an yazım diske düşer ve Workers'ta EROFS → **admin kayıtları pratikte kalıcı değil**. Bu, i18n işinden bağımsız mevcut bir engel.
7. **zod 4 tuzağı:** `contentSchema` (`validations.ts:169-284`) `z.object` → bilinmeyen anahtarı SESSİZCE SİLER. Test kanıtı: `validations.test.ts:91-100` (`bilinmeyen alanlari sessizce dusurur`) + satır 117-130 (social label/value regresyonu). Yeni alan şemaya yazılmazsa **her kaydetmede yok olur**.
8. **Projede ZATEN çok-dilli içerik örneği var:** `aboutPage` (`about-page.ts`) → `bilingualSchema = { tr, en }`, `aboutPageSchema`, `pickLocalized(value, locale)` (satır 132-140: "yalnız `en` ayrı dil, diğerleri tr'ye düşer"), admin `BilingualField` (`about-page-editor.tsx:109-154`). **Bu, tasarımın en güçlü precedan'ı.**
9. **Hazır combobox:** `src/components/ui/searchable-combobox.tsx` — `searchText` prop'u ile arama, single-select destekli, portal + popover konumlama. Ama `label: ReactNode` + `selected: string[]` API'si.
10. **Admin kaydetme tek uç:** `POST /api/admin/content` (`route.ts:36`) → `contentSchema.safeParse` → `saveContent` → `revalidatePath('/', 'layout')`. `setHero` (`admin-panel.tsx:221-223`) alan-başına yazar, tek `save()` hepsini POST'lar.

---

## 1. SORU-1: Veri modeli — NEREDE tutulmalı?

### Seçenek (a) — `hero.i18n: { tagline: { tr, en, de... }, ... }` (ÖNERİLEN)
`content.json`'a OPSİYONEL yeni blok:
```jsonc
"hero": {
  "tagline": "Yazılımcı & Sistem Mimarı",     // TR base — AYNEN KALIR (geriye uyum)
  "exploreLabel": "Projeleri Keşfet",
  "i18n": {                                    // YENİ, opsiyonel
    "tagline":      { "tr": "", "en": "Programmer & Vibe Coder", "de": "..." },
    "exploreLabel": { "tr": "", "en": "Explore Projects",        "de": "..." },
    "connectLabel": { "tr": "", "en": "Get in Touch",            "de": "..." },
    "emoji":        { "tr": "", "en": "🚀",                       "de": "🚀" }
  }
}
```
- **Geriye uyumluluk: TAM.** Düz alanlar (`hero.tagline` vb.) SİLİNMEZ, yerinde kalır. `i18n` yoksa hiçbir şey değişmez — mevcut kayıtlar aynen çalışır.
- **Overlay'lerle çatışma:** YOK. Overlay'ler hâlâ `hero.tagline`'ı ezer (düz alan), `i18n`'e dokunmaz. Çakışma sırası §2'de.
- **zod:** `hero` şemasına `i18n: heroI18nSchema.optional()` eklenir. **ZORUNLU** (yoksa tuzağa düşer).
- **8 overlay dosyası:** HİÇBİRİ DEĞİŞMEZ. Overlay'ler fallback rolüne geçer (§3).

### Seçenek (b) — `content.locales: { tr: {...}, en: {...} }` üst-düzey blok
Tüm içeriğin dil-başına kopyasını tutar.
- **Geriye uyumluluk: KÖTÜ.** Var olan tek-kaynak (content.json + overlay) modeliyle ikinci bir paralel gerçek yaratır. Admin her alanı 8 dile elle girmeye zorlanır (ölçeklenmez).
- **Overlay çatışması: YÜKSEK.** `locales.en.hero.tagline` vs `enContentOverlay.hero.tagline` — hangisi kazanır belirsizleşir; her alan için override mantığı ikiye bölünür.
- **zod:** Kök şemaya yeni bir dal → tüm içerik şemasının türevi.
- **Reddedildi: gereksiz büyük, mevcut mimariyi ihlal eder.**

### Seçenek (c) — Supabase'e ayrı tablo (`hero_i18n`)
- **Reddedildi.** (1) `public.site_content` tablosu ZATEN YOK (§0.6) → yeni tablo daha da kalıcılık sorunu demek. (2) `getContent()` zaten tek JSON blob okuyor; ikinci tablo = ikinci sorgu + join mantığı = Workers CPU + karmaşıklık. (3) Migration elle çalıştırma gerekiyor (AGENTS.md §12). (4) Ponytail: en küçük diff zaten (a)'da var.

### ✅ KARAR-1: Seçenek (a). `content.hero.i18n` = OPSİYONEL blok.
**Gerekçe:** tek kaynak (content.json/Supabase) korunur, geriye uyum tam, overlay'ler değişmez, zod değişikliği 4 satır, `aboutPage` precedan'ıyla tutarlı (sadece 2 dil yerine N dil). Sadece hero alt kümesi için kapsam dar tutulur (§3).

---

## 2. SORU-2: Öncelik (override) sırası

Bir değeri okurken (locale = `L`):
```
1. content.hero.i18n[alan][L]     ← ADMIN'in girdiği, o dile ÖZEL değer (varsa ve boş değilse)  ★ KAZANIR
2. content.hero[alan]             ← TR base düz alan (L='tr' ise veya i18n boşsa)
3. xxContentOverlay.hero[alan]    ← build'de gömülü FALLBACK (yalnız L≠tr ve üstteki ikisi de boşsa)
4. ""                             ← hiçbiri yoksa BOŞ kalır (uydurma YOK)
```

**Kullanıcı senaryosu:** admin TR+EN+DE girdi, `enContentOverlay`'de de `hero.tagline = 'Programmer & Vibe Coder'` var.
- `L='en'` → admin `i18n.tagline.en` doluysa **admin kazanır**. Overlay ezilir. ✅ (Kullanıcının istediği: "ben girdiğim değer geçerli olsun".)
- `L='en'`, admin en'i BOŞ bıraktıysa → overlay değeri görünür (fallback çalışır, site boş kalmaz). ✅
- `L='tr'` → `i18n.tagline.tr` doluysa o; boşsa düz `hero.tagline` (base). ✅
- **Admin HİÇ girmemişse** (i18n yok/boş) → davranış BUGÜNKÜYLE AYNEN: TR base + overlay. ✅ **Sıfır regresyon.**

**Merge implementasyonu nerede:** `localizeContent()` (`i18n-server.ts:90`) tek yer. Sıra: önce base üzerine overlay merge (§5 mevcut `mergeContent`), SONRA admin `i18n[locale]` override'ı uygulanır (boş olmayanlar). Böylece admin >> overlay garantilenir. Fonksiyon imzası değişmez, gövdesine ~10 satır eklenir.

**Not (bilinçli):** Bu sıra, mevcut `aboutPage.pickLocalized` mantığıyla aynı felsefede ("dolu olan kazanır, boşsa düş"). Tutarlılık korunur.

---

## 3. SORU-3: Build-embedded overlay'lerle ilişki (asıl mimari karar)

### Çelişki var mı? EVET, ama çözülebilir.
Overlay'ler `.ts` ve Workers'ta runtime'da yazılamaz. Admin kaydetse bile overlay dosyası değişmez. Eğer overlay "kazanan" olursa admin düzenlemesi görünmez → kullanıcının şikâyeti. Çözüm: **ROL DEĞİŞİMİ.**

### ✅ KARAR-3: Overlay = SADECE FALLBACK. Admin değeri ÖNCE okunur.
- **Overlay'leri SİLME** (hepsini veya hero kısmını). 8 dil için yüzlerce satır (about, blog, nav…) taşıyorlar; bunları silmek devasa diff + mevcut davranış kaybı. Ayrıca hero dışındaki alanlar (about, nav, contact…) bu işin KAPSAMI DIŞINDA — onlara dokunulmaz.
- Overlay yalnızca admin o alanı o dile girmemişse devreye girer (§2 sırası). Yani "fabrika çevirisi" işlevini korur, admin üstüne yazar.
- **Kapsam: SADECE hero'nun 4 alanı** (`tagline`, `exploreLabel`, `connectLabel`, `emoji`). Diğer tüm içerik alanları (about/nav/contact/…) şimdilik dokunulmaz — kullanıcı "bu olayı her yere entegre et" dese de, bu ancak hero mekanizması kanıtlandıktan sonra aynı kalıpla genişletilir (§5 implementasyon sırası, Faz 4). Ponytail: önce bir alan seti çalışsın.

### ⚠️ KRİTİK UYARI (bu tasarımın en önemli bulgusu)
Overlay'ler **sunucu-only** (`i18n-server.ts`). Public sayfalar `force-static` → sunucu locale hep 'tr'. İstemci içeriği yeniden yerelleştirmiyor (§0.5). **Sonuç:** admin EN/DE girip kaydetse bile, public sitede bugün bu değerler GÖRÜNMEZ — çünkü:
1. Prerender HTML daima TR base basar (overlay zaten uygulanmıyor, `tr`).
2. İstemci EN'e geçse de `HeroSection` server prop'u kullanır, yeniden okumaz.

Yani **veri modeli + admin UI doğru kurulsa bile özellik uçtan uca ÇALIŞMAZ.** Bu, mevcut mimarinin (1102 CPU korumasının) bilinçli bedeli.

**Çözüm seçenekleri (CEO kararı gerekir — §4'te açık soru):**
- **Seçenek A (doğru, biraz daha iş):** `HeroSection`'ı istemci-tarafı yeniden yerelleştirecek şekilde güncelle: `locale` değişince `i18n[locale]` (ve overlay) değerini seç. Overlay'i client'a taşımak CPU/JS maliyeti değil (statik veri, tree-shake). `about-page-view.tsx` ZATEN bu modeli yapıyor (`'use client'` + `pickLocalized`) → **aynı kalıp kullanılabilir, yeni mimari değil.** Bu işin doğal parçası; aksi halde admin emeği boşa gider.
- **Seçenek B (kabul):** Sadece TR base + admin i18n verisini sakla; public görünürlük ayrı bir iş. Kullanıcının şikâyeti ASLA çözülmez → reddedilmeli.

**✅ Öneri:** Seçenek A. Hero'yu (yalnızca ilgili alanları) client-side yerelleştirmeye geçir. `aboutPage` kanıtı bunun bu kod tabanında çalıştığını gösteriyor. Bu, tasarımın ayrılmaz parçasıdır; aksi halde "kaydedildi" der ama site değişmez (sessiz aldatma — AGENTS.md §11.2 ruhuna aykırı).

---

## 4. SORU-4: Kaydetme akışı / API kontratı

### ✅ KARAR-4: AYNI uç (`POST /api/admin/content`), payload'a `hero.i18n` eklenir. Yeni uç YOK.
**Gerekçe:** (1) `setHero` zaten alan-başına state yazıyor, tek `save()` hepsini gönderiyor → kullanıcının "TR gir, EN gir, DE gir, Kaydet" akışı BUGÜNKÜ akışla birebir. (2) Yeni uç = yeni dinamik rota = Workers CPU + rate-limit + auth tekrarı. Ponytail: mevcut ucu genişlet.

**Payload (değişmez, sadece `hero.i18n` derinliği artar):**
```jsonc
{ "hero": { "name": "...", "tagline": "...", ..., "emoji": "",
            "stats": [...],
            "i18n": { "tagline": {"tr":"","en":"...","de":"..."},
                      "exploreLabel": {...}, "connectLabel": {...}, "emoji": {...} } },
  "nav": {...}, ... }
```
Sunucu tarafı (`route.ts`) değişikliği: `contentToSave.hero` şu an spread ile geçiyor (`...parsed.data`); `hero.i18n` şemada olduğu için otomatik akar. **AMA** `route.ts:89-90` deseni gereği, güvenlik için: `i18n` istemci göndermezse mevcut değeri koru → `i18n: parsed.data.hero.i18n ?? current.hero.i18n`. (Küçük ekleme, sessiz veri kaybı önlemi.)

**Doğrulama:** `heroI18nSchema.safeParse` zaten `contentSchema` içinde `hero` parçası olarak çalışır — ekstra blok gerekmez.

**Boş değer davranışı:** Kural "boşken boş kalır". `i18n[alan][dil] = ""` → o dil için fallback'e (§2 sırası) düşer; uydurma YOK.

---

## 5. SORU-5: UI bileşeni — combobox + input

### ✅ KARAR-5: Yeni bileşen YAZMA. `BilingualField`'ı N-dil'e genelleştir.
`about-page-editor.tsx:109-154` zaten "etiket + dil seçici + input" fikrinin var olduğu yer (TR/EN yan yana). Ama:
- `SearchableCombobox` hero için FAZLA: `selected: string[]`, `onClear`, `multiple`, `showAllOption`, badge — dil seçimi için hepsi gereksiz. Ayrıca `label: ReactNode` + portal; hero'da alan-başı tek küçük "dil" seçici yeterli.
- Mevcut `BilingualField` 2 dili sabit yan yana gösterir; kullanıcının istediği **tek input + yanda değişen dil** (combobox). Bu, BilingualField'ın "yan yana TR/EN" mantığından farklı.

**Öneri: tek küçük yeni bileşen `LocaleTextInput`** (`src/components/admin/locale-text-input.tsx`):
```ts
interface LocaleTextInputProps {
  label: string
  value: Record<string, string>          // { tr: '...', en: '...', de: '...' }
  onChange: (locale: string, next: string) => void
  /** Hangi diller sunulacak — varsayılan TRANSLATED_LOCALES (8) */
  locales?: readonly Locale[]
  placeholder?: string
}
```
- Yanında bir `<select>`/küçük buton (dil seçici) → `LOCALES`/`TRANSLATED_LOCALES` listesinden (`i18n.ts:71`). Yeni combobox yazma; mevcut `SearchableCombobox`'ı **single-select** olarak inline bir "dil seçici" için kullanmak fazla soyutlama. Basit `<select>` veya projedeki mevcut mini dropdown yeterli (ponytail: en küçük). Eğer UI tutarlılığı için combobox şart ise: `SearchableCombobox` `multiple=false, showAllOption=false, onClear=noop` ile birebir kullanılabilir — **ek kod yok**, sadece wrapper.
- Input mevcut `Input` (`variant="faded"`) ile aynı stil → `admin-panel.tsx:602` deseni korunur.
- **Bileşen adı istendiği için:** `LocaleTextInput`. Alternatif: `MultilingualField` (about ile isim çakışmasın diye `LocaleTextInput` tercih).

**`setHeroI18n` helper** `admin-panel.tsx`'e (mevcut `setHero` yanına, satır 221):
```ts
const setHeroI18n = (field: keyof HeroI18n, locale: string, value: string) =>
  setContent(prev => ({
    ...prev,
    hero: { ...prev.hero, i18n: { ...prev.hero.i18n,
      [field]: { ...prev.hero.i18n?.[field], [locale]: value } } },
  }))
```
`generalPane` (`admin-panel.tsx:598-637`) içindeki 4 alan `LocaleTextInput`'a çevrilir. **Tek "Kaydet" butonu değişmez** — zaten tüm `content` state'ini POST ediyor.

---

## 6. SORU-6: Test / regresyon kontrolleri

### Zorunlu (negatif kontrolle):
1. **zod şema koruması** — `validations.test.ts`'e eklenir (satır 117-130 deseni birebir):
   ```ts
   it('hero.i18n alanini KORUR — regresyon', () => {
     const input = realContent()
     input.hero.i18n = { tagline: { tr: 'T', en: 'E', de: 'D' } }
     const r = contentSchema.safeParse(input)
     expect(r.data.hero.i18n?.tagline?.en).toBe('E')   // Eskiden semada olsa da olmasa da silinirdi
   })
   ```
   **Negatif kontrol:** `i18n` şemada OLMASAYDI bu değer parse sonrası KAYBOLURDU → test kırmızı olmalı. Bu, tuzağın geri gelmediğini kanıtlar (`validations.test.ts:91` whitelist testiyle birlikte).
2. **Öncelik testi** — `i18n-server.test.ts` (yeni veya mevcut `content.test.ts`'e): `localizeContent` birim testi:
   - admin `i18n.en.tagline` dolu + `enContentOverlay` dolu → **admin kazanır**.
   - admin boş + overlay dolu → overlay kazanır.
   - ikisi de boş → TR base.
   - `i18n` hiç yok → bugünkü davranış (regresyon kilidi).
3. **API uç testi** — `route.test.ts` (mevcut var): POST gövdesinde `hero.i18n` gönderilir, kaydedilen içerikte korunur; gönderilmezse `current.hero.i18n` korunur (sessiz silme yok).
4. **Boş-değer** — `i18n.en.tagline = ''` → EN görünümde TR base'e düşer, boş string render edilmez ("uydurma yok" ilkesi).

---

## 7. Uygulama sırası (en küçük → kanıtlı)

1. **Şema + tip** (`validations.ts`, `content.ts`): `Bilingual` benzeri `LocaleTextMap = Partial<Record<Locale,string>>`, `HeroI18n` tipi + `heroI18nSchema` (zod, her alan `z.record(z.string().max(20), z.string().max(500)).optional()` veya açık `tr/en/de/es/fr/ja/pt/ru`). `contentSchema.hero`'ya `i18n: heroI18nSchema.optional()`. → **Test 1 yeşil olmadan ilerleme yok.**
2. **Merge önceliği** (`i18n-server.ts:localizeContent`): overlay merge'den SONRA admin `i18n[locale]` uygula. → **Test 2.**
3. **API koruma** (`route.ts`): `hero.i18n ?? current.hero.i18n`. → **Test 3.**
4. **Admin UI** (`locale-text-input.tsx` + `admin-panel.tsx` hero bölümü 4 alan): `LocaleTextInput` + `setHeroI18n`. Tek Kaydet değişmez.
5. **(KRİTİK — §3 Seçenek A)** Public görünürlük: `HeroSection` (ve gerekiyorsa `Footer`) istemci-tarafı yerelleştirme — `useLocale()` + `i18n[locale]`/overlay seçimi (`about-page-view.tsx` kalıbı). **Bu adım olmadan admin emeği public'te görünmez.**
6. **Diğer alanlara genişletme** (Faz 4, opsiyonel/ayrı iş): aynı `LocaleTextInput` + aynı öncelik kalıbı nav/about/contact'a uygulanır. Kullanıcı "her yere" dediyse bu faz sıralı gelir.

> Faz 1-3 (veri + doğrulama) ve Faz 4 (admin UI) sunucu/API tarafı; Faz 5 client. Faz 5'i atlarsan özellik yarım kalır.

---

## 8. Açık sorular / riskler

1. **🔴 EN ÖNEMLİ:** §3 Seçenek A (hero'yu client-side yerelleştir) yapılacak mı? Yapılmazsa admin EN/DE girer, "Kaydedildi" der, public site değişmez → kullanıcı aldatılmış olur. **CEO kararı gerekir.** Önerim: yap.
2. **🟡 Supabase `site_content` tablosu YOK** (§0.6). Bu iş bitse bile kayıt kalıcı olmaz (EROFS disk fallback). i18n işinden bağımsız olarak `supabase/site-content.sql` çalıştırılmalı; aksi halde "kaydettim ama deploy'da gitti".
3. **🟡 Dil kapsamı:** admin'de kaç dil sunulacak? `TRANSLATED_LOCALES` (8) mi, `LOCALES` (25) mi? Öneri: **8** (içeriği gerçekten çevrilmiş olanlar). 25 seçenek boş diller için tuzak yaratır (kullanıcı JA'ya metin girer, overlay yok, site boş). `translated` seçilirse hreflang/SEO sinyali tutarlı kalır (`i18n.ts:60-71` yorumu).
4. **🟡 Emoji/logo alanının i18n'i tartışmalı:** emoji genelde dilsiz. Yine de kullanıcı istedi → kapsama alınır ama UI'da "genelde tüm dillerde aynıdır" ipucu verilebilir. (Kullanıcı isteği net olduğu için zorunlu değil, not.)
5. **🟢 `i18n-content-tr.ts` ölü kod** (§0.3): bu iş sırasında silinebilir veya dokunulmaz. Riski düşük; ayrı temizlik.
6. **🟢 Rate limit:** mevcut `guardWrite(req, 'admin-content')` 20/dk (route.ts:39) yeterli; payload büyür ama limit değişmez.

---

## 9. Güven

**YÜKSEK.** Tüm ilgili dosyalar okundu: `content.ts`, `i18n-server.ts`, `i18n.ts`, `validations.ts`, `route.ts`, `admin-panel.tsx`, `about-page.ts` + `about-page-editor.tsx`, `searchable-combobox.tsx`, `hero-section.tsx`, `layout.tsx`, `(public)/page.tsx`, `validations.test.ts`, `data/content.json`, searcher envanteri. Her iddia `file:line` ile işaretlendi.

**Tek belirsiz nokta:** §3 Seçenek A'nın (hero client-side yerelleştirme) canlı public davranışı — searcher envanteri satır 33 de bunu "kod okumasıyla çıkarıldı, canlı SSR ile ölçülmedi" diye işaretlemiş. Ölçüm (canlı EN ziyaretçide hero tagline) netleştirirse confidence yükselir; tasarım kararı yine değişmez.
