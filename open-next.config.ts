import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// KV cache handler'i modul olarak verilmeli. "cf-kv-incremental-cache" bir NAME
// sabiti; string olarak yazilinca build config dogrulamasinda PATLAR.
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

// 2026-10-02: Cloudflare 1102 ("Worker exceeded resource limits") KOK NEDENI.
//
// wrangler.json'da NEXT_INC_CACHE_KV binding'i YOKTI. OpenNext'in KV incremental
// cache'i binding yoksa `throw new IgnorableError("No KV Namespace")` ile sessizce
// devre disi kaliyor -> ISR hicbir zaman calismiyor -> HER istek tam SSR ->
// CPU 18ms -> Free plan 10ms limiti asiliyor -> 1102 (sayfa arasi 200/503).
//
// Cozum: wrangler.json'a NEXT_INC_CACHE_KV binding'i (namespace ddcb232dfa94499785fee65ef7b1d6ad)
// + asagida cache override'i acikca sabitlendi. Boylece ISR gercekten calisir,
// isteklerin cogu cache HIT olur ve tam SSR yapilmaz.
//
// NOT: template'in varsayilani R2'dir (ayri bucket binding'i + ucretli sinif).
// KV, Free plan icin dogru tercih.
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});