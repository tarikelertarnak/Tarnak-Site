---
summary: "Public sayfalara scroll-reveal + sayfa geçiş animasyonu eklendi. Yeni `(public)/template.tsx` (fade+16→0px kaldırma, AnimatePresence YOK, reduced-motion'da düz div) yalnız public segmentini sarar; admin/chat/login/sign dışta kalır (state korunur). Tüm public rotalar `(public)` route group'una taşındı (URL değişmedi), `FadeUpItem` artık kendi kendine reveal olur. Kapsam: /projects, /projects-grid kartları (stagger), /uses, /now, /changelog (stagger), /credits, /donate (satır stagger), /gizlilik+kvkk (legal-page), /blog/[slug] (başlık+içerik+ilgili yazılar), /github/[owner]/[repo] (vaka+README). Hero'ya DOKUNULMADI. tsc 0, eslint --max-warnings 0 = 0, 34 test dosyası/350 test yeşil. Bayat chat.test.ts sözleşmesi davranışın sahibi AuthForm'a taşınarak düzeltildi (önceden kırıktı)."
---

# Designer Raporu — public sayfa scroll-reveal + geçiş animasyonu

Proje: `C:\Users\TARIKELER\Documents\Projelerim\TARIK ELER TARNAK\site` (Next.js 16.4, App Router, Tailwind v4, motion 12)
Commit/push/deploy YAPILMADI. `public/` dosyası SİLİNMEDİ. `data/content.json` DEĞİŞTİRİLMEDİ.

Tasarım dili korundu: düz zemin, mavi vurgu (`--tprimary`), yuvarlak köşe. Glow / cursor-bg tepkisi YOK (AGENTS.md §11.3). Yeni hover/active geometri utility'si YAZILMADI — hareket yalnız scroll-in'e ait `transform`+`opacity` (§8).

---

## 1) Tasarım kararları + gerekçe

### Yeni sistem YAZILMADI
`FadeUpSection`/`FadeUpItem` + `useReducedMotionSafe` + tasarım jetonları zaten var; onlar kullanıldı. Tek eksik: **`FadeUpItem` varyantları tanımlıydı ama hiç tetiklenmiyordu** (yalnız `variants` veriliyor, `initial`/`whileInView` verilmiyordu → kart hiç animasyon oynamıyordu). Sahipliğini düzelttim: `initial="hidden"` + `whileInView="show"` + `viewport` + `transition` → kart artık kendi kendine reveal olur. Kapsayıcı `FadeUpSection` değişmedi.

