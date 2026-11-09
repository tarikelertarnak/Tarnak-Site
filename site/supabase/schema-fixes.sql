-- ============================================================
-- Şema düzeltmeleri (2026-10-26)
--
-- 1) messages.phone kolonu: iletişim formunda telefon alanı
--    DB'de yok olduğu zaman telefon değeri body'e yazılıyor ve
--    mesaj listesi / admin panelinde "phone" sütunu düşer.
-- ============================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS phone text;

-- DDL doğrulaması
SELECT 'messages.phone eklendi' AS status
FROM information_schema.columns
WHERE table_name = 'messages' AND column_name = 'phone';
