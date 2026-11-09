---
summary: "WCAG 2.1 AA erişilebilirlik denetimi — 3 HIGH, 5 MEDIUM, 4 LOW sorun. Kritik: dark tema primary buton kontrastı, hata mesajı kontrastı, sidebar focus trap eksikliği, form aria eksiklikleri."
---

# WCAG 2.1 AA Erişilebilirlik Denetimi

**Proje:** TARIK ELER TARNAK — Next.js 16 + Tailwind + framer-motion
**Tarih:** 2026-09-28
**Kapsam:** country-select, phone-input, sidebar, auth-form, contact-section, use-contact-form, profile-edit-drawer + altyapı (globals.css, input, button, drawer, modal, searchable-combobox, contact-quick-menu, settings-dropdown, top-bar, skip-link, layout)

---

## Kritik Sorunlar (HIGH)

### [HIGH] globals.css:81-82 — Dark temada primary buton beyaz metin kontrastı AA altında
- **Sorun:** `--tprimary: #3b82f6` üzerinde `--tprimary-fg: #ffffff` → **~3.6:1**. WCAG AA normal metin için **4.5:1** gerekir.
- **WCAG:** 1.4.3 Contrast (Minimum)
- **Düzeltme:** Dark tema primary'sini `#60a5fa` (blue-400) veya daha açık bir maviye çekin. `#60a5fa` on `#050507` → ~6.4:1 ✓. Veya primary-foreground'ı koyu metin yapın (ama bu tasarımda tutarsız olur).

