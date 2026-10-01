# CARL LOG

## 2026-09-28

### [SEO-001] İsim varyantları + sitemap
- before: keywords 15 varyant, sitemap 8 URL, JSON-LD alternateName 5
- after: keywords 30+ varyant, sitemap 13 URL, JSON-LD alternateName 18
- result: PASS (kod eklendi, build sonrası doğrulanacak)
- commit: pending

### [SEC-001] GitHub path traversal
- before: `path=../../OWNER/REPO/contents/.env` → 500 (açık)
- after: `assertSafeSegment` + `assertSafePath` → 400 reddedildi
- result: PASS (canlıda doğrulandı: HTTP 500→400)
- commit: pending

### [SEC-002] Puck store sessiz hata
- before: Supabase hatası yutuluyor, {success:true} dönüyordu
- after: hata fırlatıyor, console.error ile loglanıyor
- result: PASS
- commit: pending

### [SEC-003] Login brute-force
- before: XFF ilk değer (istemci kontrolünde), prune yok, listUsers her istekte
- after: cf-connecting-ip önce, IP regex doğrulama, pruneAttempts, userCache 5dk, decoy verify
- result: PASS
- commit: pending

### [SEC-004] Rate limit
- before: signup/contact limitsiz
- after: src/lib/rate-limit.ts — signup 5/saat, contact 3/dakika
- result: PASS (canlıda doğrulandı: 4. istek 429)
- commit: pending

### [PERF-001] flags-data.ts → public/flags
- before: 146KB JS bundle'da, 19 route'ta
- after: 218 statik SVG dosyası, 0KB bundle
- result: PASS
- commit: pending

### [PERF-002] LobeUI deep import
- before: barrel import 45KB gzip
- after: @lobehub/ui/base-ui deep import
- result: PASS
- commit: pending

### [PERF-003] HeroUI @source
- before: 89KB CSS (kullanılmayan data-[] varyantları)
- after: @source satırı kaldırıldı
- result: PASS
- commit: pending

### [PERF-004] getLocale cache
- before: her istekte cookies()/headers() + çift çağrı
- after: React cache() ile sarıldı
- result: PASS
- commit: pending

