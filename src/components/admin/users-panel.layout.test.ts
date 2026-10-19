import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * KULLANICI YÖNETİMİ YERLEŞİM SÖZLEŞMESİ (2026-10-19, kullanıcı isteği).
 *
 * Üç isteği kaynak taramasıyla kilitler; biri sessizce geri gelirse kırmızı:
 *
 *  1. "Roller var zaten, Admin Yap butonunu kaldır" → `toggleAdmin` /
 *     "Admin Yap" / "Adminlikten Al" users-panel'de OLMAMALI.
 *     (Admin rolü Roller popover'ındaki `admin` preset'iyle verilir.)
 *  2. "Kaydet sabit en üstte olsun, illa en aşağı inmeyelim" → üç popover'da
 *     Kaydet başlıktan ÖNCE gelmeli ve ALTTA ikinci bir Kaydet OLMAMALI.
 *  3. Uzun "VARSAYILAN AÇIK ..." bilgi paragrafı kaldırılmalı.
 *
 * Kaynak taraması bilinçli: bu maddeler saf yerleşim/sıra kararıdır, jsdom'da
 * popover portal sırasını ölçmek kırılgan olurdu.
 */

function read(p: string) {
  return readFileSync(join(process.cwd(), 'src/components/admin', p), 'utf8')
}

describe('users-panel: Admin Yap butonu kaldırıldı', () => {
  const src = read('users-panel.tsx')

  it('"Admin Yap" / "Adminlikten Al" metni ve toggleAdmin fonksiyonu YOK', () => {
    // Yorumlar da taranır: kaldırılan bir butonu anlatan yorum da kalmasın
    // (yanlış izlenim bırakır). Bu yüzden yorumlarda adı geçmez.
    expect(src).not.toContain('Admin Yap')
    expect(src).not.toContain('Adminlikten Al')
    expect(src).not.toContain('toggleAdmin')
  })

  it('admin rolü hâlâ Roller popover\'ından verilebiliyor (yol kapanmadı)', () => {
    // `admin` preset'i ROLE_PRESETS'ten gelir ve Roller popover'ında listelenir.
    expect(src).toContain('ROLE_PRESETS')
    expect(src).toContain('saveRoles')
    expect(src).toContain('action: \'setRoles\'')
  })

  it('kaldırılan bilgi paragrafı geri gelmedi', () => {
    expect(src).not.toContain('VARSAYILAN AÇIK')
    expect(src).not.toContain('Sapan ayarlar')
  })
})

describe('kaydet butonu popover başında', () => {
  /*
    Popover başlığı ile "Varsayılana dön" AYNI satırdadır (başlık şeridi).
    Kaydet o şeridin ALTINDA ama içerik listesinin ÜSTÜNDE olmalı — yani
    ilk içerik kutusundan önce gelmeli. Bu ölçüt "başlıktan önce"den daha
    doğru: başlığın kendisi zaten en tepededir.
  */
  const cases: Array<[string, string, string]> = [
    ['permission-editor.tsx', 'onPress={onSave}', 'PERMISSION_GROUPS.map'],
    ['limits-editor.tsx', 'onPress={save}', 'Toplam yükleme kullanımı'],
  ]

  for (const [file, onPress, firstContent] of cases) {
    it(`${file}: Kaydet tek ve ilk içerikten ÖNCE`, () => {
      const src = read(file)
      // Tek Kaydet düğmesi (alt kopya silindi).
      expect(src.match(/>\s*Kaydet\s*</g)?.length).toBe(1)
      const save = src.indexOf(onPress)
      expect(save).toBeGreaterThan(-1)
      const content = src.indexOf(firstContent)
      expect(content).toBeGreaterThan(-1)
      expect(save).toBeLessThan(content)
    })
  }

  it('users-panel Roller popoverı: saveRoles tek ve Roller başlığından ÖNCE', () => {
    const src = read('users-panel.tsx')
    expect(src.match(/onPress=\{saveRoles\}/g)?.length).toBe(1)
    const save = src.indexOf('onPress={saveRoles}')
    const title = src.indexOf('Roller (birden fazla seçilebilir)')
    expect(title).toBeGreaterThan(-1)
    expect(save).toBeLessThan(title)
  })
})
