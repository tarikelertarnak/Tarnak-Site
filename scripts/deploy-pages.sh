#!/bin/bash
# Tarnak Pages deploy — TEK KOMUT. Kendinden geçerli, sirali.
#
#   bash scripts/deploy-pages.sh
#
# Neden ayrı script? 2026-10-03'te her adımı ayrı elle koşturduk ve üç ayrı
# tuzak yakaladık:
#   1) `npx open-next build` registry'ye gidip 84 sn sonra iptal oluyordu.
#      -> `npm run opennext:build` (yerel binary, package.json'daki scripts).
#   2) `set -e` yoktu, build失败 olsa bile eski .open-next deploy ediliyordu.
#      -> burada `set -euo pipefail` + artifact dogrulamasi var.
#   3) Deploy sonrasi CDN cache'i sifirlaniyor ve Workers Free planda render
#      ~%60 1102 veriyor ("Worker exceeded CPU time limit", 10 ms limit).
#      -> PRIME: her public rotayi 200 alana kadar tekrar dene.
#
# PRIME olmadan deploy etmek = kullaniciya 1102 servis etmek. Atlama.

set -euo pipefail

SRC_WIN="/mnt/c/Users/TARIKELER/Documents/Projelerim/TARIK ELER TARNAK/site"
DST="$HOME/tarnak-build"
ACCOUNT="baa0d2e06bd52fbf27ac68fd59aaa45b"
HOST="https://tarikelertarnak.pages.dev"
# Sadece public pazarlama rotalari. /chat /admin /sign /api ASLA prime edilmez
# (kimlik dogrulama gerektirir, cache'lenmemeli).
PUBLIC_ROUTES=(/ /projects /blog /about /credits /donate /github)

step() { printf '\n\033[1m### %s\033[0m\n' "$1"; }

# ---------------------------------------------------------------- senkron
step "1/5 kaynak senkronu (Windows -> WSL)"
mkdir -p "$DST"
cp -r "$SRC_WIN/src/." "$DST/src/"
cp -r "$SRC_WIN/scripts/." "$DST/scripts/"
cp "$SRC_WIN/package.json" "$DST/package.json"
[ -f "$SRC_WIN/open-next.config.ts" ] && cp "$SRC_WIN/open-next.config.ts" "$DST/"
# wrangler.json OLMAZSA deploy edilen worker'a NEXT_INC_CACHE_KV binding'i
# girmez -> ISR hic calismaz -> her istek tam SSR -> 10 ms CPU asimi -> 1102.
# next.config.mjs de build'i etkiliyor; ikisi de senkronun parcasidir.
for f in wrangler.json next.config.mjs; do
  [ -f "$SRC_WIN/$f" ] && cp "$SRC_WIN/$f" "$DST/$f"
done
cd "$DST"

# ---------------------------------------------------------------- build
# NOT: npx KULLANMA. `npx open-next build` registry'ye gidiyor, 84 sn sonra
# "npm ERR! canceled" ile oluyor ve eski artifact'i deploy edersin.
step "2/5 open-next build"
rm -rf .open-next
# Ciktiya DOSYAYA yaz, sonra goster. Boruya `| tail` dolarsa hata mesaji kesilir
# ve sadece Node'un spawn hata objesi gorunur (2026-10-03'te boyle oldu).
if ! npm run opennext:build > /tmp/build.log 2>&1; then
  echo "--- build BASARISIZ, son 40 satir ---"
  tail -40 /tmp/build.log
  exit 1
fi
tail -8 /tmp/build.log

[ -f .open-next/worker.js ] || { echo "HATA: .open-next/worker.js yok, build basarisiz"; exit 1; }
echo "  worker.js: $(stat -c%s .open-next/worker.js) bayt"

# ---------------------------------------------------------------- worker patch
step "3/5 pages-copy-worker (worker inject + _routes.json)"
node scripts/pages-copy-worker.cjs 2>&1 | grep -E '_routes|idempotent|injected|flattened' || true
[ -f .open-next/_worker.js ] || { echo "HATA: _worker.js uretilmedi"; exit 1; }

# ---------------------------------------------------------------- deploy
step "4/5 Cloudflare Pages deploy"
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT"
export CI=true
node node_modules/wrangler/bin/wrangler.js pages deploy .open-next \
  --project-name tarikelertarnak --branch master --commit-dirty=true 2>&1 \
  | grep -E 'Uploaded|Success|Deployment complete|ERROR'

step "5/5 CDN PRIME (1102 korunmasi icin ZORUNLU)"
echo "  Deploy CDN cache'ini sifirladi. Workers Free planda ilk render ~%60"
echo "  1102 donuyor (10 ms CPU limiti). Her rotayi 200 alana kadar tekrar"
echo "  deniyoruz. Next 'stale-while-revalidate=2592000' (30 gun) verdigi icin"
echo "  BIR basarili render 30 gunluk cache demek."
sleep 8

fail=0
for p in "${PUBLIC_ROUTES[@]}"; do
  tries=0; code=""
  # 10 deneme x 12 sn = rota basina en fazla 120 sn. Onceki surum 25 x 20 sn
  # idi ve asilan rotalarda 500 sn yiyip script'i timeout'a ugratiyordu.
  while [ $tries -lt 10 ]; do
    tries=$((tries+1))
    code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 12 "$HOST$p" 2>/dev/null) || code=""
    # SADECE 200'de dur. 503 de gecici 1102'den bir sonraki denemeyi kurtarir;
    # `!= 000` kosulu 503'te donguyu kesiyordu (2026-10-03 hata).
    [ "$code" = "200" ] && break
    sleep 1
  done
  if [ "$code" = "200" ]; then
    printf '  \033[32mOK\033[0m   %-11s %s denemede\n' "$p" "$tries"
  else
    printf '  \033[31mFAIL\033[0m %-11s kod=%s (%s deneme) — Free plan 10ms CPU asiminda\n' "$p" "${code:-000}" "$tries"
    fail=1
  fi
done

echo
if [ $fail -eq 0 ]; then
  echo "DEPLOY + PRIME TAMAM. Tum public rotalar 200."
else
  echo "PRIME BASARISIZ — bu rotalar kullaniciya 1102 donuyor. elle incele."
fi
exit $fail