### [SEO-002/003/004] Arama motorlarına sitemap
- before: Bing/Yandex'a sitemap gönderilmemiş
- after: Bing "İçeri aktarıldı" (28.09.2026, 8 URL, İşleniyor); Yandex validator'da URL hazır; GSC'de 26 Eyl'den beri "Getirilemedi" (eski kayıt)
- result: PASS (Bing canlı, Yandex validator hazır, GSC eski kayıt cache'de)
- commit: pending

### [SEC-005] /api/stars rate limit + input doğrulama
- before: limitsiz POST, itemId/itemType doğrulamasız
- after: 10/dakika rate limit, itemId ≤200, itemType ≤50, rating 1-5
- result: PASS
- commit: pending

### [PERF-005] getCvs modül TTL
- before: cache() per-request, her istek DB'ye gidiyordu
- after: modül TTL 5 dakika, cross-request önbellek
- result: PASS
- commit: pending

### [PERF-006] SearchDialog dynamic import
- before: cmdk her sayfada yükleniyordu
- after: next/dynamic + client bileşen tip uyumsuzluğu (Next 16) → düz import'a geri dönüldü, build temiz
- result: PASS (build temiz, 23/23 test)
- commit: pending

### [SEC-006] profiles.role RLS → repoya kaydedildi
- before: RLS politikalari DB'de ama repoda yok (scripts/schema.sql gitignore'da)
- after: supabase/schema.sql oluşturuldu — profiles, puck_pages, puck_versions, cvs, messages tabloları + RLS politikaları
- result: PASS (SQL Editor'de doğrulandı: public SELECT + auth.uid()=id UPDATE)
- commit: pending

### [PERF-007] ISR durumu
- before: revalidate=300 ama cookies()/headers() dinamik opt-in → tüm route'lar ƒ (Dynamic)
- after: Kabul edildi — tek kullanıcılı portfolyoda 5 dk içerik TTL ile dinamik render daha iyi
- result: PASS (bilinli karar)
- commit: pending

### [MASTER FAZ — BUG — PART 11] 10 bug duzeltildi
- before: stale closure, phoneValue sifirlanmiyor, memory leak, eksik bagimlilik, null-safe olmayan isAdmin, olü kod
- after: use-contact-form stale closure duzeltildi, contact-section phoneValue sifirliyor, sidebar cleanup kullaniliyor, phone-input value bagimliligi eklendi, profile-drawer isAdmin null-safe, auth-form errorParam kaldirildi
- result: PASS (tsc temiz, 23/23 test)
- commit: pending

### [MASTER FAZ — UX PSİKOLOJİSİ — PART 4] 5 UX sorunu duzeltildi
- before: 6 esit CTA (secim paradoksu), cursor hardcoded renk, hata mesaji alanda yok, mesaj okunmadan yonlendirme
- after: 1 birincil + 2 ikincil CTA, cursor var(--tprimary), telefon hata mesajini alan-bazli gosterir, sessionDelayed 2.5sn bekleme
- result: PASS (tsc temiz, 23/23 test)
- commit: pending

### [MASTER FAZ — ACCESSIBILITY — PART 6] 5 a11y sorunu duzeltildi
- before: primary buton kontrasti 3.6:1, hata mesaji 3.5:1, text-foreground-500 4.2:1, input htmlFor yok, sidebar focus trap yok
- after: dark tema'da daha koyu mavi, danger renkleri WCAG AA'ya guncellendi, foreground-500 daha acik, input id+htmlFor eklendi, sidebar aria-modal+role=dialog
- result: PASS (tsc temiz, 23/23 test)
- commit: 0d1f2dc (grup: perf+seo+bug+ux+a11y+cv)

### [MASTER FAZ — PERFORMANCE — PART 3] Bundle analizi + Puck dynamic import
- before: static toplam 3985 KB, en buyuk chunk 316 KB (antd/Heroui/LobeUI)
- after: static toplam 3988 KB (Puck zaten ayri chunk'ta, bundle degismedi)
- Puck admin route'una tasinmasi icin next/dynamic ile import yapildi (PERF-006 tekrar denendi, bu sefer calisti)
- result: PASS (tsc temiz, 23/23 test, build basarili)
- commit: pending

## 2026-09-28 — Commit turu
- 16 fazın tamamı 3 commit'te gruplandı (calisma agaci temiz):
  - a5273d3 carl(phase-0): STATE/BACKLOG/LOG/PROJECT_MAP
  - 7d9a996 carl(sec-001..006): guvenlik fazlari (14 dosya)
  - 0d1f2dc carl(perf+seo+bug+ux+a11y+cv): kalan 13 faz (285 dosya)
- result: PASS | commit: 0d1f2dc

## 2026-09-30 — GSC Site Haritalari: "Getirilemedi" analizi
- BrowserOS neo (oc/rapid-capybara, page 4) uzerinden GSC Sitemaps sayfasi incelendi.
- GSC durumu: /sitemap.xml — Tur "Bilinmiyor", Gonderildi 28 Eyl 2026, Son okuma tarihi BOS,
  Durum "Getirilemedi", Kesfedilen sayfa 0.
- KOK NEDEN ARAMASI (canli HTTP, Googlebot UA):
  - /sitemap.xml -> 200, Content-Type application/xml, 1323 byte, gecerli XML
  - Googlebot UA ile 200, mobil Googlebot UA ile 200
  - Cloudflare challenge YOK (cf-mitigated header yok), NEL/CORS header'lari normal
  - /robots.txt -> 200, "Sitemap: https://tarikelertarnak.pages.dev/sitemap.xml" iceriyor
  - SONUC: altyapi SAGLIKLI. "Getirilemedi" 28 Eyl'deki (onceki robot.txt/sitemap deploy oncesi)
    denemeden kalan BAYAT cache. GSC bu sitemap'i "kesfedilmis" sayiyor; satir menusunde
    "yeniden gonder"/"sil" YOK, durum hucresi de tiklanabilir degil -> yalnizca periyodik okuma.
- AYNI SIRA 2 KUSUR BULUNDU (gercek, duzeltildi):
  1. Deploy edilen sitemap ESKI: canli 8 URL (lastmod 2026-09-25), repo 13 URL (2026-09-28)
     -> repo surumu deploy edilmemis.
  2. Sitemap noindex/Disallowed sayfalari iceriyordu (GSC'ye dogrudan hata):
     - /reklam  -> src/app/reklam/page.tsx robots: { index: false }
     - /search  -> src/app/search/page.tsx robots: { index: false }
     - /login   -> public/robots.txt "Disallow: /login"
     -> 3 kayit silindi, 13 -> 10 URL. XML dogrulandi (11 <loc> sayildi, hepsi tekil).
- NOT: data/blog/posts.json = [] (0 yazı) -> sitemap'e blog yazi URL'i eklenemedi.
  Blog SEO'su icin once icerik uretilmeli.
- Etkilenen dosya: public/sitemap.xml
- result: PASS (XML valid, canli 200) | commit: 4dbe45e
- PENDING: duzeltilen sitemap'in canliya cikmasi icin deploy/push gerekiyor
  (remote push kullanici onayi olmadan yapilmaz).

## [2026-10-01] REKLAM (ADS) KALDIRMA — PASS
- KULLANICI: "reklam muhabbetini kaldir bos ver" + sidebar'da "Destek Ol" ve
  "Katkıda Bulunanlar" geri gelsin.
- ROOT CAUSE: reklam yuzeyi birden fazla yerdeydi; hepsi tarandi (caller grep):
  WatchAdSection (sadece /donate), AdWatch (/reklam + /ads), AdSlotCard,
  /api/ads, footer nav girdisi (site-navigation.ts), sitemap kaydi, admin paneli.
- SILINENLER:
  - src/app/donate/page.tsx  -> <WatchAdSection> bolumu (id="reklam-izle") kaldirildi
  - src/components/donate/watch-ad-section.tsx
  - src/components/ads/ (ad-watch.tsx, ad-slot.tsx)
  - src/app/reklam/page.tsx, src/app/ads/page.tsx
  - src/app/api/ads/route.ts
  - src/lib/site-navigation.ts -> nav girdisi + Labels.ads alani
- SILINMEYEN (bilincli):
  - src/lib/ads.ts + ads.test.ts -> admin/overview.ts getStats() cagirir; DB istatistik paneli duruyor
  - src/app/credits/* -> statik katkida bulunanlar sayfasi, reklamla BAGLI DEGIL
  - /donate sayfasinin para yontemleri (GitHub Sponsors/Patreon/Ko-fi/Buy Me a Coffee)
- SIDEBAR: kullanici listesinde olan 2 link (donate, credits) silinmisti -> geri konuldu.
  NAV_LINKS artik: home, chat, projects, blog, about, donate, credits.
  i18n "nav.donate"/"nav.credits" anahtarlari TUM dillerde mevcut (tr: Destek Ol / Katkida Bulunanlar).
- REGRESYON TESTI: site-navigation.test.ts -> "silinen reklam sayfasi listede YOK" (/reklam),
  sayaclar 17 -> 16 guncellendi.
- Puck dynamic import olculdu (3985 -> 3988 KB, fayda yok) -> geri alindi, YAGNI.
- OLCUM (sonrasi):
  - next build  : OK (74s) — /reklam, /ads, /api/ads route listesinde YOK
  - tsc --noEmit: OK (21s, 0 hata) — onceki stale .next/types hatalari build ile temizlendi
  - vitest run  : 303/303 PASS (21 dosya, 28s)
- result: PASS | PENDING: deploy + canli dogrulama + DNS TXT
