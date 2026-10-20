import type { LegalPage, Phase6 } from '@/lib/phase6'
import { getContent } from '@/lib/content'
import { parsePhase6 } from '@/lib/phase6'

/**
 * Ek bölüm sayfaları için ortak OKUYUCU.
 *
 * Sayfaların hepsi aynı veri kaynağını kullanıyor (`content.phase6`) ve
 * hepsi aynı kurala uyuyor: **içerik yoksa bölüm render edilmez.**
 * Uydurma veri yazmıyoruz; kullanıcı gerçek bilgileri girene kadar sayfa
 * boş kart yığını göstermiyor.
 *
 * ⚠️ Görsel parçalar (boş durum, hukuki gövde) BURADA DEĞİL:
 * `@/components/phase6-client` içinde. Neden — kök layout `force-static`
 * + `getStaticLocale()` sabit 'tr' olduğu için bu dosyadaki metinler
 * sunucuda hep Türkçe basılıyordu ve EN ziyaretçi kalıcı Türkçe görüyordu;
 * metin taşıyan parçalar istemciye alındı (2026-10-20).
 */
export async function getPhase6(): Promise<Phase6 | null> {
  const content = await getContent()
  return parsePhase6(content.phase6)
}

/** Hukuki sayfa gövdesi prop tipi. */
export interface LegalBodyProps {
  page?: LegalPage
}
