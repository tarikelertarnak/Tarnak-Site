# Faz 1 · Sır Yönetimi — Bulgular

Tarih: 2026-10-07
Kapsam: kaynak kod + **git geçmişi** (2564 nesne, 1096 metin blob tarandı)

## Kaynak kod: TEMİZ

`.env.example` dışında hiçbir dosyada gömülü anahtar yok.
Tarama: `gitleaks` kalıpları + 8 ek desen (Supabase service_role JWT, GOCSPX-,
GitHub PAT, OpenAI, Anthropic, PEM, AWS, aisa/atmos/groq).

`.env*` `.gitignore`'da (`.env.example` hariç).
`tarikelertarnak.pages.dev.txt` (Supabase credential dosyası) `.gitignore`'da.

## GIT GEÇMİŞİ: GERÇEK SIZINTI — ACİL

**Google OAuth client secret (`GOCSPX-…`) commit'lendi.**

| | |
|---|---|
| Dosya | `progress.md` (artık repoda DEĞİL, `.gitignore`'landı) |
| Commit'ler | `0d1f2dc`, `49da9b0` |
| Repo | `https://github.com/tarikelertarnak/Tarnak-Site` — **PUBLIC** |
| Durum | `.env.local`'daki `GOOGLE_CLIENT_SECRET` **aynen bu sızan anahtar** (35 karakter, `GOCSPX-` ile başlıyor) |

### Neden acil
Repo herkese açık. `git log -p` ile **herkes** anahtarı okuyabilir. Dosyayı
kaldırmak yetmez: commit geçmişi hâlâ yayında.

### Yapılacak (SIRA ÖNEMLİ)
1. **Google Cloud Console → APIs & Services → Credentials** → ilgili OAuth
   Client'ı aç → **Client secret'ı SİL/YENİLE**. Eskisi artık geçersiz olur.
2. Yeni secret'ı `.env.local`'e yaz.
3. Google Cloud Console → **OAuth consent screen / Client** kısmından yeni
   secret ile giriş akışını doğrula (`/api/auth/google`).
4. (İsteğe bağlı ama önerilir) Geçmişi temizle:
   `git filter-repo --path progress.md --invert-paths` → force-push.
   **Push yalnızca senin onayınla yapılır.**

### Not: gitleaks kurulu DEĞİL
`.gitleaks.toml` hazırlandı ama binary bu makinede yok. Komutlar:

```
winget install Gitleaks.Gitleaks
gitleaks detect --redact              # geçmişi tara
gitleaks protect --staged --redact    # commit öncesi (husky çağıracak)
```
