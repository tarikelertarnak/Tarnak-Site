-- ============================================================
-- `/about` sayfası içeriği (2026-10-17)
--
-- SORUN: `/about` sayfasındaki biyografi `src/app/about/page.tsx` içinde
-- TypeScript sabitleriydi (TIMELINE/FOCUS/VALUES) ve içinde onaylanmamış
-- tarihler ile uydurma iddialar vardı; admin panelinden düzenlenemiyordu.
--
-- ÇÖZÜM: içerik `site_content.content->'aboutPage'` altında tutulur
-- (mevcut JSONB içerik modeli genişletildi, YENİ TABLO AÇILMADI).
-- Şema/doğrulama: `src/lib/about-page.ts` (aboutPageSchema).
-- Yönetici düzenleme yolu: /admin → Profil & Hakkımda → Hakkımda Sayfası.
--
-- ÇALIŞTIRMA: Supabase SQL Editor'de bir kez çalıştırın.
-- İDEMPOTENT ve KORUMALI:
--   · `aboutPage` YOKSA yazılır (yeni/boş kurulum).
--   · VARSA HİÇ DOKUNULMAZ → yöneticinin panelde yaptığı düzenlemeler,
--     silmeler ve çeviri değişiklikleri ezilmez. Tekrar tekrar
--     çalıştırılabilir; çoğaltma/çift anahtar üretmez.
--   · Önizleme/deneme amaçlı zorla geri yazmak isterseniz en alttaki
--     yorumlu UPDATE'i kullanın (bilinçli karar).
--
-- İÇERİK: kullanıcının verdiği TR + EN metinler BİREBİR (özellikle
-- dönem/yıl alanı bilinçli olarak boştur — uydurma tarih yoktur).
-- ============================================================

