import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * "Profilini incele" GÜVENLİK SÖZLEŞMESİ (2026-10-11 kullanıcı isteği).
 *
 * Kullanıcı: "şifresi de dahil canlı yayında olursa sıkıntı yaratacak...
 * bunlar gizlenir, gmail değil telefon değil şifre gibi çok önemli olanlar."
 *
 * Bu test, hassas alanların **sunucuda hiç SEÇİLMEDİĞINI** sabitler. Arayüz
 * testi (chat-v2.admin.test.tsx) yalnız render edilen DOM'u denetler; asıl
 * kapı burada: yeni bir gizli sütun eklendiğinde `select` listesi genişletilirse
 * bu test KIRILIR.
 */
const LIB = readFileSync(join(process.cwd(), 'src/lib/chat-v2.ts'), 'utf8')
const ROUTE = readFileSync(join(process.cwd(), 'src/app/api/chat/v2/route.ts'), 'utf8')

function profileViewBody(): string {
  const start = LIB.indexOf('export async function getAdminProfileView')
  expect(start, 'getAdminProfileView bulunamadı').toBeGreaterThan(-1)
  const next = LIB.indexOf('\nexport ', start + 10)
  return LIB.slice(start, next === -1 ? LIB.length : next)
}

describe('admin profil görünümü — hassas alan sızdırmaz', () => {
  const body = profileViewBody()

  it('select listesinde e-posta/gmail, telefon ve parola YOK', () => {
    const selects = body.match(/\.select\('([^']+)'\)/g) ?? []
    const columns = selects.flatMap(s => s.replace(/\.select\('|'\)>/g, '').split(',').map(c => c.trim()))
    expect(columns.length).toBeGreaterThan(0)
    for (const c of columns) {
      expect(c, `hassas sütun seçiliyor: ${c}`).not.toMatch(/email|mail|phone|telefon|password|parola|secret|token|hash/i)
    }
  })

  it('arayüz tipi de hassas alan içermiyor', () => {
    const iface = body.slice(0, body.indexOf('export async function'))
    expect(iface).not.toMatch(/^\s*(email|phone|password)\??:/im)
  })

  it('beyaz liste: yalnız gösterilebilir alanlar seçiliyor', () => {
    expect(body).toContain('username, full_name, nickname, avatar_url, bio, github_handle, website, role, is_owner, created_at')
  })
})

describe('admin eylemleri yalnız admin’e açık', () => {
  it('yetki kapısı ADMIN_ACTIONS listesini ve admin kontrolünü içeriyor', () => {
    expect(ROUTE).toMatch(/ADMIN_ACTIONS\s*=\s*\[[^\]]*'favorite'[^\]]*'nickname'[^\]]*'profile'/)
    expect(ROUTE).toMatch(/ADMIN_ACTIONS as readonly string\[\]\)\.includes\(action\) && !admin/)
    // kapı, eylemlerin uygulanmasından ÖNCE gelmeli
    expect(ROUTE.indexOf('ADMIN_ACTIONS as readonly string[]).includes(action) && !admin'))
      .toBeLessThan(ROUTE.indexOf('action === \'favorite\''))
  })

  it('her admin eyleminin bir dalı var', () => {
    for (const a of ['favorite', 'block', 'clear', 'deleteConversation', 'nickname', 'profile']) {
      expect(ROUTE, `dal eksik: ${a}`).toContain(`action === '${a}'`)
    }
  })

  it('temizle ve sil sohbeti olduğu için katılım denetimi dışında çalışır', () => {
    // admin, katılımcı olmadığı bir sohbeti de temizleyebilmeli/silebilmeli
    expect(ROUTE).toMatch(/action !== 'clear' && action !== 'deleteConversation'/)
  })
})
