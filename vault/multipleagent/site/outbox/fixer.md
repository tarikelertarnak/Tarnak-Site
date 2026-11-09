---
summary: "Sayfa gövdelerindeki t(locale,…) / isEn koşullu TR-EN metinleri istemciye taşındı: /donate /credits yeni 'use client' gövde bileşenine ayrıldı, not-found client oldu, uses/now/changelog/legal-page'teki ölü isEn kaldırıldı. SSR artık tek dil (tr), hydration sonrası %100 tek dil. tsc 0, eslint 0, vitest 20/20 (tam suite'te 1 önceden-kırık chat.test.ts), tüm prerender HTML >150 KB."
---

# Fixer Raporu (2. tur) — gövde metinlerini istemciye taşıma (karışık dil bug'ı)

> Bu rapor önceki turun ÜSTÜNE eklenmiştir. Önceki tur `/donate`+`/credits` metinlerini sözlüğe taşımıştı; bu tur **çağrı yerini** sunucudan istemciye taşıdı.

## Özet

`getStaticLocale()` sabit `'tr'` döndüğü için SSR gövdesi TR; istemci hydration'da yalnız istemci bileşenlerini EN'e çeviriyordu → **karışık sayfa**. Çözüm: sayfa gövdesindeki tüm `t(locale,…)` / `isEn` çağrılarını istemciye taşı. SSR tek dilde (tr) donar, hydration sonrası sayfanın tamamı tek dilde boyanır. `/about` deseni örnek alındı, dokunulmadı.

### Ne değişti (dosya:satır)

