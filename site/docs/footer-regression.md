---
description: footer-regression — Alt bilgi (footer) testleri.
---

# Footer regresyon testleri

## `footer.test.tsx`

**Bağlam (2026-10-10, UX-007):**
Footer'da `backToTop` düğmesi `text-xs` boyutunda, `px`/`py` yok — tıklama
hedefi ~16px yükseklikte. WCAG 2.5.8 (Target Size, AA) **24×24 CSS px** minimum
istiyor; mobilde "Başa dön" yeterince dokunulabilir değil.

**Ne test eder:**

1. `footer.backToTop` butonu `min-h-11` (44px) sınıfını taşır → WCAG uyumlu
   dokunma hedefi.
2. Buton `type="button"` (form submit tetiklemez).
3. Buton `aria-label` veya görünür metin içerir → ekran okuyucu erişimi.
4. Marka metni `firstName lastName (NICKNAME)` biçiminde, seçilebilir.
5. Footer `<footer>` landmark rolü taşır.
6. Gezinme `<nav>` landmark'ı `footer.navigate` etiketiyle var.
7. Boş `copyright`/`year` görünmez.

**Negatif kontrol:**
Buton `min-h-11`'i kaldırılırsa test **kırılır** — bu, kontrolün gerçekten
bir şey ölçtüğünü kanıtlar.

**Kapsam dışı (bilerek):**
Renk/kontrast ölçümü → `theme-contrast.test.ts` zaten kapsıyor.
Görsel yerleşim (12 kolon grid, responsive) → headless test ile ölçülemez.
