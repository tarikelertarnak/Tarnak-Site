---
summary: "/donate ve /credits sayfalarındaki TR/EN karışıklığı ENVANTERİ. Kök neden: her iki sayfa da i18n sözlüğünü (t()) NEREDEYSE HİÇ kullanmıyor; metinler ya inline ternary (isEn ? 'EN' : 'TR') ya da bileşene gömülü hardcode dizi alanlarıyla geliyor. Sözlük en.json/t r.json bu anahtarlar için TEMİZ (bulunamadı/eksik değil) ama çağrılmıyor. EN modunda dahi TR metin sızan tam liste aşağıda."
---

# ENVANTER: /donate ve /credits sayfalarında TR/EN metin karışıklığı

Hiçbir dosya DEĞİŞTİRİLMEDİ. Sadece okuma/grep.

## Kök neden (tek cümle)
Her iki sayfa da `generateMetadata` ve gövde metinlerini **i18n sözlüğünden (`t('...')`) almak yerine** `isEn ? 'English' : 'Türkçe'` inline ternary'si ve **bileşen içine gömülü veri dizileriyle** (`CONTRIBUTORS`, `METHODS` …) üretiyor. `CreditsBrowser` içinde `t()` çağrıları DOĞRU; ama veri (rol/isim/not) `page.tsx` içindeki hardcode dizilerden geldiği için EN modda bile TR alanları ekrana düşebiliyor.

---

## 1. `/donate` kaynak dosyaları

| Dosya | Rol |
|---|---|
| `site/src/app/donate/page.tsx` | Sayfa + metadata + `METHODS` hardcode dizisi + tüm başlık/tablo/alt metin (bazıları inline ternary) |
| `site/src/components/donate/copy-button.tsx` | Kopyala butonu (inline ternary ile EN/TR) |
| `site/src/components/navigation.tsx` | Ortak `Navigation` |
| `site/src/components/ui/section.tsx` | Ortak `Section` |
| `site/src/lib/i18n-server.ts` → `getStaticLocale()` | locale kaynağı (kullanılıyor) |

## 2. `/credits` kaynak dosyaları

| Dosya | Rol |
|---|---|
| `site/src/app/credits/page.tsx` | Sayfa + metadata + `CONTRIBUTORS`/`TEAM`/`TOP_DONORS`/`TRANSLATORS` hardcode dizileri |
| `site/src/components/credits/credits-browser.tsx` | Ana liste bileşeni (arama/filtre/sıralama) — `t()` çağrıları burada, veri `page.tsx`'ten |
| `site/src/components/credits/credits-browser.test.tsx` | Test |
| `site/src/components/navigation.tsx`, `site/src/components/ui/section.tsx` | Ortak |

---

## 3. Metin kaynağı AYRIMI (sözlük `t()` vs hardcode)

### /credits — `credits-browser.tsx` içindeki `t()` çağrıları (SÖZLÜKTEN — doğru)
Hepsi en.json'da İngilizce mevcut → **sorun yok**.
- `t('credits.visit')` → credits-browser.tsx:256
- `t('credits.search')` → :396, :397
- `t('credits.filterAll')` → :404, :412, :414
- `t('credits.filterContributors')` → :405
- `t('credits.filterTeam')` → :406
- `t('credits.filterSponsors')` → :407
- `t('common.search')` → :413, :425
- `t('credits.sortLeadership')` → :418
- `t('credits.sortAz')` → :419
- `t('credits.sort')` → :424, :426
- `t('credits.found')` → :431
- `t('credits.contributors')` → :450
- `t('credits.translators')` / `credits.translatorsDescription` → :474, :475
- `t('credits.topDonors')` / `credits.topDonorsDescription` → :500, :501
- `t('credits.team')` / `credits.teamDescription` → :525, :526
- `t('credits.teamComingSoon')` → :529
- `t('credits.sponsors')` / `credits.sponsorsDescription` → :562, :563
- `t('common.loading')` → :566
- `t('credits.sponsorsEmpty')` → :568
- `t('credits.noResults')` → :581
- `t('credits.views')` → :334
- `t('credits.sponsorRole')` → :340, :348
- `t('credits.earned')` → :355

