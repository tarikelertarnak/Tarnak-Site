#!/usr/bin/env pwsh
# deploy-cloudflare.ps1 — Tarnak'i Cloudflare'e deploy eder (2 URL birden güncellenir).
#
# Neden ayrı script: OpenNext + Pages deploy'u, `_worker.js` dosyası olmadan
# statik asset'leri (CSS/sitemap/robots) serve edemiyor. `worker.js`'i
# `_worker.js`'e kopyalayıp Pages'in ASSETS binding'inden statik dosya
# passthrough'u eklemek gerek. `wrangler deploy` (Workers) asset'leri
# otomatik bağlar — ikisi de koşulur ki pages.dev VE workers.dev adresleri
# birlikte güncel kalsın.
#
# Kullanım:  .\deploy-cloudflare.ps1
# Gereksinim: CLOUDFLARE_API_TOKEN env (veya wrangler login).

$ErrorActionPreference = 'Stop'
$site = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:CLOUDFLARE_API_TOKEN = $env:CLOUDFLARE_API_TOKEN
if (-not $env:CLOUDFLARE_API_TOKEN) { throw 'CLOUDFLARE_API_TOKEN env eksik' }

Push-Location $site
try {
    Write-Host "==> [1/4] OpenNext build"
    $env:SITE_URL = 'https://tarikelertarnak.pages.dev'
    npm run opennext:build
    Remove-Item Env:\SITE_URL -ErrorAction SilentlyContinue
    if ($LASTEXITCODE -ne 0) { throw "opennext:build başarısız (exit $LASTEXITCODE)" }

    Write-Host "==> [2/4] _worker.js hazirlanıyor (Pages ASSETS passthrough)"
    $worker = Join-Path $site '.open-next\worker.js'
    $pagesWorker = Join-Path $site '.open-next\_worker.js'
    $content = Get-Content $worker -Raw
    $anchor = '    async fetch(request, env, ctx) {
        return runWithCloudflareRequestContext(request, env, ctx, async () => {'
    $inject = '    async fetch(request, env, ctx) {
        // Cloudflare Pages: serve static assets from the ASSETS binding first
        if (env.ASSETS && (request.method === "GET" || request.method === "HEAD")) {
            try {
                const assetResp = await env.ASSETS.fetch(request);
                if (assetResp && assetResp.status !== 404) {
                    return assetResp;
                }
            } catch {
                // no asset matched - fall through to the Next.js handler
            }
        }
        return runWithCloudflareRequestContext(request, env, ctx, async () => {'
    if ($content.Contains('env.ASSETS && (request.method')) {
        Write-Host "    _worker.js zaten güncel, atlanıyor"
    } elseif ($content.Contains($anchor)) {
        $content = $content.Replace($anchor, $inject)
        Write-Host "    ASSETS passthrough eklendi"
    } else {
        throw '_worker.js şablonu bulunamadı — anchor değişmiş olabilir'
    }
    Set-Content $pagesWorker -Value $content -NoNewline

    # Pages asset root = .open-next; dosyalar assets/ altında kalırsa /_next,
    # /sitemap.xml, /robots.txt kökten bulunmaz. assets içeriğini köke kopyala.
    Write-Host "==> [3/4] assets -> .open-next köküne kopyalanıyor (Pages URL root)"
    Copy-Item -Path (Join-Path $site '.open-next\assets\*') -Destination (Join-Path $site '.open-next\') -Recurse -Force

    # pages.dev domain'ine özel sitemap: bu dosya GitHub Pages'teki (github.io)
    # sürümünün kopyasıdır ama loc değerleri pages.dev'e işaret eder — her deploy
    # kendi domain'ini Google/Yandex/Bing'e bildirsin (cross-domain sitemap kabul edilmez).
    Write-Host "==> [3.5] pages.dev sitemap.xml üretiliyor (github.io kopyası + domain değişimi)"
    $sm = Join-Path $site '.open-next\sitemap.xml'
    if (Test-Path -LiteralPath $sm) {
        $xml = Get-Content $sm -Raw
        $xml = $xml.Replace('https://tarikelertarnak.github.io', 'https://tarikelertarnak.pages.dev')
        Set-Content $sm -Value $xml -NoNewline
        Write-Host "    sitemap.xml -> pages.dev domain'ine çevrildi"
    } else {
        Write-Host "    (sitemap.xml bulunamadı, atlanıyor)"
    }

    Write-Host "==> [4/4] Deploy: pages.dev + workers.dev"
    npx wrangler pages deploy .open-next --project-name tarikelertarnak --branch master
    if ($LASTEXITCODE -ne 0) { throw 'wrangler pages deploy başarısız' }
    npx wrangler deploy
    if ($LASTEXITCODE -ne 0) { throw 'wrangler deploy başarısız' }
    Write-Host "==> TAMAM: https://tarikelertarnak.pages.dev + https://tarikelertarnak.tarikelertr.workers.dev"
}
finally {
    Pop-Location
}