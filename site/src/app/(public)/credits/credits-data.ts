import type {
  ContributorItem,
  DonorItem,
  TeamItem,
  TranslatorItem,
} from '@/components/credits/credits-browser'

export const CONTRIBUTORS: ContributorItem[] = [
  {
    name: 'TARIK ELER',
    roleKey: 'credits.roleFounderLead',
    roleIcon: 'crown',
    link: 'https://github.com/tarikelertarnak',
  },
]

export const TEAM: TeamItem[] = [
  {
    name: 'Tarık Eler',
    roleKey: 'credits.roleFounder',
  },
]

export const TOP_DONORS: DonorItem[] = [
  {
    nameKey: 'credits.donorNoneName',
    noteKey: 'credits.donorNoneNote',
  },
]

/*
  'Türkçe / English — TARIK ELER — Yerelleştirme & çeviri' satırları
  2026-10-06'da kullanıcı isteğiyle SİLİNDİ: bunlar çeviri yapan ayrı
  kişiler değil, sitenin sahibinin kendi dilleri — listede "çevirmen"
  gibi görünüyordu. Boş bırakmak yerine grup hiç render edilmiyor
  (CreditsBrowser boş diziyi atlar), yani "Çevirmenler" başlığı boş
  kutu olarak çıkmıyor.
*/
export const TRANSLATORS: TranslatorItem[] = []