### /credits — HARDCODE (kod içi sabit string)
`page.tsx` içindeki diziler — her alan hem TR hem EN tutuyor:
- `site/src/app/credits/page.tsx:42` `role: 'Kurucu & Ana Geliştirici'` (TR)
- `site/src/app/credits/page.tsx:43` `roleEn: 'Founder & Lead Developer'` (EN)
- `site/src/app/credits/page.tsx:52` `role: 'Kurucu & Geliştirici'` (TR)
- `site/src/app/credits/page.tsx:53` `roleEn: 'Founder & Developer'` (EN)
- `site/src/app/credits/page.tsx:59` `nameTr: 'Henüz yok'` (TR)
- `site/src/app/credits/page.tsx:60` `nameEn: 'None yet'` (EN)
- `site/src/app/credits/page.tsx:61` `noteTr: 'İlk destekçi sen ol!'` (TR)
- `site/src/app/credits/page.tsx:62` `noteEn: 'Be the first supporter!'` (EN)

`generateMetadata` (inline ternary — sözlük değil):
- `page.tsx:20-21` `'Credits — TARIK ELER - TARNAK'` / `'Katkıda Bulunanlar — …'`
- `page.tsx:23-24` description EN/TR

Hero başlığı (inline ternary — sözlük değil):
- `site/src/app/credits/page.tsx:109` `{isEn ? 'CONTRIBUTORS' : 'KATKIDA BULUNANLAR'}`

### /donate — HARDCODE (kod içi sabit string)
`page.tsx` içindeki `METHODS` dizisi — her kayıt TR+EN not tutuyor:
- `site/src/app/donate/page.tsx:37` `noteTr: 'Aylık destek ile projelerin sürekli gelişimini sağla'`
- `page.tsx:38-39` `noteEn: 'Support the continuous development…'`
- `page.tsx:49` `noteTr: 'Tüm projelere erken erişim ve özel içerikler'`
- `page.tsx:50` `noteEn: 'Early access…'`
- `page.tsx:66` `noteTr: 'Tek seferlik küçük destekler için ideal'`
- `page.tsx:67` `noteEn: 'Ideal for small one-time supports'`
- `page.tsx:83` `noteTr: 'Bir kahve ısmarla, motivasyon gönder'`
- `page.tsx:84` `noteEn: 'Buy me a coffee, send some motivation'`

`generateMetadata` (inline ternary — sözlük değil):
- `page.tsx:14-19` title/description EN/TR
- `page.tsx:22-27` openGraph title/description EN/TR

`copy-button.tsx` (inline ternary — sözlük değil):
- `site/src/components/donate/copy-button.tsx:29` `? isEn ? 'Copied' : 'Kopyalandı'`
- `site/src/components/donate/copy-button.tsx:30` `: isEn ? 'Copy' : 'Kopyala'`

---

## 4. Sözlük kontrolü (`en.json`) — istenen anahtarlar

`src/i18n/en.json` içinde HİÇBİR donate anahtarı yok (`grep "donate\."` → **hiç eşleşme yok**). Credits anahtarları mevcut ve İngilizce. İstenen örnekler:

| Anahtar / metin | en.json'da var mı | Değer |
|---|---|---|
| "DESTEK OL" (donate başlığı) | ❌ anahtar yok | sözlükte karşılığı yok — `page.tsx:123` inline ternary `'SUPPORT'` |
| "KATKIDA BULUNANLAR" (credits başlığı) | ❌ anahtar yok (`credits.contributors` farklı ama) | `page.tsx:109` inline `'CONTRIBUTORS'`; sözlükteki `credits.contributors`=`"Contributors"` ayrı anahtar |
| "Yöntem" (Method) | ❌ anahtar yok | `page.tsx:135` inline `'Method'` |
| "Bağlantı" (Link) | ❌ anahtar yok | `page.tsx:138` inline `'Link'` |
| "Kopyala" (Copy) | ❌ anahtar yok | `copy-button.tsx:30` inline `'Copy'` |
| "Destek olmasan bile …" | ❌ anahtar yok | `page.tsx:183-185` inline ternary |

