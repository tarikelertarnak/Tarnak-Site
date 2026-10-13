import type { SessionUser } from '@/lib/supabase/session'

/**
 * KİM KİMİ GÖRÜR (2026-10-12 kullanıcı isteği).
 *
 * "Erişim yok" EKRANI OLMAZ: kişi yalnızca ZATEN konuşabileceği kişileri görür,
 * konuşamayacağı kimse listeye hiç girmez. Böylece listeye tıklayıp 403 almak
 * (eski "Erişim yok." ekranı) mümkün değildir.
 *
 *   · site sahibi / admin → kayıtlı HERKES (kendi satırı dahil),
 *   · normal kullanıcı    → yalnız site sahibi
 *     (ileride: eklendiği gruplar ve kendisine izin verilen kişiler).
 *
 * Kural TEK yerde durur; hem `/api/chat/users` (liste) hem `/api/chat`
 * (sohbet açma) bunu kullanır ki liste ile açma birbiriyle çelişmesin.
 */
export function canSeeAllPeers(user: Pick<SessionUser, 'role' | 'isOwner'>): boolean {
  return user.role === 'admin' || user.isOwner
}
