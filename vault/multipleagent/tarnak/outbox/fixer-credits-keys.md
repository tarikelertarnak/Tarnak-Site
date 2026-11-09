---
summary: Fixed React "unique key" warning in credits-browser.tsx — team & sponsors lists now wrap render() output in <Fragment key={e.key ?? `${e.name}-${i}`}>. Real React render proof (jsdom): 1 key warning before → 0 after. ESLint --max-warnings 0 clean; new regression test passes 2/2.
---

# fixer — credits key uyarısı

## 1. Kök neden (ölçüldü, varsayılmadı)

`src/components/credits/credits-browser.tsx`:

- `shownTeam.map((e, i) => e.render(i + 1))` (eski satır 531)
- `shownSponsors.map((e, i) => e.render(i + 1))` (eski satır 566)

`e.render()` bir `<CreditRow>` elemanı döndürüyor ve bu elemanlar `<CreditGroup>`'un
`children` dizisine **doğrudan, key'siz** giriyordu. Aynı dosyadaki
contributors/translators/donors listeleri `<Fragment key=…>` ile sarılı olduğu için
uyarı yalnızca bu iki listeden geliyordu. React'in mesajı birebir üretildi (aşağıda):

```
Each child in a list should have a unique "key" prop.
Check the render method of `CreditGroup`. It was passed a child from CreditsBrowser.
```

## 2. Değişen satırlar

| Dosya | Satır (yeni) | Değişiklik |
|-------|--------------|------------|
| `src/components/credits/credits-browser.tsx` | 531-535 | `shownTeam.map((e, i) => (<Fragment key={e.key ?? `${e.name}-${i}`}>{e.render(i + 1)}</Fragment>))` |
| `src/components/credits/credits-browser.tsx` | 570-574 | `shownSponsors.map(...)` aynı desen |
| `src/components/credits/credits-browser.test.tsx` | yeni dosya | regresyon testi (render + kaynak sözleşmesi) |

Index key YAPILMADI; mevcut `Entry.key` alanı kullanıldı
(team: `x.name`, sponsors: `x.sponsor` — ikisi de benzersiz). Fallback
`${e.name}-${i}` korundu; `Fragment` zaten import edilmişti (satır 4), yeni import yok.

## 3. Dosyadaki diğer listeler — ek bulgu YOK

Tüm `.map(` çağrıları gözden geçirildi:

| Satır | Kullanım | Key gerekir mi |
|-------|----------|----------------|
| 228, 278, 300, 320, 336 | `contributors/translators/topDonors/team/leaderboard.map(x => ({ key, …, render }))` | Hayır — `Entry[]` veri üretimi, JSX children değil |
| 236 | `c.name.split(' ').map(w => w[0]).join('')` | Hayır — `string[]` → metin |
| 452, 477, 503 | `<Fragment key={e.key ?? `${e.name}-${i}`}>` | Zaten key'li |
| 531, 570 | (düzeltildi) | — |
| 402-427 toolbar | `SearchableCombobox options={[…]}` statik dizi; iç tüketim `ui/searchable-combobox.tsx:218` → `<li key={o.value}>` | Hayır, key'li |
| 529, 566, 568 | `<EmptyRow>` | Hayır — liste değil, tek child |

## 4. Konsol uyarı sayısı (önce → sonra)

**Gerçek tarayıcı (Playwright/Chromium, `next dev` @127.0.0.1:3000): `0 → 0` — bu ölçüm AYIRT EDİCİ DEĞİL.** Üç bağımsız engel ölçüldü:

1. Bu makinede `next dev` **hidrasyon yapmıyor** (`ws://127.0.0.1:3000/_next/hmr` → `ERR_INVALID_HTTP_RESPONSE`; `playwright.config.ts` yorumunda yazılı, tekrar üretildi). Kanıt: `/api/credits/leaderboard` route'u sahte veriyle mock'lanmasına rağmen **tek istek bile gitmedi**, sayfada `cr.text.loading` (sponsorsLoadingCard) EmptyRow'u kalmaya devam etti → client render hiç çalışmıyor, dolayısıyla client-side key uyarısı üretilemiyor.
2. Canlı veride beş listenin **hepsi boş** (`content.json`: team 0, contributors 0, translators 0, topDonors 0; `GET /api/credits/leaderboard` → `{"items":[]}`) → map'ler 0 child üretiyor.
3. Düzeltmeden sonra `/credits` **500** döndü — sebep bu görevle ilgisiz, başka bir ajanın uçuş halindeki düzenlemesi:
   `./src/app/api/chat/v2/route.ts:3` → `Export isPresenceState doesn't exist in target module` (`src/lib/chat-peers.ts`). Bu yüzden son Playwright koşusu DOM'a hiç ulaşamadı (`locator.fill` timeout).

