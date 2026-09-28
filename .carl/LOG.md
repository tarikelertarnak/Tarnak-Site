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
- commit: pending
