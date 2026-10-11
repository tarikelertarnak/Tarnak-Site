# TARMAS PLAN — serbest otonom (2026-10-10 → 11)

## Durum (2026-10-11 kapanışı)

**Hepsi bitti:** `lint:strict` 726→0 · `tsc` 0 · `vitest` 484/484 (38 dosya) · ağaç temiz.
Branch `faz-1-guvenlik`, HEAD `bae5b59` (sonrasında docs commit).

## Yapılanlar (kanıtlı)

- **UX-013** (önceki tur): `/api/vcard` + "Kartvisiti indir" kaldırıldı; QR-only vCard;
  Discord "İletişim Bilgileri"ne taşındı; InfoRow sola yaslandı.
- **CANLI BUG**: "Yıldıza göre"/"Fork'a göre" sıralama hiç çalışmıyordu (`default-case-last`).
- **Kök düzeltme**: lint-staged Prettier/ESLint çakışması → commit bozuk kod kaydediyordu.
- **UX-007** footer a11y, **UX-010** boş durum doğrulama, ölü kod temizliği (Navigation.content,
  SettingsModal.githubUsername, ContentPlaceholder, bozuk `sign()`, AvatarDot.name, vb.).
- Backlog'daki SEC-001..005, PERF-005/006 **zaten kodda yapılmışmış** — doğrulanıp işaretlendi.

## Kalan (kullanıcı/karar gerektiren — otomatik yapılamaz)

- Deploy + Google OAuth `GOCSPX-` secret rotate (kullanıcı onayı).
- Doc-001 çok dilli CV (17 locale), SEO-011 gerçek blog yazısı, SEO-012 Bing/IndexNow.
- **Build doğrulaması**: WSL'de eksik `lightningcss.linux-x64-gnu.node` → yerelde
  `pnpm build` çalışmıyor (ortam, temiz ağaçta da). Deploy CI'da doğrulanacak.
- `public/github-data.json` her build'de regen olur (artifact).

## Yeni fırsat envanteri (gelecek turlar)

- [ ] `open-next.config.ts` / `wrangler` ayarları güncel mi (1102 sonrası).
- [ ] Lighthouse/perf: `perf:ci` CI'da çalışıyor mu, eşikler sağlıklı mı.
- [ ] Chat `/api/chat` fail-closed KV + günlük limit canlı doğrulaması.
- [ ] Admin paneli güvenlik: `/api/admin/data/[resource]` yetki kontrolü her resource için.
- [ ] Kalan ölü `infoDiscord` i18n anahtarı (8 dilde zararsız, isteğe bağlı temizlik).