### [HIGH] contact-section.tsx:260, auth-form.tsx:268, profile-edit-drawer.tsx:230 — Hata mesajı kontrastı her iki temada AA altında
- **Sorun:** `text-danger` (#ef4444) on `bg-danger-50` (#fef2f2) → **~3.5:1**. Hem light hem dark'ta AA'nın 4.5:1 altında.
- **WCAG:** 1.4.3 Contrast (Minimum)
- **Düzeltme:** `danger-50` yerine daha koyu bir zemin kullanın (örn. `bg-danger-100` veya `bg-danger/10` dark'ta). Veya `text-danger` yerine dark tema için `#f87171` (red-400) kullanın — ama bu da yeterli olmaz. En güvenli: `bg-danger-50` → `bg-danger-100` veya `text-danger` → `#dc2626` (red-600) light'ta.

### [HIGH] globals.css:75 — Dark temada `text-foreground-500` (#71717a) AA altında
- **Sorun:** `--tfg-500: #71717a` on `--tbg: #050507` → **~4.2:1**. AA için 4.5:1 gerekir. Bu renk sidebar admin label, contact-quick-menu channel value, auth-form subtitle, input label gibi birçok yerde kullanılıyor.
- **WCAG:** 1.4.3 Contrast (Minimum)
- **Düzeltme:** Dark tema `--tfg-500`'i `#7a7a82` veya `#80808a` gibi daha açık bir griye çekin. `#80808a` on `#050507` → ~5.1:1 ✓.

### [HIGH] sidebar.tsx:448-462 — Sidebar'da focus trap yok
- **Sorun:** `role="dialog"` + `aria-modal="true"` olmasına rağmen, dialog açıkken Tab ile dışarı çıkılabilir. Focus dialog'a taşınmıyor, sadece ESC listener var. Bu `aria-modal="true"` ile tutarsız.
- **WCAG:** 2.1.2 No Keyboard Trap (tersine — trap yok ama modal davranışı yarı yolda kalmış)
- **Düzeltme:** Drawer/Modal gibi focus trap ekleyin: açıkken `dialogRef.current?.focus()`, Tab/Shift+Tab ile dialog içinde döngü, kapanınca trigger'a focus döndür.

### [HIGH] input.tsx:72-77 — Label-input ilişkisi kurulmamış (`htmlFor` yok)
- **Sorun:** `label` prop'u `<label>` olarak render ediliyor ama `htmlFor` attribute'u YOK. Ekran okuyucu label'ı input ile ilişkilendiremez. `required` prop'u da HTML `required` attribute'una çevrilmiyor.
- **WCAG:** 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions
- **Düzeltme:** `useId()` ile input id'si üretin, `<label htmlFor={id}>` yapın, `required` prop'unu HTML `required` attribute'una çevirin.

### [HIGH] auth-form.tsx:267-272, contact-section.tsx:259-264, profile-edit-drawer.tsx:224-235 — Hata mesajlarında `aria-live` yok
- **Sorun:** Hata mesajları dinamik olarak ekleniyor/çıkarılıyor ama `aria-live="polite"` veya `role="alert"` YOK. Ekran okuyucu kullanıcılar hata duyamaz.
- **WCAG:** 4.1.3 Status Messages
- **Düzeltme:** Hata mesajı container'ına `role="alert"` (veya `aria-live="polite"`) ekleyin. `aria-invalid={isInvalid}` ve `aria-describedby` ile hata mesajına bağlayın.

---

## Orta Sorunlar (MEDIUM)

### [MEDIUM] country-select.tsx:221-250 — Klavye ile aktif satır ekran okuyucuya bildirilmiyor
- **Sorun:** `aria-activedescendant` YOK. Klavye ile ↑↓ ile gezinen kullanıcı ekran okuyucuda hangi satırın aktif olduğunu duyamaz. `aria-selected` sadece seçili olanı gösteriyor, klavye aktif satırını değil.
- **WCAG:** 4.1.2 Name, Role, Value
- **Düzeltme:** Trigger button'a `aria-activedescendant={activeId}` ekleyin, her option'a `id` verin.

### [MEDIUM] searchable-combobox.tsx:154-208 — `role="option"`, `aria-selected`, klavye navigasyonu yok
- **Sorun:** `role="listbox"` var ama `role="option"` YOK. `aria-selected` YOK. Klavye ile ↑↓ navigasyonu YOK (sadece Esc var). Bu bir listbox değil, sadece bir liste gibi davranıyor.
- **WCAG:** 4.1.2 Name, Role, Value
- **Düzeltme:** Her option'a `role="option"` + `aria-selected={active}` ekleyin. CountrySelect'teki gibi ↑↓ + Enter navigasyonu ekleyin.

### [MEDIUM] auth-form.tsx:169-194 — Tab'lar `role="tab"`, `aria-selected` yok
- **Sorun:** "Kayıt Ol | Giriş Yap" tab'ları `<button>` olarak kullanılmış ama `role="tab"`, `aria-selected`, `aria-controls` YOK. Tab panel ilişkisi yok.
- **WCAG:** 4.1.2 Name, Role, Value
- **Düzeltme:** Tab container'a `role="tablist"`, her tab'a `role="tab"` + `aria-selected` + `aria-controls` ekleyin. Panel'lere `role="tabpanel"` ekleyin.

### [MEDIUM] profile-edit-drawer.tsx:193-222 — Meslek butonları `role="radio"`, `aria-checked` yok
- **Sorun:** Meslek seçim butonları (İş veren, İş arayan, ...) toggle olarak çalışıyor ama `role="radio"` veya `aria-pressed` YOK. `Field` bileşeni `<label>` YOK, sadece `<span>` kullanıyor.
- **WCAG:** 4.1.2 Name, Role, Value
- **Düzeltme:** Container'a `role="radiogroup"`, her butona `role="radio"` + `aria-checked` ekleyin. `Field` bileşeninde `<span>` yerine `<label>` kullanın.

### [MEDIUM] globals.css:56,75 — Light temada düşük opacity'li renkler AA altında
- **Sorun:** `text-foreground/50` light'ta ~3.3:1, `text-foreground/40` ~2.9:1, `text-foreground/30` ~2.1:1. Bunlar input label, search icon, kbd, dekoratif metinler için kullanılıyor.
- **WCAG:** 1.4.3 Contrast (Minimum)
- **Düzeltme:** Light temada opacity'li renkleri artırın: `/50` → `/60` veya `/70`. Dekoratif olmayan tüm metinler için en az `/60` kullanın.

---

## Düşük Sorunlar (LOW)

### [LOW] globals.css:700-707 — cmdk input focus sıfırlama focus'u gizleyebilir
- **Sorun:** `[cmdk-input-wrapper] input:focus { outline: none !important; }` — cmdk arama input'unda focus halkası tamamen kaldırılıyor. Klavye kullanıcısı input'un odakta olduğunu göremez.
- **WCAG:** 2.4.7 Focus Visible
- **Düzeltme:** `outline: none` yerine kendi focus stillerinizi tanımlayın (örn. `box-shadow: 0 0 0 2px var(--tprimary)`).

### [LOW] sidebar.tsx:255, top-bar.tsx:124 — `text-white/30` ve `text-foreground/30` dekoratif metinler
- **Sorun:** "—" ayırıcı metinler `text-white/30` (dark'ta ~2.2:1) ve `text-foreground/30` (light'ta ~2.1:1) kullanıyor. Dekoratif olsa da WCAG teknik olarak metin olarak sayılır.
- **WCAG:** 1.4.3 Contrast (Minimum)
- **Düzeltme:** `aria-hidden="true"` ekleyin (dekoratif ise) veya opacity'yi artırın.

### [LOW] fade-up-section.tsx:25-34, sidebar.tsx:437-462, drawer.tsx:64-103 — `prefers-reduced-motion` kontrolü yok
- **Sorun:** `globals.css`'te `@media (prefers-reduced-motion: reduce)` var ama motion/react bileşenleri (framer-motion) bu medya sorgusunu okumuyor. `whileInView`, `initial/animate/exit` animasyonları reduced-motion'da çalışmaya devam ediyor.
- **WCAG:** 2.3.3 Animation from Interactions
- **Düzeltme:** `useReducedMotion()` hook'unu kullanın veya motion bileşenlerine `MotionConfig reducedMotion="user"` ekleyin.

### [LOW] contact-quick-menu.tsx:108-151 — `role="menuitem"` yok
- **Sorun:** `role="menu"` var ama `role="menuitem"` YOK. Link'ler ve butonlar menü öğesi olarak işaretlenmemiş.
- **WCAG:** 4.1.2 Name, Role, Value
- **Düzeltme:** Her `ChannelRow`'a `role="menuitem"` ekleyin (link veya button olarak).

---

## Özet Tablo

| # | Seviye | Dosya | Sorun | WCAG |
|---|--------|-------|-------|------|
| 1 | HIGH | globals.css:81 | Dark primary buton kontrastı ~3.6:1 | 1.4.3 |
| 2 | HIGH | contact-section.tsx:260 | Hata mesajı kontrastı ~3.5:1 | 1.4.3 |
| 3 | HIGH | globals.css:75 | Dark fg-500 kontrastı ~4.2:1 | 1.4.3 |
| 4 | HIGH | sidebar.tsx:448 | Focus trap yok | 2.1.2 |
| 5 | HIGH | input.tsx:72 | `htmlFor` yok | 1.3.1 |
| 6 | HIGH | auth-form.tsx:267 | `aria-live` yok | 4.1.3 |
| 7 | MEDIUM | country-select.tsx:221 | `aria-activedescendant` yok | 4.1.2 |
| 8 | MEDIUM | searchable-combobox.tsx:154 | `role="option"` yok | 4.1.2 |
| 9 | MEDIUM | auth-form.tsx:169 | `role="tab"` yok | 4.1.2 |
| 10 | MEDIUM | profile-edit-drawer.tsx:193 | `role="radio"` yok | 4.1.2 |
| 11 | MEDIUM | globals.css:56 | Light opacity kontrastı | 1.4.3 |
| 12 | LOW | globals.css:700 | cmdk focus gizleme | 2.4.7 |
| 13 | LOW | sidebar.tsx:255 | Dekoratif metin kontrastı | 1.4.3 |
| 14 | LOW | fade-up-section.tsx:25 | reduced-motion kontrolü | 2.3.3 |
| 15 | LOW | contact-quick-menu.tsx:108 | `role="menuitem"` yok | 4.1.2 |

---

## Genel Değerlendirme

**Verdict:** **fix-then-ship**

**Güven:** %90

**Gerekçe:** Site genel olarak iyi bir a11y temelene sahip (skip-link, focus-visible, aria-expanded, aria-haspopup, ESC ile kapanma, body scroll lock). Ancak 3 HIGH kontrast sorunu (dark primary buton, hata mesajları, dark fg-500) ve 2 HIGH eksiklik (focus trap, label-input ilişkisi) WCAG 2.1 AA'yı doğal olarak ihlal ediyor. Bu sorunlar düzeltilebilir — çoğu tek satır CSS/JSX değişikliği. Redo gerekmez, sadece fix-then-ship.

**Öncelik sırası:**
1. Kontrast düzeltmeleri (1, 2, 3, 11) — CSS token değişiklikleri, 30 dk
2. Focus trap + label htmlFor (4, 5) — 1-2 saat
3. aria-live + aria-invalid (6) — 30 dk
4. Rol eksiklikleri (7, 8, 9, 10, 15) — 2-3 saat
5. reduced-motion + kalan LOW'lar (12, 13, 14) — 1 saat
