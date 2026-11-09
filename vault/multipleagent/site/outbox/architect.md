---
summary: Karar C (dil-başına prerender yerine hibrit) yerine → seçilen: B-varyantı "cookie'yi proxy'de OKU, HTML'i ETKİLEME; locale'i istemciye yaz" — yani gövdeyi tam istemciye taşı, SSR'ı TEK dilde (tr) dondur. Gerçek çözüm: A + sunucu metnini istemciye indirgemek. 12 dosya, 1102 riski YOK.
---

# /donate ve /credits karışık dil sorunu — mimari karar

## 1. Context (ölçülmüş gerçek)

**Belirti:** Site dili EN iken `/donate`, `/credits` (ve tüm public sayfalar) başlık/metin olarak
kısmen TR kalıyor.

**Kök neden zinciri:**

1. `src/lib/i18n-server.ts:129` → `getStaticLocale()` sabit `'tr'` döner. Yorumu (satır 101-128)
   nedenini açıkça yazıyor: `getLocale()` `cookies()`/`headers()` okuduğu için route'u **dynamic**
   yapar → `revalidate` yok sayılır → 13 MB handler SSR → Workers Free **10 ms CPU** aşılır → 1102/503.
2. Yani `getStaticLocale` bir "tercih" değil, **CPU bütçesinin zorladığı bir kısıt**. Onu
   kaldırmak = 1102'yi geri getirmek.
3. Sunucu HTML'i her zaman TR basar. İstemci (`locale-provider.tsx:57-60`, `useT`) cookie'yi
   okuyup hydration sonrası **yalnızca istemci bileşenlerini** EN'e çevirir.
4. Sunucu-render edilmiş metin (`donate/page.tsx:110` `t(locale,...)`, `:122`,`:143`,`:170`;
   `credits/page.tsx:97`; `generateMetadata` başlıkları) TR kalır → **karışık sayfa**.

**Kritik altyapı gerçekleri (ölçüldü, kararı değiştiren 3 madde):**

- **R1 — Statik HTML worker'a hiç uğramıyor.** `scripts/pages-copy-worker.cjs:459-581`
  prerender edilmiş her public sayfayı (`,/about,/blog,/contact,/projects,/credits,/donate,/changelog,
  /gizlilik,/kvkk,/now,/uses,/login,/sign,/chat`) `.open-next/<route>/index.html` olarak **statik
  asset** yazar; `:550-553` + `:587-626` `_routes.json` `exclude`'una koyar. Pages static servisi
  sunar → **0 CPU**. Bu yüzden `/donate` şu an 10 ms bütçesine hiç dokunmuyor.
- **R2 — kök layout `force-static`** (`layout.tsx:59`) → alt segmentlerde `cookies()` **boş** döner
  (AGENTS.md §12; üç deneyle doğrulanmış). Yani `getLocale()`'a dönmek SADECE CPU değil, **işlevsel
  olarak da kırık**: `force-static` altında cookie zaten okunamaz.
- **R3 — `src/proxy.ts` çalışıyor ama prerender edilen public sayfalara UĞRAMIYOR** (R1). Proxy
  cookie okuyup `x-locale` yazsa bile, `/donate/` isteği worker'a hiç gelmediği için o header
  **HTML'e asla giremez**. B aksiyonu bu yüzden tek başına etkisizdir (aşağıda detay).

---

## 2. Design decisions

### KARAR: **A (gövdeyi istemciye taşı) + SSR'da TEK dil (tr) sabit kalsın.** B/C/D reddedilir.

Tek cümle: **Sunucu-render edilmiş locale-bağımlı metni SAYFADA BIRAKMA. `t(locale, …)` çağrılarını
sunucudan kaldır, bileşeni istemciye taşı; SSR HTML'i tek dilde (tr) donar ve istemci hydration'da
tüm sayfayı tek seferde doğru dile boyar.**

Bu, `/about`'un **zaten yaptığı** şeydir (`about/page.tsx:21` yorumu: "Dil istemcide çözülür
(`AboutSection` → `useLocale()`), bu yüzden sayfayı..."). `/about` bu yüzden karışık görünmüyor.
`/donate` ve `/credits` aynı desene çekilecek.

### Seçenek değerlendirmesi (istenen 6 metrik)

