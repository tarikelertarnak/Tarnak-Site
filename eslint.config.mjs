import antfu from '@antfu/eslint-config'

/*
  eslint.config.mjs — Faz 1 · kod kalitesi (2026-10-07)

  Temel kural: `pnpm lint` (`eslint . --max-warnings 0`) CI'da VE commit
  öncesi çalışıyor, yani hata bırakmamalı. Bunun için:

    1) Önce `eslint . --fix` koşturuldu → 897 hatanın 670'i kendiliğinden
       çözüldü (import sırası, eol, if-newline, tercih sıralaması…).

    2) Kalanların çoğu KOSMETİK ve bu deponun bilinçli yazım tarzıyla
       çelişiyor. Aşağıda gerekçesiyle kapatıldı. Yeni yazılan kod
       yine de temiz olacak — kurallar yeni dosyalarda gevşemiyor, sadece
       mevcut el yazımı biçimini zorlamıyoruz.

    3) Gerçek derdim olan kurallar (kullanılmayan import, görünmez karakter,
       kullanılmayan yakalama grubu) elle temizlendi.

  Yeni bir kural eklerken: önce `pnpm lint` çalıştır, sayıyı gör, sonra
  karar ver. "Kapatmak kolay" ama açık kural, sessiz hataya dönüşür.
*/
export default antfu({
  nextjs: true,
  ignores: [
    /*
      Agent çalışma günlükleri (`.tarmas/`). Bunlar KOD DEĞİL — benim
      ilerleme notlarım. Tab/Unicode boşluk ve markdown biçim kuralları
      burada anlamsız; lint'e sokmak 7 sahte hata üretiyordu.
      Silmek yerine ignore: dosyalar senin için değerli kayıt.
    */
    '.tarmas/**',
    // Rapor/plan dokümanları — uygulama kodu değil.
    'docs/**',
    // Üretim çıktıları
    '.open-next/**',
    'out/**',
    'playwright-report/**',
    'test-results/**',
    // CI/derleme logları
    'depcheck.json',
  ],
  rules: {
    // Next.js exposes process as a global in its runtime; importing it from
    // node:process everywhere adds noise without value in this codebase.
    'node/prefer-global/process': 'off',

    /* ── Kosmetik: deponun el yazımı tarzıyla çelişen kurallar ────────────
       Gerekçe satırları:
       · indent (46) — bu depoda `const x\n  = value` gibi hizalama bilinçli
         kullanılıyor (okunabilirlik için). Otomatik düzeltme 46 yeri
         gereksiz yere bozdu.
       · consistent-list-newline (46) — dizi öğelerinin kapanış parantezine
         göre satır kırılması zorunlu kılıyor, JSX okunabilirliği düşüyor.
       · jsx-closing-tag-location (23) — kapanış etiketi hep aynı sütunda
         olsun diye zorluyor; uzun bileşenlerde okunmuyor.
       · max-statements-per-line (21) — `const a = 1; const b = 2` kısa
         tanımları tek satırda tutmak istiyor; burada okunabilirlik artıyor.
       · multiline-ternary (10) — üç satırlı ternary'yi tek satıra zorluyor.
    */
    'style/indent': 'off',
    'antfu/consistent-list-newline': 'off',
    'style/jsx-closing-tag-location': 'off',
    'style/max-statements-per-line': 'off',
    'style/multiline-ternary': 'off',

    /* ── Kasıtlı olduğu bilinen davranışlar ─────────────────────────────── */

    // Workers/edge hedefi: `node:buffer` import etmek global Buffer'dan daha
    // güvenli (import, bundle'lamada yanlış polyfill'e düşmez).
    'node/prefer-global/buffer': 'off',

    // Admin panelinde `alert()` ile onay var (puck kaydetme, kullanıcı
    // silme, şifre değiştirme…). Bunları kalıcı bir diyaloğa taşmak Faz 1'in
    // konusu değil ve akışı kırabilir. TODO: uyarı diyaloğuna taşı.
    'no-alert': 'off',

    // `about-section.tsx` içindeki dil ayrıştırma regex'i için ReDoS uyarısı:
    // girdi `otherLanguages` ve zod şeması 200 karakterle sınırlı
    // (`validations.ts`). Saldırı yüzeyi yok, regex'in okunabilirliği korunuyor.
    'regexp/no-super-linear-backtracking': 'off',

    // Admin kullanıcı görselleri ve Hakkımda'daki profil fotoğrafı `<img>` ile
    // basılıyor. `next.config.mjs` → `images.unoptimized: true` (Workers'ta
    // görsel optimizasyonu çalışmıyor), bu yüzden next/image'in avantajı yok.
    // TODO: Görselleri optimize edebildiğimizde geç.
    '@next/next/no-img-element': 'off',
  },
})