Karşılaştırma — credits `t()` anahtarları en.json'da TEMİZ İngilizce:
- `credits.contributors` → `"Contributors"` (en.json:184)
- `credits.team` → `"Team"` (en.json:200)
- `credits.topDonors` → `"Top Donors"` (en.json:203)
- `credits.sponsors` → `"Sponsors"` (en.json:197)
- `credits.sponsorsEmpty` → `"No sponsor data yet."` (en.json:199)
- `credits.beFirstDonor` → `"Be the first supporter!"` (en.json:183) — **NOT: bu anahtar hiç çağrılmıyor;** `page.tsx:62` `noteEn` hardcode'u bunu gölgeliyor
- `common.xload`, `common.search` → temiz (en.json:141-142)

tr.json karşılıkları da mevcut (tr.json:183-208) → yani sözlük iki dilde de hazır, sadece **sayfalar kullanmıyor**.

---

## 5. EN modunda dahi TR metin sızabilecek TAM LİSTE

Bunlar inline ternary VE hardcode dizileri olduğu için, `isEn` doğru hesaplansa bile **kod içine gömülü TR sabit stringleri** vardır ve localStorage/cookie senkron sorununda veya yanlış alan seçiminde TR görünür:

**Hardcode TR stringler (her zaman kodda duran):**
- `src/app/credits/page.tsx:42` — `'Kurucu & Ana Geliştirici'`
- `src/app/credits/page.tsx:52` — `'Kurucu & Geliştirici'`
- `src/app/credits/page.tsx:59` — `'Henüz yok'`
- `src/app/credits/page.tsx:61` — `'İlk destekçi sen ol!'`
- `src/app/credits/page.tsx:21/24/29/32` — metadata TR başlık/açıklama
- `src/app/donate/page.tsx:37,49,66,83` — `noteTr` değerleri (4 adet TR not)
- `src/app/donate/page.tsx:16,19,24,27` — metadata TR başlık/açıklama

**Inline ternary TR kolları (isEn yanlış/eksik olursa TR'ye düşer):**
- `src/app/donate/page.tsx:123` — `'DESTEK OL'`
- `src/app/donate/page.tsx:135` — `'Yöntem'`
- `src/app/donate/page.tsx:138` — `'Bağlantı'`
- `src/app/donate/page.tsx:141` — `'Kopyala'`
- `src/app/donate/page.tsx:185` — `'Destek olmasan bile teşekkürler …'`
- `src/app/credits/page.tsx:109` — `'KATKIDA BULUNANLAR'`
- `src/components/donate/copy-button.tsx:29` — `'Kopyalandı'`
- `src/components/donate/copy-button.tsx:30` — `'Kopyala'`

**EN modda sızma mekanizması (gözlem):** `page.tsx` sunucu bileşeni `getStaticLocale()` ile locale okuyor (`donate:101-102`, `credits:78-79`). Ancak `CopyButton` ve `CreditsBrowser` **`'use client'`** ve locale'i `useLocale()`/`useT()` ile istemci context'inden okuyor (`copy-button.tsx:13`, `credits-browser.tsx:187`). İki locale kaynağı (sunucu cookie vs istemci context) ayrışırsa aynı sayfada bir kısım TR bir kısım EN render eder — kullanıcının gördüğü karışık ekranın mekanik açıklaması budur. `CreditsBrowser:245,295,307,313,328` sunucudan gelen ve istemcide `locale`e göre seçilen hardcode alanları (`c.role` vs `c.roleEn`) kullanıyor.

---

## Confidence
- **Yüksek:** Dosya:satır konumları, hardcode vs `t()` ayrımı, en.json içerikleri (hepsi doğrudan okundu/grep'lendi).
- **Orta:** "İki locale kaynağı ayrışıyor" mekanizması bir çıkarım (kod okumasına dayanır, canlı tarayıcı ölçümü yapılmadı). Kök neden olarak kesin olan: sayfalar sözlük kullanmıyor, metinleri kod içi sabit olarak tutuyor.