| # | Metrik | **A — istemciye taşı** | B — proxy `x-locale` | C — `[locale]` prerender | D — `getLocale()`'a dön |
|---|--------|----------------------|---------------------|------------------------|------------------------|
| 1 | 10 ms CPU / 1102 | **Geçer.** Statik HTML aynı kalır (0 CPU). `/donate` `/credits` zaten prerender (R1). | **Geçersiz.** | **Geçer.** | **AŞAR → 1102 geri gelir.** |
| 2 | Prerender/ISR | Korunur (statik asset + `force-static`). | İki alt-durum: (a) proxy'yi static asset'lere de sokarsan `_routes.json` exclude bozulur, `/donate` worker'a düşer → **10 ms'de 13 MB SSR**; (b) sokmazsan header zaten ulaşmaz. | Korunur, hatta güçlenir (dil başına ayrı statik dosya). | Yok olur (dynamic). |
| 3 | SEO | **Ana risk.** Google + JS-off = TR görür. Kabul edilebilir, çünkü bugün de TR basıyor (`getStaticLocale`='tr') → **SEO regresyonu YOK, net 0 değişim**. | URL hâlâ tek; Google'a etkisi C gibi ama prerender'ı kırma pahasına. | **En iyi.** `/en/donate` gerçek, `hreflang` geçerli olur. Şu an `layout.tsx:108-126` + `sitemap.ts:89-100` hreflang'i BİLEREK kaldırmış, çünkü `/en/` yolları 404'tü. C bunu düzeltir. | SEO nötr ama CPU'da ölür. |
| 4 | İlk boyama flash | **Var ama bugünkünden KÖTÜ DEĞİL.** Maksimum = tam sayfa içeriği bir kez EN'e döner. Bugün **yarısı TR kalıyor** (daha kötü). FOUC değil (HTML dolu gelir); yerleşim kaymaz, sadece metin değişir. | — | **Yok, sıfır flash.** | Flash, + 503. |
| 5 | Dosya sayısı / refactor | **~8-12 dosya (sıcak nokta: 2 sayfa + 2 metadata)** | ~2 (ama çalışmaz) + `_routes.json` riski | **~40+ dosya** (tüm rotalar `app/[locale]/` altına, `generateStaticParams`, link builder, sitemap, canonical). Ayrı bir iş. | 1 satır |
| 6 | Kırılan test | `personal-pages.spec.ts:14-19` (TR başlık bekler — `/uses`,`/now`,`/changelog`), `home.spec.ts` | — | Neredeyse hepsi (URL regex'leri) | — |

**A neden B'den üstün (ve B neden çalışmaz):**
B'nin tek vaadi "SSR'da doğru dili bas". Ama R1+R3 gereği `/donate/` **worker'a hiç uğramıyor**;
proxy header'ı statik HTML'e giremez. B'yi çalıştırmanın TEK yolu, `/donate/`,`/credits/`'i
`_routes.json` exclude'undan çıkarmaktır — bu da sayfayı worker'a sokar ve **tam olarak 1102 tuzağına
geri döner**. Yani B, sorunu çözmek için CPU kısıtını feda eder: **kabul edilemez.**

**C neden şimdi yapılmamalı:**
Mühendislik olarak en doğru çözüm C'dir (gerçek SEO + sıfır flash). Ama:
(i) refactor ~40+ dosya, URL yapısı değişir, canonical/sitemap/hreflang baştan yazılır;
(ii) `force-static` altında `[locale]` segmenti de cookie göremez — C'de locale **URL'den** gelir
(bu yüzden çalışır, ama link yapısı tamamen değişir);
(iii) kullanıcının acil şikayeti "karışık dil", C'nin ulaşacağı yer çok ötesi.
→ C'yi **A'dan sonra ayrı iş** olarak kaydet.

**D neden reddedilir:** `getLocale()`'a dönmek `force-static` altında (R2) cookie'yi zaten okuyamaz
→ ya boş döner (bugünküyle aynı) ya da layout dynamic olur → 13 MB SSR → **1102**. Kayıtlı
`i18n-server.ts:101-113` bu denemenin kanıtı. **Reddedilmeli: EVET.**

### A'nın doğru uygulama şekli (yoksa A da yarı-karışık kalır)

Sayfayı "client component yap" demek yetmez — `generateMetadata` **sunucuda** çalışır ve
`<title>`/`<meta description>` üretir. Bunlar da locale-bağımlı. İki alt-karar:

- **Sunucu `<title>`/`description` → sabit TR kalır** (`getStaticLocale`/`t(locale,…)` çağrısı kalır,
  hiçbir şey değişmez). Gerekçe: metadata sunucuda üretilmek zorunda; prerender'ı korumak
  zorundayız; bugün de TR. İstemcide `document.title` güncellemek **YAPILMAZ** (Google başlık
  değişimini yavaş işler, istikrarsız title SEO'da kötü). **Kabul edilen bilinçli sınır.**
- **Sayfa gövdesindeki tüm `t(locale,…)` çağrıları istemciye taşınır.** `donate/page.tsx` ve
  `credits/page.tsx` → `'use client'` bileşen (veya ince sunucu kabuk + istemci gövde).
  Böylece hydration sonrası sayfanın **%100'ü** tek dilde boyanır; TR/EN karışıklığı biter.
- **`CopyButton`, `CreditsBrowser`** zaten `useT()` kullanıyor (istemci) → dokunulmaz.

---

## 3. Uygulama sırası (dosya sayısı: ~10, refactor: küçük)

1. **`src/app/donate/page.tsx`** — gövdeyi `'use client'` bileşene çevir: `getStaticLocale()` ve
   `t(locale,…)` çağrılarını sil, `useT()` kullan. `generateMetadata` **olduğu gibi kalır**
   (sabit TR, prerender korunur). `export const dynamic = 'force-static'` **kalır**.
2. **`src/app/credits/page.tsx`** — aynı işlem.
3. **`src/app/about/page.tsx` / `about-page-view.tsx`** — referans desen; **dokunma**, sadece örnek al.
4. **`src/app/uses|now|changelog/page.tsx`, `src/components/legal-page.tsx`** — bunlar
   `(await getStaticLocale()) === 'en'` ile **sunucuda koşullu metin** basıyor (`changelog/page.tsx:11-17`,
   `uses:11`, `now:11`, `legal-page.tsx:65`). Aynı sınıf hata: EN seçiliyken TR kalır. **Aynı desene çevir**
   (`useT()` / `isEn` koşulunu istemciye taşı). *Bunlar `/donate`+`/credits` kadar görünür değil ama
   aynı bug.*
5. **`src/app/not-found.tsx`** — aynı (`:8` `getStaticLocale`).
6. **Testler:** `e2e/personal-pages.spec.ts:14-19` TR başlık regex'lerini EN senaryosunda da geçecek
   şekilde gevşet (veya `site-locale=tr` cookie'siyle çalıştır). `home.spec.ts` gözden geçir.
7. **`pnpm typecheck` + `pnpm test` + e2e** → sonra PRIME adımıyla `/donate/`,`/credits/` 200 doğrula.

**Dokunulmayacaklar:** `i18n-server.ts` (`getStaticLocale` kalır — gerekçe yorumunda
güncelleme: "artık sadece metadata + JSON-LD için"), `proxy.ts`, `_routes.json` üretimi,
`layout.tsx:59` `force-static`.

---

## 4. Açık sorular / riskler

- **R1 (SEO, kabul edilen):** JS çalıştırmayan bot (Bing'in bir kısmı, sosyal scraper) sayfada TR
  metin görür. **Bugün de aynı.** A bunu kötüleştirmez. Kalıcı düzeltme C'dir.
- **R2 (flash):** EN ziyaretçi sayfayı bir kez TR görür (SRHTML), hydration'da EN'e döner.
  Süre ~ bir JS chunk. **Bugün daha kötü** (kalıcı yarım TR). `donate`/`credits` küçük sayfa → flash
  kısa. İstenirse `<html>` üzerine istemci tarafı locale class ile CSS ile gizleme yapılabilir
  ama **FOUC riski ve erişilebilirlik maliyeti** var → **önerilmez** (YAGNI).
- **R3 (`title` flash):** Sayfa gövdesi EN'e dönerken `<title>` TR kalır. Kabul edilen sınır.
- **R4 (aynı bug'ın diğer sayfaları):** `uses/now/changelog/not-found/legal-page` de aynı sınıfta —
  sıralamaya dahil edildi (adım 4-5), yoksa "düzelttik ama başka sayfa hâlâ karışık" olur.
- **R5 (translator notu):** `credits/page.tsx:56-64` TRANSLATORS bilerek boş; davranış korunur.
- **Açık soru (kullanıcıya):** C'ye (gerçek yol-bazlı i18n) geçmek isteniyor mu? İstenirse A bunun
  ön-koşulunu bozmaz; C ayrı iş olarak planlanır ve A'nın ~10 dosyası C'nin ~40 dosyasıyla birleşir.

---

## 5. Confidence

**Yüksek (~%85).**
- Kesin olan (koddan doğrulandı): R1 statik asset yolu, R2 `force-static` + `cookies()` boş,
  R3 proxy'nin public sayfalara uğramaması, D'nin 1102 üretmesi, A'nın CPU'ya dokunmaması,
  `/about` deseninin zaten çalışıyor olması.
- Kalan %15: flash süresi ve "gövdeyi istemciye taşıyınca prerender `.cache` `html` alanı hâlâ
  >1000 bayt üretir mi" (client-render edilen gövde HTML'de yine de markup basar → evet, ama
  bir build ile **ölçülmeli**; `pages-copy-worker.cjs:530` `body.length > 1000` eşiği).
- Kesin ölçüm gereken tek şey: adım 1 sonrası `pnpm opennext:build` çıktısında
  `.open-next/donate/index.html` boyutu >1000 bayt mı? Değilse `_routes.json`'dan `/donate/`
  düşer → worker'a gider. **Bunu uygulama sırasında doğrula.**

**Ölçmediğim:** canlı 1102/neden kayıtları (Cloudflare analytics), e2e tam tarama,
`home.spec.ts` ve `button.test.ts` içerikleri (isimden kapsam tahmini yaptım), `scroll.test.ts`
(içeriğini okumadım — i18n ile ilgisi düşük).
