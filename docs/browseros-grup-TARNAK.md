# BrowserOS neo — açılacak grup (TARNAK)

BrowserOS neo'yu **cockpit'ten** baslat, sonra bu grup + sekmeleri ac.
neo MCP su an olu (9014 dinlemiyor) — bu dosya ajanin icin, elle acilacak.

## Grup adi
`name_session`: **`tarnak`**  (calisilan konuma gore: tarik eler tarnak site)

## Sekmeler (5)

1. **GSC — sitemap gonderimi**
   https://search.google.com/u/1/search-console/sitemaps?resource_id=https%3A%2F%2Ftarikelertarnak.pages.dev%2F&sitemap=https%3A%2F%2Ftarikelertarnak.pages.dev%2Fsitemap.xml

2. **SITE — canli ana sayfa**
   https://tarikelertarnak.pages.dev/

3. **Cloudflare — Pages projesi**
   https://dash.cloudflare.com/baa0d2e06bd52fbf27ac68fd59aaa45b/pages/view/tarikelertarnak

4. **Bing Webmaster — anahtar kelime arastirmasi**
   https://www.bing.com/webmasters/keywordresearch?siteUrl=https%3A%2F%2Ftarikelertarnak.pages.dev/

5. **Yandex Webmaster — sitemap araci**
   https://webmaster.yandex.com/site/https:tarikelertarnak.pages.dev:443/tools/sitemap/?tab=url&sitemapUrl=https%3A%2F%2Ftarikelertarnak.pages.dev%2Fsitemap.xml

## Notlar
- GSC ekrani **dogrulama sayfasi degil, sitemap gonderim sayfasi** →
  `resource_id=https%3A%2F%2F...` yani mulk tipi **URL on eki** olarak degismis.
  HTML etiketi yontemi bu ekranda calisiyor olabilir (dogrulama sonucu kullaniciya sorulacak).
- Sekmeleri `neo` ile acacaksan ayni grup adini kullan: `tarnak`.