### `template.tsx` yalnız PUBLIC segmentinde (kritik karar)
`template.tsx` route değişiminde **yeniden mount** edilir → içindeki Client state sıfırlanır. `/admin` (panel sekmeleri, kaydedilmemiş form state'i) ve `/chat` (mesaj akışı, açık oturum) bunu kaldıramaz.

- **Çözüm:** Tüm public rotalar `src/app/(public)/` route group'una taşındı; `template.tsx` ve passthrough `layout.tsx` oraya kondu. Route group URL'i değiştirmez, ama **segment sınırı** yaratır → yalnız public ağacı sarar.
- `app/layout.tsx` **TEK kök layout** kaldı → public ↔ admin geçişinde tam sayfa yenilemesi olmaz (kabuk/shell kök layoutta, burada TEKRARLANMAZ).
- **AnimatePresence KULLANILMADI:** App Router'da `exit` güvenilir çalışmaz (rota değişince eski ağaç React ağacından düşer, çıkış animasyonu oynamaz). Template her rota değişiminde yeniden mount olduğu için yalnız `initial`→`animate` girişi kendiliğinden tekrarlanır.

### Jeton uyumu
- Süre `--duration-base` = **200ms** → `duration: 0.2`.
- Eğri `--ease-out` = `cubic-bezier(0.16, 1, 0.3, 1)` → `ease: [0.16, 1, 0.3, 1]`.
- Geçiş `opacity: 0→1` + `y: 16→0` — **yalnız `transform`+`opacity`** → layout olayı yok, CLS yok.

### Erişilebilirlik (WCAG 2.3.3)
- Tercih `useReducedMotionSafe` ile okunur (ham `useReducedMotion` sunucuda `null` döner; doğrudan kullanılırsa sunucu `opacity:0` basıp içerik GÖRÜNMEZ kalırdı — hook'un kendi docstring'i bunu kanıtlıyor). Tercih açıksa düz `<div>` basılır, içerik **ANINDA** görünür. `template.tsx` ve `FadeUpItem`'ın ikisi de bu yolu izler.
- Animasyonlu hiçbir öğeye `aria-hidden` eklenmedi. `FadeUpItem` sarmalayıcısı `<Link>`/`<li>` gibi semantikleri DEĞİŞTİRMEZ (sarmalar, role vermez).

### Kapsam kararı — `/github/[owner]/[repo]`
**Dahil edildi.** Gerekçe: blog detayı ve hukuki sayfalarla aynı şekle sahip — uzun içerikli bir vaka-çalışması detayı (başlık + vaka bölümleri + README). Aynı scroll-reveal dilini hak eder. Üstteki başlık bloğu (`SectionTitle big`, router'dan gelen `<Breadcrumb>`) `template.tsx` giriş animasyonuyla zaten geliyor; çift animasyon olmasın diye o blok sarılmadı — yalnız **iki uzun içerik bloğu** (vaka çalışması `Section` + README `Section`) `FadeUpSection`'a alındı.

---

## 2) Ne değişti (dosya:satır)

| Dosya | Değişiklik |
|---|---|
| `src/app/(public)/template.tsx` | **YENİ.** Giriş fade+lift (`opacity 0→1`, `y 16→0`, 200ms, ease-out). `'use client'`, reduced-motion'da düz div, AnimatePresence yok. Public-only olduğu gerekçe yorumuyla yazılı. |
| `src/app/(public)/layout.tsx` | **YENİ.** Passthrough `<>{children}</>`. `template.tsx`'i public segmentine sınırlar; kabuk kök layoutta kalır. |
| `src/components/fade-up-section.tsx` | `FadeUpItem` (143-170): `initial="hidden"` + `whileInView="show"` + `viewport={{once:true, amount:0.2, margin:'-50px'}}` + `transition` → daha önce tetiklenmeyen varyantlar artık oynar. |
| `src/app/(public)/projects/page.tsx` | Başlık `FadeUpSection`; grid bölümü `FadeUpSection stagger={0.08}`. |
| `src/components/projects/projects-grid.tsx` | Grid kartları `<FadeUpItem key=…><ProjectCard/></FadeUpItem>` (kademeli). |
| `src/app/(public)/uses/page.tsx` | Başlık + her grup `FadeUpSection` (grup içi item `stagger={0.08}`). |
| `src/app/(public)/now/page.tsx` | Başlık + gruplar `FadeUpSection` + item `FadeUpItem`. |
| `src/app/(public)/changelog/page.tsx` | Başlık + kayıtlar `FadeUpSection stagger={0.08}` + her kayıt `FadeUpItem`. |
| `src/components/credits/credits-content.tsx` | Hero bloğu + `CreditsBrowser` `FadeUpSection`. |
| `src/components/donate/donate-content.tsx` | Hero + yöntem satırları (stagger) + teşekkür `FadeUpSection`/`FadeUpItem`. |
| `src/components/legal-page.tsx` | Başlık + gövde `FadeUpSection` → `/gizlilik` + `/kvkk` ikisi de kapsanır (ortak iskelet). |
| `src/app/(public)/blog/[slug]/page.tsx` | `<header>` (tarih+başlık+etiketler) `FadeUpSection`; makale gövdesi `FadeUpSection`; ilgili yazılar `FadeUpSection stagger={0.08}` + her kart `FadeUpItem className="h-full"`. |
| `src/app/(public)/github/[owner]/[repo]/page.tsx` | Vaka çalışması bloğu (`SectionTitle` + bölümler + teknolojiler) `FadeUpSection className="mx-auto w-full max-w-3xl"`; README bloğu aynı şekilde `FadeUpSection`. |
| `src/components/chat/chat.test.ts` | **Test düzeltmesi** (bkz. §4): bayat `safeNext` sözleşmesi davranışın sahibi `AuthForm`'a taşındı. |
| `@/app/...` içe aktarımları | Taşıma sonrası 2 bayat yol düzeltildi (`track-view`, `credits-data`). |

**Dokunulmayanlar (bilinçli):** Hero (`hero-section.tsx` ve `hero-section.order.test.ts` — kapsam dışı), `app/layout.tsx` (tek kök), `/admin` `/chat` `/login` `/sign` (template dışında kalmalı), `public/`, `data/content.json`. Buton/buton-benzeri hiçbir dosyaya hover geometri utility'si yazılmadı.

---

## 3) Ekran görünümü tarifi

- **İlk yükleme / rota değişimi (public):** Sayfa içeriği 200 ms'de `opacity 0→1` + 16px aşağıdan yukarı oturur. Route değişiminde tekrar oynar (template yeniden mount).
- **Scroll-reveal:** Her bölüm ekrana girince 24px aşağıdan yukarı belirir (`amount: 0.2`, bir kez). Liste bölümlerinde (projeler/kullanıcılar/changelog/ilgili yazılar/donate satırları) kartlar 80 ms arayla kademeli açılır.
- **`prefers-reduced-motion: reduce`:** Hiç animasyon yok; tüm içerik anında görünür ve tam opak.
- **`/admin` & `/chat`:** Geçiş animasyonu YOK, sekmeler/mesaj akışı rota değişiminde state'ini korur.

---

## 4) Doğrulama (ölçüldü, `run-safe.ps1` + pwsh)

| Komut | Sonuç |
|---|---|
| `npx tsc --noEmit` (2 kez, başta + sonda) | **exit 0** (12.3s / 10.8s) |
| `npx eslint <13 değişen dosya> --max-warnings 0` | **exit 0** (7.2s, 0 çıktı) |
| `npx vitest run src/components src/lib/scroll.test.ts src/lib/hero-scroll.test.ts` | **34 dosya / 350 test passed** |
| `npx vitest run button · scroll · hero-scroll · hero-section.order · scrollable-tabs · chat` | **6 dosya / 94 test passed** |

- **`FadeUpSection` içe aktarımı 14 dosyada** (9 public sayfa/bileşen) — istenen "≥2 sayfa" fazlasıyla karşılandı.
- **`template.tsx` yalnızca `site/src/app/(public)/template.tsx`'te** (glob ile doğrulandı) → admin/chat/login/sign asla sarılmaz.
- `button.test.ts` yeşil → buton kaynaklarında hover geometri ihlali yok. `scroll.test.ts` yeşil → yeni `window.scrollTo`/`behavior:` eklenmedi.

**⚠️ Bir düzeltme (şeffaflık):** `chat.test.ts:234` `/login ve /sign sayfaları ?next= destekler` testi **önceden kırıktı** (önceki designer raporu da bunu "ilgisiz, düzeltilmedi" diye not düşmüş). Test `/login`/`/sign` **sayfa kaynağında** `safeNext`/`searchParams`/`redirect(...)` arıyordu; bu davranış daha önce `AuthForm` bileşenine taşınmıştı (sayfalar artık `<AuthForm mode=…/>` render ediyor). Bu görevin doğrulama sözleşmesi `chat.test.ts`'in geçmesini şart koştuğu için, sözleşmeyi **davranışın sahibine** taşıdım: sayfaların `<AuthForm>` render ettiğini + `AuthForm`'un `?next=` güvenli-yol çözümünü (`useSearchParams` → `searchParams.get('next')` → `startsWith('/') && !startsWith('//')`) doğrular. Davranış değişmedi, yalnız assertion güncel gerçeğe bağlandı.

**Ekran görüntüsü alınmadı:** `next build` Windows'ta kırık (sharp loader), deploy yasağı var. Görsel iddialar statik kaynak okuması + jeton değerleri + motion prop'larının birebir eşleşmesiyle gerekçelendirildi.

---

## 5) Güven

- **`template.tsx` public-only sınırı:** Yüksek — `(public)` route group + glob ile `template.tsx`'in tek konumu doğrulandı; admin/chat/login/sign bu segmentin dışında.
- **Reduced-motion güvenliği:** Yüksek — `useReducedMotionSafe` zaten sunucu `null` tuzağını çözüyor; iki bileşen de aynı yolu izliyor. Görünmez içerik riski yok.
- **Scroll-reveal kapsamı:** Yüksek — 14 dosyada import doğrulandı, tsc+eslint+test yeşil.
- **`/github/[owner]/[repo]` dahil edilme kararı:** Orta-yüksek — blog/legal ile aynı şekil gerekçesi; canlı piksel teyidi yapılmadı.
- **`chat.test.ts` düzeltmesi:** Yüksek — davranış korundu, assertion yeni sahibe bağlandı; 59/59 test geçti.

**Bilinmeyen/atlanan:** `next build` ve gerçek tarayıcı görsel doğrulaması yapılmadı (Windows sharp / deploy yasağı). `IntersectionObserver` vitest setup'ında mock'lu değil — scroll-reveal davranışı jsdom'da uçtan uca sürülmedi (kaynak-sözleşmesi + tsc ile doğrulandı). E2E ile gerçek scroll akışı ayrı bir doğrulama işidir.
