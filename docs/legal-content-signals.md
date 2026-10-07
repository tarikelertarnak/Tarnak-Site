# As a condition of accessing this website, you agree to abide by the following
# content signals:

# (a)  If a content-signal = yes, you may collect content for the corresponding
#      use.
# (b)  If a content-signal = no, you may not collect content for the
#      corresponding use.
# (c)  If the website operator does not include a content signal for a
#      corresponding use, the website operator neither grants nor restricts
#      permission via content signal with respect to the corresponding use.

# The content signals and their meanings are:

# search:   building a search index and providing search results (e.g., returning
#           hyperlinks and short excerpts from your website's contents). Search does not
#           include providing AI-generated search summaries.
# ai-input: inputting content into one or more AI models (e.g., retrieval
#           augmented generation, grounding, or other real-time taking of content for
#           generative AI search answers).
# ai-train: training or fine-tuning AI models.

# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF
# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT
# AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.

# 2026-09-25: statik robots.txt — GSC "Getirilemedi" fix'i.
# onceki dinamik robots.ts, _routes.json'daki /*.txt exclude nedeniyle worker'a
# hic duselemiyordu; artik statik dosya tek kaynak (Sitemap dahil).

User-agent: *
Allow: /

# Uygulama rotalari — indekslenmemeli. Sayfalarin meta `robots` alani da
# noindex (2026-10-04); robots.txt tarama butcesi icin, meta etiketi icerik
# icin. Ikisi birlikte verilir.
Disallow: /admin        # yönetim paneli (alt rotalar dahil: prefix kurali)
Disallow: /puck         # görsel sayfa düzenleyici
Disallow: /login        # giriş formu
Disallow: /sign         # kayıt formu
Disallow: /search       # arama sonuçları — klasik duplicate content
Disallow: /auth         # OAuth callback (düşman link/param kirliliği)
Disallow: /api/         # API — indekslenmemeli

# İçerik sinyalleri (yukarıdaki şablon yorumu bunu zaten tanımlıyordu ama
# hiçbir direktif yoktu). `search=yes` arama indeksine açık anlamına gelir;
# ai-train belirtilmediği için "ne izin ver ne yasakla" (nötr) kalır.
Content-Signal: search=yes

# ── Arama motoru uyumu (2026-10-05) ───────────────────────────────────────
# Bu dosya Google, Bing ve Yandex icin TEK kaynak. Uc motor da ayni
# yonlendirme (canonical) kurallarina uyar:
#   • Google  -> sitemap.xml referansi + Search Console
#   • Bing    -> sitemap.xml + Bing Webmaster Tools (IndexNow ile hizli indeks)
#   • Yandex  -> sitemap.xml + Yandex Webmaster (xmlns:yandex doğrulaması
#                webmaster.yandex.ru/sites/ üzerinden eklenir; meta etiketi
#                sunucu tarafında verilemez çünkü dosya statik)
# Arama motoru doğrulama dosyalari her ucu de AYRI ve sunucudan 200 donmeli;
# sitemap TEK dosya olarak yukaride bir kez bildirildi — cogaltmak gerekmez.

Sitemap: https://tarikelertarnak.pages.dev/sitemap.xml
