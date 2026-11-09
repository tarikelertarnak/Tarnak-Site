---
summary: Removed the visible breadcrumb block (Breadcrumb + BreadcrumbJsonLd) from /projects, /blog, /about and rebalanced the top gap so all three start with the same distance below the header. Measured with Playwright at 1280x900 / 768x1024 / 390x844: before 260/325/260 and 224/217/224px, after 128/129/128 and 112/113/112px. eslint --max-warnings 0 on the 3 files: clean.
---

# Kaldırılan breadcrumb + üst boşluk dengesi

## 1. Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/app/projects/page.tsx` | `Breadcrumb, BreadcrumbJsonLd` importu (eski satır 2) ve `CRUMBS` importu (eski satır 8) silindi; görünür breadcrumb kabı (eski satır 36-40, 5 satır) silindi. Ek olarak aynı dosyadaki boşluk yorumundaki bayat ölçüm güncellendi (`navbar→başlık 148px` → `128px`). `Section` üst padding'i **değişmedi** (`pt-28 sm:pt-32`). |
| `src/app/blog/page.tsx` | Aynı iki import (eski satır 2, 7) ve breadcrumb kabı (eski satır 43-47) silindi. `<BlogSection posts={posts} />` `<div className="mt-2 sm:-mt-4 lg:-mt-16">` sarmalayıcısına alındı (üst boşluğu diğer iki sayfaya eşitlemek için). `async` ve `export const dynamic = 'force-static'` korundu. |
| `src/app/about/page.tsx` | Aynı iki import (eski satır 1, 20) ve breadcrumb kabı (eski satır 224-228) silindi. `Section` üst padding'i (`pt-28 sm:pt-32`) **değişmedi**. |

- Silinen: 3 × 5 satır breadcrumb kabı + 6 import satırı (toplam 21 satır).
- Eklenen: blog'da 6 satırlık sarmalayıcı + kısa gerekçe yorumu.
- `src/components/breadcrumb.tsx` ve `src/lib/breadcrumb.ts` **elle dokunulmadı** (hâlâ `/contact` ve `/github/[owner]/[repo]` kullanıyor; `CRUMBS` 301 haritası yerinde).

## 2. Ölçüm (Playwright, geçici spec `e2e/tmp-breadcrumb.spec.ts` — koşum sonrası silindi)

Ölçüm tanımı: `page.setViewportSize` + `emulateMedia({reducedMotion:'reduce'})` → `domcontentloaded` + 1200 ms → `gap = y(main'in ilk h1/h2 elemanı) − y(TopBar spacer'ının alt kenarı = 56 px)`. Spec'te hiç `expect` yok; değerler `console.log` ile basıldı.

| Sayfa | 1280×900 ÖNCE | 1280×900 SONRA | 768×1024 SONRA | 390×844 ÖNCE | 390×844 SONRA |
|---|---|---|---|---|---|
| /projects | 260 px | **128** | 128 | 224 px | **112** |
| /blog | 325 px | **129** | 129 | 217 px | **113** |
| /about | 260 px | **128** | 128 | 224 px | **112** |

Üç sayfa arasındaki fark: ≤1 px (istenen tolerans ±4 px), hedef aralık 90-130 px ✓.

Komut: `pnpm.exe exec playwright test e2e/tmp-breadcrumb.spec.ts --project=desktop` (koşum `run-safe.ps1` ile, 300 s limit).
Not: koşumlar exit 1 döndü — sebep Playwright'ın trace dosyasını kapatırken verdiği `ENOENT ...-recording*.network` hatası (bu makinede bilinen flake); spec'te assert olmadığı için ölçüm satırları etkilenmedi, 9/9 satır basıldı.

## 3. Doğrulama

```
pnpm.exe exec eslint src/app/projects/page.tsx src/app/blog/page.tsx src/app/about/page.tsx --max-warnings 0
→ çıkış kodu 0, çıktı yok
```
İstenildiği gibi `tsc --noEmit` çalıştırılmadı (paralel ajan + CPU).
Kalan breadcrumb kullanımları kontrol edildi: yalnız `/contact` ve `/github/[owner]/[repo]`.

## 4. Yapılmayanlar / riskler

- Blog'un hizalanması `sm`/`lg` kırılımlarında **negatif margin** ile yapıldı (`-mt-4`, `-mt-16`). Blog'un üst dolgusu `src/components/sections/blog-section.tsx` içinde ve bu görevde o dosyaya dokunmak yasaktı; görevde verilen "üç dosyadaki üst padding" ifadesiyle blog sayfası düzeltilemediği için fark sayfa seviyesinde kapatıldı. Yan etki: 1024 px üstünde blog `section` kutusunun en üst 8 px'i viewport üstünde kalır — o kısım tamamen padding, görünen hiçbir içerik (h1) kırpılmıyor (h1 header'ın 129 px altında).
  - Kalıcı çözüm istenirse: `BlogSection`'a üst padding için opsiyonel prop eklemek (kapsam dışı bırakıldı).
- Bu üç rotada artık görünür breadcrumb + `BreadcrumbList` JSON-LD **yok** (kaldırmanın doğal sonucu). `CRUMBS['/projects'|'/blog'|'/about']` girdileri bu sayfalarda kullanılmıyor ama dosyada duruyor.
- Ölçüm sırasında dev sunucusu kısa süre 500 döndü: paralel çalışan başka bir ajanın `src/app/api/chat/v2/route.ts` dosyası `@/lib/chat-peers`'tan var olmayan `isPresenceState`'i import ediyordu (o ajanın refactor'ı, benim değişikliğim değil). Düzeldikten sonra ölçüm alındı.
- Sadece 1280 ve 390 zorunluydu; tutarlılığı kanıtlamak için 768×1024 de ölçüldü.

## 5. Güven

**Yüksek.** Üç sayfanın üst boşluğu tarayıcıda ölçüldü (tahmin yok), fark ≤1 px, eslint temiz. Tek bilinmeyen: negatif margin yaklaşımının uzun vadeli estetiği — ölçümle doğrulandı, davranış doğru.