**Ayırt edici kanıt (jsdom + React dev build, aynı uyarı kaynağı): `1 → 0`.**

`pnpm exec vitest run src/components/credits/credits-browser.test.tsx`
`case: team=[2 üye], leaderboard mock=[2 sponsor]` (satırların gerçekten render edildiği `findByText` ile doğrulanır):

- ÖNCE (düzeltme yok): `2 failed` — mesaj birebir:
  `Each child in a list should have a unique "key" prop... Check the render method of 'CreditGroup'. It was passed a child from CreditsBrowser.`
- SONRA (düzeltme var): `2 passed` — key uyarısı sayısı **0**.

## 5. Eklenen test

`src/components/credits/credits-browser.test.tsx` (repo deseni: `projects-grid.sort-contract.test.ts`,
`footer.test.tsx`). İki test:

1. **Davranış (asıl kanıt):** `CreditsBrowser` jsdom'da gerçek React ile render edilir (team 2,
   sponsors 2 — `/api/credits/leaderboard` fetch'i stub'lanır; `@/components/locale-provider`
   mock'lanır), `console.error` yakalanır ve `unique "key"` / React #418/#419/#423 içeren mesaj
   sayısı `0` beklenir. Satırlar render edilmediyse test **boşuna geçmez** (`findByText` guard'ı).
2. **Kaynak sözleşmesi:** `shownTeam.map` ve `shownSponsors.map` bloklarının `<Fragment key={e.key`
   ile sarmalandığını, key'siz eski biçimin (`=> e.render(i + 1))`) geri gelmediğini doğrular.

Negatif kontrol: `Fragment key` sarması kaldırılırsa **iki test de** kırılır (ölçüldü — "önce" koşusu).

## 6. Çalıştırılan komutlar

| Komut | Sonuç |
|-------|-------|
| `pnpm exec vitest run src/components/credits/credits-browser.test.tsx` (düzeltmeden ÖNCE) | `2 failed` — key uyarısı mesajı birebir çıktı |
| `pnpm exec vitest run src/components/credits/credits-browser.test.tsx` (düzeltmeden SONRA, ×2) | `2 passed` / 2 test, exit 0 |
| `pnpm exec eslint src/components/credits/credits-browser.tsx src/components/credits/credits-browser.test.tsx --max-warnings 0` | exit 0, çıktı yok (1 `antfu/top-level-function` hatası bulundu → düzeltildi → temiz) |
| `pnpm exec playwright test e2e/tmp-credits-keys.spec.ts --project=desktop` (düzeltmeden ÖNCE, gerçek Chromium) | `CREDITS_KEY_WARNINGS=0` (veri boş + hidrasyon yok) |
| `pnpm exec playwright test e2e/tmp-credits-keys.spec.ts …` (SONRA) | webServer kendi build'ini başlatmaya çalıştı → chat-peers export hatasıyla düştü; ikinci deneme (webserver'sız geçici config) `/credits` 500 olduğu için timeout |

`tsc --noEmit` çalıştırılmadı (kural gereği). Geçici Playwright spec'leri ve config'i
**Geri Dönüşüm Kutusu'na** taşındı (`e2e/tmp-credits-keys.spec.ts`, `e2e/tmp-debug.spec.ts`,
`e2e/tmp-pw.config.ts`). `content.json` ve breadcrumb dosyalarına dokunulmadı.

## 7. Kalan iş / riskler

- **Tarayıcı kanıtı alınamadı** (yukarıdaki 3 engel). Gerçek tarayıcı doğrulaması, `next dev`
  hidrasyonu çalışan bir ortamda (veya WSL'de `next build`+`next start`) ve `content.json`'da
  team ≥ 2 + leaderboard dolu iken tekrarlanmalı: beklenen sayı `0`.
- Bir Playwright denemesi kendi `next build`'ini tetikledi; build hata ile bitti. `next dev`
  `.next/dev` kullanır, çalışan sunucu etkilenmedi (500'ün kaynağı kaynak kod hatası).
  `test-results/` altında bu başarısız koşudan 3 artifact kaldı.
- Gerçek kullanıcı etkisi: uyarı yalnızca dev konsolunda görünür (React üretimde basmaz);
  düzeltme liste yeniden sıralama/filtrelemede doğru reconciliation sağlar (index'siz key).
- `/credits` şu an 500 — başka ajanın `src/lib/chat-peers.ts` işi bitince düzelir.

**Güven: yüksek** (kök neden kaynakta + jsdom'da birebir uyarı üretimi ile kanıtlı; negatif
kontrol mevcut; lint temiz). Tarayıcı konsolu kanıtı ortam engeliyle eksik — bu tek boşluk.
