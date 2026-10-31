import { AdminGate } from '@/components/admin/admin-gate'

export const metadata = {
  title: 'Admin Panel — TARIK ELER - TARNAK',
  // 2026-10-04: noindex — panel sayfasi arama motorlarina acik bir sayfa
  // degil (once layout'tan index:true miras aliyordu).
  robots: { index: false, follow: false },
}

/*
 * 2026-10-13 — BU SAYFA ARTIK İSTEK ZAMANLI OTURUM OKUMUYOR.
 *
 * Öncesinde: `const user = await getSessionUser()` + olmayınca
 * `redirect('/login?next=/admin')`. Bu, kök layout'un
 * `export const dynamic = 'force-static'` ayarı yüzünden ÇALIŞMIYORDU:
 * force-static altındaki her segmentte `cookies()` BOŞ döner (Next dokümanı:
 * "forcing cookies/headers to return empty values"), yani `admin_session`
 * cookie'si geçerli olsa bile `getSessionUser()` daima null dönüyordu →
 * /admin sonsuza kadar /login'e atıyordu (panel erişilemez durumdaydı).
 *
 * Deneyle doğrulandı (aynı istek, aynı cookie): `/api/admin/session` 200 + admin
 * kullanıcı dönerken `/admin` 307 → `/login` dönüyordu; kök layout'un
 * force-static'i kaldırılınca sayfa cookie'yi görebildi. Bu ayar public
 * sayfaların statik kalması için GEREKLİ (Cloudflare Free 10 ms CPU bütçesi,
 * 2026-10-03 1102 düzeltmesi), bu yüzden silinmedi.
 *
 * Çözüm, `/chat` sayfasındaki (bkz. src/app/chat/page.tsx) AYNI desen:
 * sayfa oturum okumaz; kimlik kapısı istemcide (`AdminGate`), ZORUNLU
 * yetki kontrolü API katmanında kalır — bütün `/api/admin/*` uçları
 * `isAdminUser()` ile 401 döner, panelin verisi de o uçlardan gelir.
 */
export default function AdminPage() {
  return <AdminGate />
}