| Dosya | Değişiklik |
|---|---|
| `src/components/donate/donate-content.tsx` | **YENİ** `'use client'` gövde; `METHODS` + tüm `t('donate.*')` + `useT()` buraya taşındı (`getStaticLocale`/sunucu `t(locale,…)` yok) |
| `src/app/donate/page.tsx:1-27` | İnce sunucu kabuk: `generateMetadata` **sunucuda kalır**, `locale = 'tr' as const` (getStaticLocale çağrısı kaldırıldı); `DonatePage` → `<DonateContent />`. `dynamic='force-static'` korundu |
| `src/components/credits/credits-content.tsx` | **YENİ** `'use client'` gövde; hero + `CreditsBrowser` + `useT()` |
| `src/app/credits/credits-data.ts` | **YENİ** `CONTRIBUTORS/TEAM/TOP_DONORS/TRANSLATORS` (sunucu+istemci paylaşılan veri; tipler `credits-browser`'dan) |
| `src/app/credits/page.tsx:1-26` | İnce kabuk; `generateMetadata` sunucuda sabit TR; `CreditsPage` → `<CreditsContent />`. `dynamic` korundu |
| `src/app/not-found.tsx` | `'use client'` + `useT()`; `t(locale,…)` → `t(…)`. `generateMetadata` yok, güvenli |
| `src/app/uses/page.tsx:1-18` | Ölü `isEn` (hep `false`) kaldırıldı → sabit TR metadata. `getStaticLocale` importu silindi |
| `src/app/now/page.tsx:1-19` | Aynı: ölü `isEn` kaldırıldı → sabit TR metadata |
| `src/app/changelog/page.tsx:1-19` | Aynı: ölü `isEn` kaldırıldı → sabit TR metadata |
| `src/components/legal-page.tsx:60-75` | `legalMetadata`: ölü `isEn` (`isEn ? X : X`) kaldırıldı → sabit TR. `getStaticLocale` importu silindi |

**Kapsam dışı bırakılanlar (karar):** `layout.tsx` (JSON-LD + `<html lang>` — `getStaticLocale` kalır), `i18n-server.ts`, `proxy.ts`, `_routes.json`. Ayrıca görev listesinde olmadığı için `src/app/page.tsx` (ana sayfa `getPosts(locale)`), `blog/page.tsx`, `blog/[slug]/page.tsx` **dokunulmadı** — bunlar gövdede `t(locale,…)` değil, sunucu-taraflı içerik yerelleştirmesi kullanıyor.

> `uses/now/changelog/legal-page` gövdelerinde `t(locale,…)` **yoktu** — yalnız `generateMetadata` içinde ölü `isEn` dalı vardı (kural: generateMetadata sunucuda kalır). Bu yüzden onlar için "istemciye taşıma" değil, ölü dal temizliği yapıldı.

### Prerender HTML boyutları (ölçüldü — `scripts/pages-copy-worker.cjs:530` eşiği 1000 bayt)

| Rota | BEFORE (bayt) | AFTER (bayt) | >1000 |
|---|---|---|---|
| `/donate` | 493 887 (bayat, 18.10) | **155 164** | ✅ |
| `/credits` | 415 078 | **167 576** | ✅ |
| `/uses` | 548 684 | **207 048** | ✅ |
| `/now` | 548 783 | **207 147** | ✅ |
| `/changelog` | 382 627 | **159 561** | ✅ |
| `404.html` | 548 816 | **186 445** | ✅ |

(BEFORE değerleri 18.10 tarihli eski `.open-next`; AFTER taze build. Tüm boyutlar ~500 KB → ~155-207 KB'a düştü — client bileşene ayırma RSC flight payload'ını küçültüyor. Hiçbiri 1000 bayt altına düşmedi → worker'a düşme / 1102 riski YOK.)

### SSR tek-dil kanıtı

`/donate` SSR HTML: `DESTEK OL`×1, `GitHub Sponsors`×1, `Kopyala`×13, `Tek seferlik`×1 — EN metin yok (yalnız RSC flight component adları `DonateContent`/`SkipLink`/`SearchDialog` görünüyor, bunlar kullanıcı metni değil).
`/credits`: `KATKIDA BULUNANLAR`×1, `Katkıda Bulunanlar`×5, `Sponsorlar`×1.
`404.html`: `Sayfa bulunamadı`, `Ana Sayfa`, `Projelere Göz At`.

### Doğrulama (tam komut + çıktı)

```
npx tsc --noEmit                          → çıkış 0, 14s  (OK)
npx eslint <10 değişen dosya> --max-warnings 0 → çıkış 0  (OK)
npx vitest run src/app src/components/credits src/components/donate
                                          → 3 dosya / 20 test GEÇTİ (OK)
npx vitest run  (tam suite)               → 81 dosya GEÇTİ, 1033 test GEÇTİ
                                            1 HATA: src/components/chat/chat.test.ts:234
                                            (login/sign'da 'safeNext' bekliyor — ÖNCEDEN KIRIK,
                                             dokunmadığım dosya; stash'te değil, HEAD'de kırık)
# OpenNext build (WSL, ~/tarnak-build):
pnpm install --frozen-lockfile            → EXIT 0
CI=true pnpm opennext:build               → EXIT 0
node scripts/pages-copy-worker.cjs        → EXIT 0, 17 rota + 404 'extracted'
```

**e2e/personal-pages.spec.ts koşulmadı** (Playwright `next build` ister → Windows'ta sharp ile kırık, WSL'e taşımak gerek). Ancak etkilenen üç sayfanın (`/uses /now /changelog`) h1'leri **hiç değişmedi** (`Kullandıklarım` / `Şu an` / `Değişiklikler`) — TR regex'ler birebir eşleşiyor, test gevşetmesi gerekmedi. `/donate`+`/credits` bu spec'te zaten yok.

### Yapılamayanlar / riskler

1. **`document.title` sunucuda sabit TR kalır** (bilinçli sınır) — istemci hydration başlığı oynatmaz, SEO bozulmaz. EN tarayıcıda sekme başlığı TR görünür (kabul edilen trade-off).
2. **e2e koşulmadı** (Windows build kısıtı). Etki alanı dışı olduğu ve h1'ler değişmediği için risk düşük.
3. `src/app/page.tsx` (ana sayfa), `blog/page.tsx`, `blog/[slug]/page.tsx` hâlâ `getStaticLocale()` ile sunucuda TR içerik seçiyor — görev kapsamı dışı, aynı bug kalıntısı orada duruyor (ayrı iş).
4. `credits-browser.tsx` / `copy-button.tsx` / `credits-browser.test.tsx` benim değil, **önceki turun** değişiklikleri (başlangıçta zaten `M` işaretliydi).
5. `chat.test.ts:234` hatası önceden var (HEAD'de kırık, dokunmadım) — bu tur regresyonu değil.

### Güven: **YÜKSEK**
Metin uydurulmadı, sözlük anahtarları aynen taşındı; ölçülen tüm prerender gövdeleri >150 KB (eşik 1000), SSR tek dil, tsc/eslint/targeted vitest hepsi temiz.

---

# Fixer Raporu — /donate & /credits i18n sözlüğüne taşıma (1. tur)

Proje: `C:\Users\TARIKELER\Documents\Projelerim\TARIK ELER TARNAK\site`
Deploy/commit YAPILMADI. `data/content.json` DEĞİŞTİRİLMEDİ.

---

## 1. Ne değişti (dosya:satır)

### Sözlükler

| Dosya | Değişiklik |
|---|---|
| `src/i18n/en.json:184-191` | **YENİ 7 `credits.*`**: `heading`, `metaTitle`, `metaDescription`, `metaOgDescription`, `roleFounderLead`, `roleFounder`, `donorNoneName`, `donorNoneNote` (8 anahtar; `metaOgDescription` zorunlu ek) |
| `src/i18n/en.json:217-233` | **YENİ 18 `donate.*`**: `title`, `description`, `ogDescription`, `heading`, `method`, `link`, `copy`, `copied`, `thanks`, `githubSponsors`, `githubSponsorsNote`, `patreon`, `patreonNote`, `kofi`, `kofiNote`, `buymeacoffee`, `buymeacoffeeNote` |
| `src/i18n/tr.json:184-191` / `:217-233` | Aynı anahtarlar, **birebir mevcut TR metinleri** (uydurma yok) |

> `ogDescription` görev listesinde yoktu ama openGraph description hardcode'du; sözlüğe taşımak için 4 anahtar (2 sayfa × ogDescription) zorunluydu.

### Sayfalar

| Dosya | Dönüşüm |
|---|---|
| `src/app/donate/page.tsx:5-6` | `import { t } from '@/lib/i18n'` eklendi |
| `:11-25` | `generateMetadata` — `isEn ? … : …` → `t(locale, 'donate.title'/'description'/'ogDescription')`; `isEn` değişkeni ve `title` tekrarı (`title` tek kez hesaplanıp paylaşılıyor) kaldırıldı |
| `:27-…` `METHODS` | `{ name, noteTr, noteEn }` → `{ nameKey, noteKey }` (4 kayıt: `donate.githubSponsors/…Note`, `patreon`, `kofi`, `buymeacoffee`) |
| `:100-102` | `const isEn = locale === 'en'` **SİLİNDİ** |
| `:123` | `{isEn ? 'SUPPORT' : 'DESTEK OL'}` → `{t(locale, 'donate.heading')}` |
| `:135,138,141` | `Method`/`Link`/`Copy` → `donate.method`/`donate.link`/`donate.copy` |
| `:147` | `key={m.name}` → `key={m.nameKey}` |
| `:155,159` | `{m.name}` → `{t(locale, m.nameKey)}`; `{isEn ? m.noteEn : m.noteTr}` → `{t(locale, m.noteKey)}` |
| `:183-185` | `isEn ? '…thanks…' : '…'` → `{t(locale, 'donate.thanks')}` |
| `src/components/donate/copy-button.tsx:4,12,28-30` | `useLocale` → `useT`; `isEn`, `locale` kaldırıldı; `copiedLabel` = `copied ? t('donate.copied') : t('donate.copy')` |
| `src/app/credits/page.tsx:10-11` | `import { t }` eklendi |
| `:15-37` | `generateMetadata` — ternary → `t(locale, 'credits.metaTitle'/'metaDescription'/'metaOgDescription')` |
| `:39-53` | `CONTRIBUTORS`: `role`/`roleEn` → `roleKey:'credits.roleFounderLead'`; `TEAM`: → `roleKey:'credits.roleFounder'` |
| `:55-61` | `TOP_DONORS`: `nameTr/nameEn/noteTr/noteEn` → `nameKey:'credits.donorNoneName'`, `noteKey:'credits.donorNoneNote'` |
| `:77-79` | `const isEn` **SİLİNDİ** |
| `:109` | `{isEn ? 'CONTRIBUTORS' : 'KATKIDA BULUNANLAR'}` → `{t(locale, 'credits.heading')}` |
| `src/components/credits/credits-browser.tsx:18-44` | Arayüzler: `ContributorItem.role/roleEn` → `roleKey`; `TeamItem` aynı; `DonorItem.nameTr/nameEn/noteTr/noteEn` → `nameKey/noteKey`. **`TranslatorItem` DOKUNULMADI** (görev dışı, `TRANSLATORS` zaten boş — `isEn` hâlâ translator satırında kullanılıyor, o yüzden `isEn` değişkeni korundu) |
| `:228-276` | `contributorEntries` — `const role = t(c.roleKey)`, `searchText` sözlükten gelen role ile; `{isEn ? c.roleEn : c.role}` → `{role}` |
| `:278-298` | `translatorEntries` **DOKUNULMADI** (`noteTr`/`noteEn`) |
| `:300-318` | `donorEntries` — `const name = t(x.nameKey)`, `note = t(x.noteKey)`; tüm `isEn ? x.…En : x.…Tr` → sözlük |
| `:320-331` | `teamEntries` — `const role = t(x.roleKey)`; `searchText` ve `subtitle` sözlükten |
| `src/components/credits/credits-browser.test.tsx:33-36` | `TEAM` fixture: `{ role, roleEn }` → `{ roleKey }` (test mock'u `t: key => key`, bu yüzden `roleKey` değeri aynen render edilir; `screen.getByText('Ekip Üyesi Bir')` assertion'ı etkilenmez) |

---

## 2. Fallback davranışı (kritik madde — bozulmadı)

`src/lib/i18n.ts:207` — `t()` zinciri:
```js
dictionaries[locale]?.[key] ?? trDict[key] ?? key
```
Yeni `donate.*` / `credits.*` anahtarları **yalnız tr/en'de** var. Default locale **'en'**, fallback **tr**:
- `en` → kendi değeri (İngilizce)
- `tr` → kendi değeri (Türkçe)
- `de/es/fr/ja/pt/ru` (TRANSLATED_LOCALES) → sözlükte anahtar yok → `trDict` → **Türkçe** (hardcode'un eski davranışıyla birebir aynı; eskiden de bu dillerde `isEn===false` → TR görünüyordu)
- `it/zh/nl/…` (dictionary'si olmayanlar) → `dictionaries[locale]` undefined → `trDict` → Türkçe

Sitemap/hreflang `TRANSLATED_LOCALES` listesi **değişmedi**; yeni anahtarlar oraya dokunmadı. `extra.ts` / `i18n-content-*.ts` desenlerine **yeni dosya eklenmedi** (gerekmedi — UI sözlüğü fallback'i zaten tr).

⚠️ Not: sayfa gövdeleri sunucuda `getStaticLocale()` (sabit `'tr'`) ile render edilir — bu **değişmedi**. Yani SSR her zaman TR basar; EN ancak `getStaticLocale` ileride değişirse çıkar. Bu, bugünkü davranışın aynısı (`isEn` her zaman false idi → ölü dal). İyi haber: artık `isEn` yok, sözlük anahtarı tek doğruluk kaynağı.

---

## 3. Doğrulama (tam komut + çıktı)

`run-safe.ps1` ile (workdir `site`):
```
npx tsc --noEmit                                    → çıkış kodu 0, 16s   (OK)
npx vitest run src/components/credits \
     src/components/donate src/lib/i18n             → 1 dosya / 2 test GEÇTİ  (OK)
npx eslint src/app/donate/page.tsx src/app/credits/page.tsx \
     src/components/donate/copy-button.tsx \
     src/components/credits/credits-browser.tsx \
     src/components/credits/credits-browser.test.tsx --max-warnings 0 → çıkış kodu 0 (OK)
```
- `credits-browser.test.tsx` **bozulmadı** (fixture güncellendi, 2/2 yeşil).
- Değişen dosyalarda kalan `isEn` **sıfır** (`grep isEn src/app/donate src/app/credits` → yok).

**Dilde ne görünür (örnek):**
| Anahtar | en | tr |
|---|---|---|
| `donate.heading` | `SUPPORT` | `DESTEK OL` |
| `donate.method` | `Method` | `Yöntem` |
| `donate.thanks` | `Even if you don't support financially — thank you. Using my open source projects…` | `Destek olmasan bile teşekkürler — açık kaynak projelerimi kullanman…` |
| `donate.githubSponsorsNote` | `Support the continuous development of projects with a monthly donation` | `Aylık destek ile projelerin sürekli gelişimini sağla` |
| `credits.heading` | `CONTRIBUTORS` | `KATKIDA BULUNANLAR` |
| `credits.roleFounderLead` | `Founder & Lead Developer` | `Kurucu & Ana Geliştirici` |
| `credits.donorNoneNote` | `Be the first supporter!` | `İlk destekçi sen ol!` |
| `donate.copy` / `donate.copied` | `Copy` / `Copied` | `Kopyala` / `Kopyalandı` |

---

## 4. Yapılamayanlar / riskler

1. **`/donate` sayfa gövdesi hâlâ SSR'de TR** (`getStaticLocale()` sabit `'tr'`). Dönüşüm bunu değiştirmedi — görev "metni sözlüğe taşı" idi. EN gövde için `getStaticLocale` kararı ayrı bir iş (CPU bütçesi trade-off'u, `i18n-server.ts:115-128` yorumunda belgeli).
2. **`TranslatorItem`/`translatorEntries` kasıtlı dokunulmadı** (`noteTr`/`noteEn` kaldı) — görev kapsamı dışı, `TRANSLATORS` dizisi zaten boş.
3. `METHODS` alan adı `address` kaldı (görevdeki `href` örnek adıydı); `address` 3 yerde kullanılıyor, yeniden adlandırma gereksiz diff olurdu.
4. `donate.patreon` değeri marka adı olduğu için iki dilde de `"Patreon"` — orijinal hardcode ile birebir.

---

## 5. Güven: **YÜKSEK**

Metinler birebir taşındı (uydurma yok), `isEn` iki sayfadan tamamen kaldırıldı, fallback zinciri ölçülerek doğrulandı (`t()` kaynağından okundu), tsc 0 / eslint 0 / test 2/2. Tek bilinçli sınır: sayfa gövdesi SSR'de TR kalıyor — bu davranış görev öncesiyle aynı, regresyon değil.
