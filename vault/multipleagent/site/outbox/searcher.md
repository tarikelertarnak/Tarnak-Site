---
summary: Sunucu bileşenlerinde (yok 'use client') kullanıcıya GÖRÜNEN hardcode TR metin envanteri. 3 kritik hata (breadcrumb CRUMBS, github/[repo] vaka çalışması, phase6-sections fallback) + 1 ters-hata (github/[owner] sunucuda EN basıyor). Metadata/SEO/JSON-LD bilinçli sınır olarak ayrı listelendi.
---

# Searcher Envanteri — Sunucu Bileşenlerinde Hardcode TR Metin

**Kapsam:** `'use client'` OLMAYAN dosyalar (sunucu bileşenleri), public tarafı. admin/chat/login hariç.
**Yöntem:** tüm `*.tsx/*.ts` dosyalarının ilk 200 karakteri `use client` için tarandı; sunucu dosyalar `Read` ile okundu; TR literal'ler regex ile süpürüldü.

## KRİTİK — Kullanıcı görüyor + sunucu bileşeni (istemciye taşınmalı)

| # | dosya:satır | 'use client' | TR metin | Görünürlük |
|---|---|---|---|---|
| 1 | `src/lib/breadcrumb.ts:24-46` (render: `src/components/breadcrumb.tsx:62`) | YOK (lib) / YOK (component) | `'Ana sayfa'`, `'Projeler'`, `'Blog'`, `'Hakkımda'`, `'İletişim'`, `'Destek Ol'`, `'Katkıda Bulunanlar'` | **Sayfa gövdesinde render** — `/contact` ve `/github/[owner]/[repo]` breadcrumb olarak basıyor |
| 2 | `src/app/(public)/github/[owner]/[repo]/page.tsx:85-87` | YOK | `label: 'Ana sayfa'`, `label: 'Projeler'` (inline crumb dizisi) | **Sayfa gövdesinde** breadcrumb (`page.tsx:95` `<Breadcrumb>`) |
| 3 | `src/app/(public)/github/[owner]/[repo]/page.tsx:119` | YOK | `'Lisans belirtilmemiş'` (fallback) | **Sayfa gövdesinde** meta satırı |
| 4 | `src/app/(public)/github/[owner]/[repo]/page.tsx:144` | YOK | `'Canlı demo'` (buton) | **Sayfa gövdesinde** |
| 5 | `src/app/(public)/github/[owner]/[repo]/page.tsx:158` | YOK | `title="Vaka çalışması"` | **Sayfa gövdesinde** h2 |
| 6 | `src/app/(public)/github/[owner]/[repo]/page.tsx:167` | YOK | `'Kısa özet'` | **Sayfa gövdesinde** h3 |
| 7 | `src/app/(public)/github/[owner]/[repo]/page.tsx:176` | YOK | `'Problem'` | **Sayfa gövdesinde** h3 |
| 8 | `src/app/(public)/github/[owner]/[repo]/page.tsx:185` | YOK | `'Çözüm'` | **Sayfa gövdesinde** h3 |
| 9 | `src/app/(public)/github/[owner]/[repo]/page.tsx:194` | YOK | `'Sonuç'` | **Sayfa gövdesinde** h3 |
| 10 | `src/app/(public)/github/[owner]/[repo]/page.tsx:210` | YOK | `'Bu proje için vaka çalışması henüz yazılmadı.'` (boş durum) | **Sayfa gövdesinde** |
| 11 | `src/app/(public)/github/[owner]/[repo]/page.tsx:222` | YOK | `'Kullanılan teknolojiler'` | **Sayfa gövdesinde** h3 |
| 12 | `src/app/(public)/github/[owner]/[repo]/page.tsx:245` | YOK | `'README'` (başlık — Latin, çeviri gerekmez ama TR değil; bilgi olsun) | Sayfa gövdesinde |
| 13 | `src/app/(public)/github/[owner]/[repo]/page.tsx:255` | YOK | `'README bulunamadı veya yüklenemedi.'` | **Sayfa gövdesinde** |
| 14 | `src/app/(public)/github/[owner]/[repo]/page.tsx:263` | YOK | `'GitHub'de görüntüle'` (link) | **Sayfa gövdesinde** |
| 15 | `src/components/phase6-sections.tsx:89` | YOK | `{title || 'Hizmetler'}` (fallback) | **Sayfa gövdesinde** — ana sayfa `ServicesSection` (title admin'den boşsa fallback basar) |
| 16 | `src/components/phase6-sections.tsx:174` | YOK | `{title || 'Referanslar'}` (fallback) | **Sayfa gövdesinde** — ana sayfa `TestimonialsSection` |
| 17 | `src/app/(public)/now/page.tsx:52` | YOK | `'Son güncelleme:'` | **Sayfa gövdesinde** (p) — `now.updated` doluysa |
| 18 | `src/app/(public)/github/[owner]/page.tsx:54` | YOK | `'GitHub\'da aç'` (link) + satır 43 TR fallback metni | **Sayfa gövdesinde** — AMA bkz. aşağıdaki TERS-HATA notu |

> Not #18: Bu sayfa `getLocale()` (sunucu) kullanıyor; kök `force-static` yüzünden `cookies()/headers()` boş → `resolveLocale(undefined, undefined)` = **`'en'`** (`src/lib/i18n.ts:163`). Yani sunucu, TR ziyaretçiye İngilizce branch'i basıyor (`Repositories of …`, `Open GitHub`); istemci hydration'da dil TR'ye dönerken bu metni geri çevirmiyor → **EN↔TR ters simetrik hata**. Ayrıca `isEn` mantığı `getStaticLocale()` kullanan diğer sayfalarla tutarsız.

## TERS-HATA — Sunucuda ölü/kullanılmayan fallback (şu an render edilmiyor)

| dosya:satır | 'use client' | TR metin | Durum |
|---|---|---|---|
| `src/components/phase6-sections.tsx:243` | YOK | `{title || 'Yolculuk'}` | `TimelineSection` hiçbir sayfada import edilmiyor → render edilmiyor (ölü export) |
| `src/components/phase6-sections.tsx:312` | YOK | `{title || 'Sertifikalar & Başarılar'}` | `CertificatesSection` hiçbir sayfada import edilmiyor → render edilmiyor |

## BİLİNÇLİ SINIR — Metadata / SEO / JSON-LD / RSS (hata DEĞİL, sunucuda kalır)

| dosya:satır | TR metin | Tür |
|---|---|---|
| `src/app/layout.tsx:75,80-81,87-89,105,176,185,285,291,297,317-322,328,331` | `'Tarık Eler (Tarnak) - Portfolio'`, description, `authors/creator/publisher`, `alt`, JSON-LD `name`/`jobTitle`/`knowsAbout` (`'Yapay Zeka'`)/`alternateName` | metadata + JSON-LD |
| `src/app/(public)/blog/page.tsx:19-28` | `'Blog — Yazılarım | Tarık Eler'`, description, og | metadata |
| `src/app/(public)/projects/page.tsx:14-21` | `'Projeler — TARIK ELER - TARNAK'`, description, og | metadata |
| `src/app/(public)/changelog/page.tsx:14-15` | `'Değişiklikler — …'`, `'Bu sitede neler değişti…'` | metadata |
| `src/app/(public)/uses/page.tsx:14-15` | `'Kullandıklarım — …'`, `'Her gün kullandığım…'` | metadata |
| `src/app/(public)/now/page.tsx:14-15` | `'Şu an — …'`, `'Şu anda öğrendiklerim…'` | metadata |
| `src/app/(public)/contact/page.tsx:24-26` | `'İletişim'`, description | metadata |
| `src/app/(public)/about/page.tsx:36-46` | `'HAKKIMDA'`, `'TARIK ELER (TARNAK) — …'` | metadata |
| `src/app/(public)/github/[owner]/page.tsx:19` | `` `${owner} — GitHub — TARIKELER` `` | metadata |
| `src/app/(public)/github/[owner]/[repo]/page.tsx:51` | `` `${owner}/${repo} — kaynak kodu…` `` | metadata |
| `src/app/(public)/blog/[slug]/page.tsx:72-73,110-113,183-203` | `'Yazı bulunamadı | Tarık Eler'`, `'Aranan blog yazısı bulunamadı.'`, `siteName`, `'inLanguage': 'tr'`, `author.name` | metadata + JSON-LD (BlogPosting) |
| `src/app/(public)/gizlilik/page.tsx:10-11`, `kvkk/page.tsx:10-11` | `'Gizlilik Politikası'`, `'KVKK Aydınlatma Metni'`, description | metadata |
| `src/components/legal-page.tsx:67,71-72` | `` `${baslik} — TARIK ELER - TARNAK` ``, og | metadata |
| `src/app/(public)/credits/page.tsx:10-19`, `donate/page.tsx:10-19` | `t(locale,'credits.metaTitle')` — `t()` kullanıyor, TR sabit ama i18n kaynağı | metadata (t() ile) |
| `src/app/sitemap.ts` | yorum/freq literal; kullanıcı metni yok (route listesi) | sitemap |
| `src/app/robots.ts:57-70` | izin/disallow/dosya adları | robots |
| `src/app/opengraph-image.tsx:17,75,87,98,111` | `alt` `'Tarık Eler (Tarnak) — Yazılımcı & Sistem Mimarisi'`, `'TARIK ELER'`, `'TARNAK'`, `'Yazılımcı & Sistem Mimarisi'` | OG görsel (build-time PNG; render edilen sayfa gövdesi DEĞİL) |
| `src/app/feed.xml/route.ts:42-44` | `'Tarık Eler (Tarnak) — Blog'`, description | RSS kanal meta |

## VERİ / İSTİSNA — hata değil

- `content.json`'dan gelen başlık/açıklama/grup adları (`content.projects.subtitle`, `uses.title`, `group.title`, `entry.title`, `vaka.summary/problem/…`) → **veri**.
- `alt=""` (dekoratif): `src/components/videos-section.tsx:41` → sorun yok.
- Zaten `t()`/`useT()` kullanan sunucu-dışı: `not-found.tsx` (client, `t()`), `phase6-client.tsx` (`Phase6EmptyI18n`/`Phase6Title`, client, `t()`), `legal-page.tsx`'in gövdesi (`LegalBodyClient`, client).
- `aria-label` bulgusu: `src/components/breadcrumb.tsx:44` `aria-label="Breadcrumb"` (Latin, İngilizce terim) — ekran okuyucu, ama çevrilmemiş diye not edilebilir; düşük öncelik.

## Özet
- **Kullanıcı-görür + sunucu** kritik: 3 yerde yoğunlaşıyor — (a) breadcrumb (`CRUMBS` + repo inline crumb), (b) `github/[owner]/[repo]` vaka çalışması bloğu, (c) `phase6-sections.tsx` `Hizmetler`/`Referanslar` fallback + `now` "Son güncelleme:".
- **Ters-hata:** `github/[owner]` sunucuda EN basıyor (`getLocale()` force-static altında `'en'` döner).
- Zaten düzeltilmiş boş-durum metinleri (`/donate /credits /uses /now /changelog /gizlilik /kvkk`) bu taramada sunucu bileşenlerinde literal olarak görünmedi → taşıma tutmuş.
- Metadata/SEO/JSON-LD hepsi sunucuda kalıyor (bilinçli sınır).

**Güven: YÜKSEK** — dosyalar tek tek okundu, `use client` varlığı doğrulandı. Bir uyarı: `github/[owner]/page.tsx` `getLocale()`'nin statik bağlamdaki dönüşü (`'en'`) kod okumasıyla çıkarıldı, canlı SSR çıktısıyla ölçülmedi.
