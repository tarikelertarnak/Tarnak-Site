# TARMAS BACKLOG

## P0 — Kritik (güvenlik / veri kaybı / build)
- [ ] SEC-001 GitHub path traversal düzeltmesi doğrulandı (500→400) — `src/lib/github.ts`
- [ ] SEC-002 Puck store sessiz hata yutma kaldırıldı — `src/lib/puck/store.ts`
- [ ] SEC-003 Login brute-force: IP doğrulama + XFF güvenliği + prune — `src/app/api/auth/login/route.ts`
- [ ] SEC-004 Rate limit: signup + contact — `src/lib/rate-limit.ts` eklendi
- [ ] SEC-005 `/api/stars` POST kimlik doğrulamasız — rate limit / auth ekle
- [ ] SEC-006 `profiles.role` RLS politikası repoda yok — `scripts/schema.sql` gitignore'da

## P1 — Performans (ölü payload / bundle)
- [ ] PERF-001 flags-data.ts → public/flags/*.svg (146KB → 0KB bundle) ✓ yapıldı
- [ ] PERF-002 LobeUI barrel → deep import (45KB gzip) ✓ yapıldı
- [ ] PERF-003 HeroUI @source taraması kaldırıldı (89KB CSS) ✓ yapıldı
- [ ] PERF-004 getLocale → cache() ✓ yapıldı
- [ ] PERF-005 getCvs → modül TTL ekle (her istek DB'ye gidiyor)
- [ ] PERF-006 SearchDialog → next/dynamic (cmdk her sayfada yüklüyor)
- [ ] PERF-007 ISR: cookies()/headers() dinamik opt-in — middleware'e taşı veya kabul et
- [x] PERF-008 ISR tamamen kaldırıldı (layout.tsx `revalidate = 300` KOK NEDEN — dummy queue → sonsuz asılma) ✓ 2026-10-04
- [ ] PERF-009 Workers Paid plana geç (30 sn CPU) — **kullanıcı onayı + ödeme gerekli**, otomatik yapılamaz
- [ ] PERF-010 `/chat` `/sign` `/profil` burst'lerde 503 (force-dynamic, her istek render) — Paid plan olmadan çözüm yok

## P2 — SEO
- [ ] SEO-001 İsim varyantları: keywords + description + JSON-LD ✓ yapıldı
- [ ] SEO-002 Sitemap 13 URL ✓ yapıldı
- [ ] SEO-003 Google Search Console'a gönder
- [ ] SEO-004 Bing Webmaster'a gönder
- [ ] SEO-005 Yandex Webmaster'a gönder
- [ ] SEO-006 robots.txt güncelle (sitemap referansı)

## P3 — UX / Polish
- [ ] UX-001 Telefon combobox: daraltma + "+" dışarıda ✓ yapıldı
- [ ] UX-002 Sidebar link tıklayınca kapanma ✓ yapıldı
- [ ] UX-003 "Login"/"Sign" etiketleri ✓ yapıldı
- [ ] UX-004 Akıllı form uyarıları ✓ yapıldı
- [ ] UX-005 Mavi seçim vurgusu düzeltildi ✓ yapıldı

## Master phases (role-based sweeps)
- [ ] MASTER FAZ — BUG — PART 11
- [ ] MASTER FAZ — UX PSİKOLOJİSİ — PART 4
- [ ] MASTER FAZ — ACCESSIBILITY — PART 6
- [ ] MASTER FAZ — PERFORMANCE — PART 3
- [ ] MASTER FAZ — SECURITY — PART 2

## P4 — 2026-10-04 TARMAS faz kapanisi (tamamlandi)
- [x] SEO-007 Blog detay orce-static + generateStaticParams + dynamicParams=false (1102 kapatildi)
- [x] SEO-008 Blog soft-404: bilinmeyen slug 200 -> 404
- [x] SEO-009 Asset soft-404: 404.html uretiliyor (/yok.png 200 -> 404)
- [x] SEO-010 Sitemap blog lastModified = post.date
- [x] OPS-001 .carl -> .tarmas, /carl -> /tarmas
- [x] OPS-002 deploy-pages.sh regresyon kontrolu: 404.html artifact zorunlulugu
- [x] UX-006 whoText self-development cumlesi (tr + en)
- [ ] UX-007 Footer iyilestirmesi
- [ ] UX-008 Light theme buglari (reproduce + fix)
- [ ] UX-009 Hero description admin/Puck formunda duzenlenebilir mi — dogrula
- [ ] UX-010 Player/projects localized bos durum ("Henuz proje yok") dogrula
- [ ] DOC-001 Cok dilli CV (17 locale PDF/HTML) — **kullanici karari**
- [ ] SEO-011 Gercek blog yazisi (posts=0, uydurma icerik uretilmez)
- [ ] SEO-012 Bing verification token + IndexNow key — **kullanici**
- [ ] OPS-003 Google OAuth GOCSPX- siri rotate — **kullanici**
- [ ] OPS-004 BrowserOS neo ac (:9210 red) -> gercek tarayici/hover testi
- [x] UX-008 Light tema kontrast bug'i: `--color-foreground-500` sabitti (2.56:1 AA FAIL) -> `var(--tfg-600)` (10.44:1) · `theme-contrast.test.ts` regresyon testi

### UX-011 — capasiz gezinme + tek buton stili (2026-10-04 KAPANDI, deploy 691e0322)
- [x] Tum `#` linkleri gercek rotaya (`/projects/ /about/ /blog/ /contact/ /chat/`)
- [x] Yeni `src/app/contact/page.tsx` + copy-worker PAGES + deploy prime listesi
- [x] Alty hero butonu tek `bordered` stili (light: siyah yazni)
- [x] `CvPicker` `{...rest}` sizdirmesi duzeltildi (varyant/className artik gecerli)
- [x] `TARIK ELER -` / `TARNAK` iki satir, capraz hover kaldirildi
- [x] `hover:border-white/50` light override eklendi
- [x] Regresyon: `src/lib/no-hash-links.test.ts` (JSX + obje literal, negatif kontrol dogrulandi)
- [x] Skill: `browseros-neo/SKILL.md` cold-start proseduru (chrome + claw-server, portlar, `site-theme` tuzagi)
- [ ] Kalan: `admin-panel.tsx` pre-existing lint hatalari (7) — bu fazda kapsam disi
