# OpenCode için hazır prompt

Aşağıdaki bloğu **olduğu gibi** kopyalayıp opencode'ye yapıştır. Başka hiçbir şey yazmana gerek yok.

---

```
REPO: C:\Users\TARIKELER\Documents\Projelerim\TARIK ELER TARNAK\site
GitHub token'ın var, repo: github.com/tarikelertarnak/Tarnak-Site

GÖREV: Aşağıdaki 6 adımı sırayla yap. Soru sorma, sadece yap ve sonucu raporla.

=== ⛔ ÖNCE OKU: YASAK KOMUTLAR ===
Bu repoda `public/` klasörü daha önce 3 kez silindi ve her seferinde
`git checkout -- public/` ile kurtarıldı. Kaynağı senin (opencode) çalıştırdığın
`git reset --hard` / `git clean -fd` tarzı komutlar.

BU YÜZDEN ŞUNLAR KESİNLİKLE YASAK:
  - git reset --hard
  - git clean -fd / git clean -fdx
  - git checkout . / git restore . (tüm ağaç üzerinde)
  - rm -rf public / del /S public / Remove-Item -Recurse public
  - git stash drop / git stash clear
Yalnızca tek tek dosya hedefleyen komutlar kullan.

=== ADIM 1: Repo durumunu doğrula ===
git status --porcelain
git log --oneline -5

BEKLENEN: HEAD = 07bd406, `public/` altında HİÇ `D` (silinmiş) satırı olmamalı.
EĞER `git status` içinde ` D public/...` satırı görürsen → DUR ve şunu çalıştır:
  git checkout -- public/
Sonra 18 dosya var mı diye kontrol et:
  git ls-files public | wc -l     # 18 olmalı
  find public -type f -size 0 | wc -l   # 0 olmalı
Devam etmeden önce bunu garanti et.

NOT: `.pages-rebuild.counter` dosyası kirli görünecek. Ona DOKUNMA, commit etme.

=== ADIM 2: 3 commit'i master'a push et ===
git push origin master

Bu push 3 commit gönderecek (hepsi yerelde hazır, yeniden commit üretme):
  07bd406  perf(assets): PNG'ler kayipsiz yeniden sikistirildi (-588 KB, %37)
  b3258e6  fix(seo,perf): canonical URL bugu, dinamik sitemap/robots, statik varlik cache'i
  f756017  fix(security): kritik auth bypass + acik GitHub proxy + arcjet/undici zinciri

KURALLAR:
  - --force / -f KULLANMA. Rebase yapma. Amend yapma. Yeni commit ATMA.
  - Push reddedilirse (non-fast-forward): DUR, force-push YAPMA, bana raporla.
  - Push başarılıysa doğrula:
      git ls-remote origin master
    (çıktı 07bd406 ile başlamalı)

=== ADIM 3: Ölü dependabot branch'lerini sil ===
Bu 4 branch build hatasının kaynağıydı (eski commit'lerde korumasız `postinstall`
script'i çalıştırıyorlardı) ve artık gereksizler:

  git push origin --delete dependabot/npm_and_yarn/jsdom-30.0.1
  git push origin --delete dependabot/npm_and_yarn/minor-patch-742031ba8c
  git push origin --delete dependabot/npm_and_yarn/types/node-26.5.1
  git push origin --delete dependabot/npm_and_yarn/vitejs/plugin-react-6.1.1

Sonra bunlara ait açık Pull Request'ler varsa kapat (token'ınla):
  gh pr list --state open
  gh pr close <numara> --delete-branch   (her biri için)
`gh` yoksa GitHub API kullan:
  GET  /repos/tarikelertarnak/Tarnak-Site/pulls?state=open&head=tarikelertarnak:dependabot/...
  PATCH /repos/tarikelertarnak/Tarnak-Site/pulls/<no>  {"state":"closed"}

DOĞRULA: `git ls-remote --heads origin` çıktısında yalnızca `main` ve `master` kalsın.

=== ADIM 4: Build'in gerçekten geçtiğini kanıtla ===
Önce temiz kurulum + build (yerelde):
  npx --yes pnpm@9.15.0 install --frozen-lockfile
  npx next build

BEKLENEN: install çıktısında `postinstall` HATA VERMEMELİ, build exit 0 vermeli,
37/37 sayfa üretilmeli (aralarında `/sitemap.xml` ve `/robots.txt` de olmalı).

Çıktıdan şu iki dosyayı doğrula:
  grep -o "https://[a-z.]*" .next/server/app/sitemap.xml.body 2>/dev/null | sort -u
  → hepsi `https://mxngo.dev` olmalı, `github.io` GEÇMEMELİ.

Eğer build patlarsa: DURMA, hatayı oku, düzelt, tekrar dene. Ama SADECE
build'i düzeltecek minimum değişikliği yap. `public/` klasörüne dokunma.

=== ADIM 5: Repo hijyen kontrolü ===
  git status --porcelain
  git ls-files public | wc -l          # 18
  find public -type f -size 0 | wc -l  # 0
  git ls-files | grep -E "\.env|schema\.sql|pg-test|apply-schema|verify-schema"
  → ÇIKTI BOŞ OLMALI. Eğer `.env.local`, `schema.sql`, `pg-test.mjs` gibi
    sır içeren dosyalar git'te takipli görünüyorsa bana BİLDİR, silme.

=== ADIM 6: Rapor ===
Şu formatta kısa bir özet ver:
  - Push: <başarılı/başarısız> + remote HEAD hash
  - Silinen branch'ler: <liste>
  - Kapatılan PR'lar: <liste>
  - Build: exit <kod>, <sayfa sayısı> sayfa
  - sitemap URL'leri: <mxngo.dev mi?>
  - public/: <dosya sayısı> dosya, <zero-byte sayısı> boş
  - Sır sızıntısı: <var/yok>
  - Yapamadığın/emin olmadığın bir şey varsa AÇIKÇA yaz. Uydurma.

=== YAPAMAYACAĞIN KISIM (bunu Tarık elle yapacak, sen denemeye kalkma) ===
Cloudflare panosundaki şu ayar git ile değiştirilemez:
  Cloudflare → Workers & Pages → tarikelertarnak → Settings → Build
  → "Branch control" → Production branch = SADECE `master`

Bu, build hatasının TEKRAR ETMESİNİ kalıcı olarak engelleyen asıl çözümdür.
Sen sadece raporunun sonunda "bu adım manuel, yapıldı mı?" diye hatırlat.
```

---

## Notlar

- **Adım 5'teki sır kontrolü kritik.** `.env.local`, `schema.sql`, `pg-test.mjs`,
  `apply-schema.mjs`, `verify-schema.mjs` repoda OLMAMALI.
- **Adım 4'teki build doğrulaması**, "düzelttim" demenin tek kanıtı. Çıktı olmadan
  "oldu" deme.
- opencode push'u reddederse **force-push yaptırma** — önce sebebi öğren.
