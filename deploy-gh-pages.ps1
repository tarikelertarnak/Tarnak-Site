#!/usr/bin/env pwsh
# deploy-gh-pages.ps1 — Tarnak site'ini GitHub Pages'e otomatik deploy eder.
#
# Neden: site SSR + API (supabase/chat/admin) kullanıyor; GitHub Pages statik barındırıyor.
# Çözüm: export build'i sırasında app/api route'ları geçici devre dışı (Next.js export
# dinamik route desteklemez), build bitince geri alınır. Çıktı (out/) Pages repo'suna
# push edilir. Cloudflare/Workers deploy akışını ETKİLEMEZ (o `npm run opennext:build`).
#
# Kullanım:  .\deploy-gh-pages.ps1
# Gereksinim: gh CLI login (TARIKELER-TARNAK), git, node/npm.

$ErrorActionPreference = 'Stop'
$site = Split-Path -Parent $MyInvocation.MyCommand.Path
$pagesRepo = 'TARIKELER-TARNAK/TARIKELER-TARNAK.github.io'
$work = Join-Path $env:TEMP 'opencode\ghpages-repo'
# GitHub Pages statik olduğu için dinamik (force-dynamic / route handler) parçalar
# export build'inden geçici hariç tutulur. Site ziyaretçi yüzü (home/about/blog/
# projects/cv/credits/donate) statik; admin/chat/login/search/auth/api bir sunucu
# gerektirir ve Pages'te zaten çalışmaz (Cloudflare Workers'te çalışır).
$apiDir = Join-Path $site 'src\app\api'
$dynamicDirs = @(
    'src\app\admin',
    'src\app\chat',
    'src\app\login',
    'src\app\search',
    # force-dynamic dynamic routes — export'ta üretilemezler:
    'src\app\blog\[slug]',
    'src\app\puck\[[...puckPath]]'
)
$dynamicFiles = @(
    'src\app\auth\callback\route.ts'
)
$apiBak = Join-Path $env:TEMP 'opencode\api-export-bak'

Write-Host "==> [1/5] Dinamik route'lar export build'inden geçici hariç tutuluyor"
# Kalıntıları temizle: önceki başarısız çalışmalardan kalmış api.__export_bak
# (src/app İÇİNDE olursa Turbopack onu da route olarak tarar) + eski .next
# (API route tip dosyaları taşınmış yollara referans verip build'i kırar).
$staleBak = Join-Path $site 'src\app\api.__export_bak'
if (Test-Path -LiteralPath $staleBak) { Remove-Item -Recurse -Force $staleBak }
Remove-Item -LiteralPath $apiBak -Recurse -Force -ErrorAction SilentlyContinue
$bakRoot = Join-Path $env:TEMP 'opencode\dynamic-export-bak'
Remove-Item -LiteralPath $bakRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $bakRoot | Out-Null

# Dinamik dizinleri taşı (src/app altından TEMP'e — src/app içinde kalırsa Turbopack tarar)
foreach ($d in $dynamicDirs) {
    $abs = Join-Path $site $d
    if (Test-Path -LiteralPath $abs) {
        $rel = Split-Path $d -Leaf
        Move-Item -LiteralPath $abs (Join-Path $bakRoot $rel) -Force
        Write-Host "    taşındı: $d"
    } else {
        Write-Host "    (yok, atlanıyor: $d)"
    }
}
# Dinamik dosyaları taşı
foreach ($f in $dynamicFiles) {
    $abs = Join-Path $site $f
    if (Test-Path -LiteralPath $abs) {
        $rel = Split-Path $f -Leaf
        Move-Item -LiteralPath $abs (Join-Path $bakRoot ("f_" + $rel)) -Force
        Write-Host "    taşındı: $f"
    } else {
        Write-Host "    (yok, atlanıyor: $f)"
    }
}
# api/ zaten ayrı dizin — TEMP'e taşı
if (Test-Path -LiteralPath $apiDir) { Move-Item -LiteralPath $apiDir $apiBak -Force; Write-Host "    taşındı: src\app\api" }
if (Test-Path -LiteralPath (Join-Path $site '.next')) { Remove-Item -Recurse -Force (Join-Path $site '.next') }