-- Ön koşul: site_content tablosu (supabase/site-content.sql).
-- Tablo yoksa aynı tanımla oluşturulur; varsa dokunulmaz.
CREATE TABLE IF NOT EXISTS public.site_content (
  id          text PRIMARY KEY DEFAULT 'main',
  content     jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_content (id, content)
VALUES ('main', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Yalnızca `aboutPage` HİÇ YOKSA (veya null ise) yaz.
UPDATE public.site_content
SET content = jsonb_set(
      content,
      '{aboutPage}',
      $about${
  "title": { "tr": "HAKKIMDA", "en": "ABOUT ME" },
  "intro": {
    "tr": "Merhaba, ben Tarık Eler. Dijital dünyada TARNAK adını kullanıyorum.\n\nYazılım geliştirmeyi öğreniyor, kendi projelerimi geliştiriyor ve teknolojiyle yeni şeyler deniyorum. HTML, CSS, JavaScript, Python, C# ve SQL ile çalışıyorum.\n\nBenim için önemli olan yalnızca bir şeyin çalışması değil, onu nasıl geliştirdiğim ve üzerinde ne kadar kontrol sahibi olduğum. Ücretsiz ve açık kaynak araçları, yerel yapay zekâyı, otomasyonu, gizliliği ve dijital özgürlüğü önemsiyorum.",
    "en": "Hi, I'm Tarık Eler. I go by TARNAK in the digital world.\n\nI'm learning software development, building my own projects, and exploring new ideas through technology. I work with HTML, CSS, JavaScript, Python, C#, and SQL.\n\nFor me, it's not just about making something work. I also care about how it's built and how much control I have over it. I value free and open-source tools, local AI, automation, privacy, and digital freedom."
  },
  "areas": [
    {
      "key": "web-development",
      "title": { "tr": "Web geliştirme", "en": "Web Development" },
      "description": {
        "tr": "HTML, CSS ve JavaScript ile web geliştirme; kendi web sitem ve web tabanlı projelerim üzerinde çalışma.",
        "en": "Building with HTML, CSS, and JavaScript, including my personal website and web-based projects."
      },
      "period": ""
    },
    {
      "key": "software-development",
      "title": { "tr": "Yazılım geliştirme", "en": "Software Development" },
      "description": {
        "tr": "Python, C# ve SQL ile programlama öğrenme ve farklı yazılım fikirlerini uygulamaya dönüştürme.",
        "en": "Learning programming with Python, C#, and SQL and turning different software ideas into practical projects."
      },
      "period": ""
    },
    {
      "key": "ai-automation",
      "title": { "tr": "Yapay zekâ ve otomasyon", "en": "AI and Automation" },
      "description": {
        "tr": "Yapay zekâ destekli araçlar, kodlama ajanları ve günlük işleri kolaylaştıran otomasyonlarla çalışma.",
        "en": "Exploring AI-powered tools, coding agents, and automation that makes everyday tasks easier."
      },
      "period": ""
    },
    {
      "key": "personal-projects",
      "title": { "tr": "Kendi araçlarım ve projelerim", "en": "My Own Tools and Projects" },
      "description": {
        "tr": "Fikirlerimi kendi projelerime dönüştürme ve çalışmalarımı TARNAK kimliği altında bir araya getirme.",
        "en": "Turning my ideas into projects and bringing my work together under the TARNAK identity."
      },
      "period": ""
    }
  ],
  "journey": [
    {
      "key": "early-beginnings",
      "title": { "tr": "İlk adımlar", "en": "The Beginning" },
      "description": {
        "tr": "Yazılıma ortaokulda, Scratch benzeri bloklarla programlama yaparak başladım.",
        "en": "I started exploring programming in middle school with block-based tools similar to Scratch."
      },
      "period": ""
    },
    {
      "key": "high-school",
      "title": { "tr": "Lise dönemi", "en": "High School" },
      "description": {
        "tr": "Bilişim alanını seçerek yazılım öğrenmeye devam ettim. 9. ve 10. sınıflarda edindiğim temelin üzerine bu yıl da yeni şeyler öğreniyorum.",
        "en": "I chose an IT-focused education and continued learning software development. I built my foundations in grades 9 and 10, and I'm continuing to learn this year."
      },
      "period": ""
    },
    {
      "key": "present",
      "title": { "tr": "Şimdi", "en": "Today" },
      "description": {
        "tr": "Web geliştirme, Python, C#, SQL ve yapay zekâ araçlarıyla kendi projelerimi geliştirmeye devam ediyorum.",
        "en": "I'm continuing to build my own projects while learning web development, Python, C#, SQL, and AI tools."
      },
      "period": ""
    }
  ],
  "values": [
    {
      "key": "freedom",
      "title": { "tr": "Özgürlük", "en": "Freedom" },
      "description": {
        "tr": "Kullandığım araçlar ve geliştirdiğim sistemler üzerinde mümkün olduğunca söz sahibi olmak istiyorum.",
        "en": "I want to have as much control as possible over the tools I use and the systems I build."
      },
      "period": ""
    },
    {
      "key": "privacy",
      "title": { "tr": "Gizlilik", "en": "Privacy" },
      "description": {
        "tr": "Verilerimin nasıl kullanıldığına ve kontrolün kimde olduğuna önem veriyorum.",
        "en": "I care about how my data is used and who has control over it."
      },
      "period": ""
    },
    {
      "key": "open-source",
      "title": { "tr": "Açık kaynak", "en": "Open Source" },
      "description": {
        "tr": "Ücretsiz ve açık kaynaklı araçları tercih ediyor, bunların sunduğu özgürlüğü önemsiyorum.",
        "en": "I prefer free and open-source tools and value the freedom they offer."
      },
      "period": ""
    },
    {
      "key": "automation-simplicity",
      "title": { "tr": "Otomasyon ve sadelik", "en": "Automation and Simplicity" },
      "description": {
        "tr": "Gereksiz karmaşıklık yerine işi kolaylaştıran, anlaşılır çözümler arıyorum.",
        "en": "I look for clear, practical solutions instead of unnecessary complexity."
      },
      "period": ""
    },
    {
      "key": "follow-through",
      "title": { "tr": "İşi yarım bırakmamak", "en": "Following Through" },
      "description": {
        "tr": "Bir fikir üzerinde çalışırken onu geliştirmeye ve mümkün olduğunca tamamlamaya önem veriyorum.",
        "en": "When I work on an idea, I aim to keep improving it and bring it to completion whenever possible."
      },
      "period": ""
    }
  ],
  "closing": {
    "tr": "Burada öğrenme sürecimi, projelerimi ve geliştirdiğim fikirleri paylaşıyorum. Neler üzerinde çalıştığımı görmek için GitHub profilime göz atabilirsin.",
    "en": "This is where I share my learning journey, projects, and ideas. Visit my GitHub profile to see what I'm working on."
  }
}$about$::jsonb,
      true
    ),
    updated_at = now()
WHERE id = 'main'
  AND (content -> 'aboutPage' IS NULL OR content -> 'aboutPage' = 'null'::jsonb);

-- Bilinçli geri yazma (yalnız gerekirse): yukarıdaki WHERE koşulunu kaldırın.
-- UPDATE public.site_content
-- SET content = jsonb_set(content, '{aboutPage}', '{}'::jsonb, true)  -- sonra seed'i çalıştır
-- WHERE id = 'main';

-- Doğrulama: kaç madde yazıldı?
SELECT
  jsonb_array_length(content -> 'aboutPage' -> 'areas')   AS alan,
  jsonb_array_length(content -> 'aboutPage' -> 'journey') AS yolculuk,
  jsonb_array_length(content -> 'aboutPage' -> 'values')  AS deger,
  content -> 'aboutPage' -> 'title' ->> 'tr'              AS baslik
FROM public.site_content
WHERE id = 'main';