try {
    Write-Host "==> [2/5] Statik export build (EXPORT_MODE=1)"
    Push-Location $site
    $env:EXPORT_MODE = '1'
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "next build başarısız (exit $LASTEXITCODE)" }
    Remove-Item Env:\EXPORT_MODE -ErrorAction SilentlyContinue
    Pop-Location

    $out = Join-Path $site 'out'
    if (-not (Test-Path -LiteralPath (Join-Path $out 'index.html'))) { throw "out/index.html üretilmedi — export çıktısı eksik" }
    Write-Host "==> [3/5] out/ üretildi: $((Get-ChildItem -LiteralPath $out -Recurse -File | Measure-Object).Count) dosya"

    # Pages repo klonu (taze)
    Write-Host "==> [4/5] Pages repo klonlanıyor: $pagesRepo"
    if (Test-Path -LiteralPath $work) { Remove-Item -Recurse -Force $work }
    New-Item -ItemType Directory -Force -Path $work | Out-Null
    gh repo clone $pagesRepo $work -- --quiet
    if ($LASTEXITCODE -ne 0) { throw 'gh repo clone başarısız' }

    # Eski içeriği temizle (nojekyll korunur), yeni out/ içeriğini kopyala
    Get-ChildItem -LiteralPath $work -Force | Where-Object { $_.Name -ne '.git' } | Remove-Item -Recurse -Force
    Copy-Item (Join-Path $out '*') $work -Recurse -Force
    # .nojekyll ZORUNLU: GitHub Pages Jekyll'i çalıştırırsa `_` ile başlayan
    # dizinleri (_next/) yayınlamaz → tüm CSS/JS 404 → site çıplak kalır.
    Set-Content -LiteralPath (Join-Path $work '.nojekyll') -Value '' -NoNewline

    Push-Location $work
    git add -A
    $staged = git diff --cached --stat
    if ([string]::IsNullOrWhiteSpace($staged)) {
        Write-Host '==> Değişiklik yok — Pages zaten güncel.'
        Pop-Location
    } else {
        git -c user.name='TARIKELER-TARNAK' -c user.email='184168415+TARIKELER-TARNAK@users.noreply.github.com' commit -m "deploy: static export $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'commit başarısız' }
        git push origin main
        if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'push başarısız' }
        Pop-Location
        Write-Host "==> [5/5] YAYINLANDI: https://tarikeler-tarnak.github.io/"
    }
}
finally {
    # Her durumda route'ları geri getir
    $bakRoot = Join-Path $env:TEMP 'opencode\dynamic-export-bak'
    foreach ($d in $dynamicDirs) {
        $rel = Split-Path $d -Leaf
        $bak = Join-Path $bakRoot $rel
        $abs = Join-Path $site $d
        if (Test-Path -LiteralPath $bak) {
            if (Test-Path -LiteralPath $abs) { Remove-Item -Recurse -Force $abs }
            Move-Item -LiteralPath $bak $abs -Force
        }
    }
    foreach ($f in $dynamicFiles) {
        $rel = Split-Path $f -Leaf
        $bak = Join-Path $bakRoot ("f_" + $rel)
        $abs = Join-Path $site $f
        if (Test-Path -LiteralPath $bak) {
            $dir = Split-Path $abs -Parent
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
            Move-Item -LiteralPath $bak $abs -Force
        }
    }
    if (Test-Path -LiteralPath $apiBak) {
        if (Test-Path -LiteralPath $apiDir) { Remove-Item -Recurse -Force $apiDir }
        Move-Item -LiteralPath $apiBak $apiDir -Force
    }
    Write-Host "==> Dinamik route'lar geri yüklendi (site tam haliyle duruyor)"
    Remove-Item Env:\EXPORT_MODE -ErrorAction SilentlyContinue
}