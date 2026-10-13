import type { BolumSpec } from '@/components/admin/sections-editor'

/**
 * Ek bölümler içerik alanlarının TEK tanım yeri.
 *
 * Hem admin panelindeki editör hem de şema doğrulaması buradan
 * besleniyor; alan listesi iki yere kopyalanmıyor.
 *
 * ORTAK KURAL: içerik uydurulmaz. Tüm diziler boş başlar.
 */
export const SECTION_SPECS: BolumSpec[] = [
  {
    anahtar: 'availability',
    baslik: 'Müsaitlik rozeti',
    aciklama: 'Ana sayfa hero\'sunda görünen "şu an müsaitim" rozeti.',
    alanlar: [
      { anahtar: 'enabled', etiket: 'Göster', tip: 'bool' },
      {
        anahtar: 'label',
        etiket: 'Etiket',
        tip: 'text',
        ipucu: 'Örn: "Projeler için müsaitim"',
      },
      {
        anahtar: 'tone',
        etiket: 'Renk tonu',
        tip: 'select',
        secenekler: ['available', 'busy', 'offline'],
      },
      {
        anahtar: 'href',
        etiket: 'Bağlantı',
        tip: 'text',
        ipucu: 'Boşsa iletişim sayfası',
      },
    ],
  },
  {
    anahtar: 'services',
    baslik: 'Hizmetler',
    aciklama: 'Ana sayfadaki hizmet kartları.',
    alanlar: [
      { anahtar: 'title', etiket: 'Başlık', tip: 'text' },
      { anahtar: 'description', etiket: 'Açıklama', tip: 'textarea' },
    ],
    liste: {
      anahtar: 'items',
      etiket: 'Hizmet',
      cocuk: [
        { anahtar: 'title', etiket: 'Başlık', tip: 'text' },
        { anahtar: 'description', etiket: 'Açıklama', tip: 'textarea' },
        {
          anahtar: 'tech',
          etiket: 'Teknolojiler',
          tip: 'list',
          ipucu: 'Her satıra bir teknoloji',
        },
        { anahtar: 'tag', etiket: 'Köşe etiketi', tip: 'text' },
        { anahtar: 'order', etiket: 'Sıra', tip: 'number' },
      ],
    },
  },
  {
    anahtar: 'testimonials',
    baslik: 'Referanslar',
    aciklama: 'Ana sayfadaki müşteri yorumları.',
    alanlar: [{ anahtar: 'title', etiket: 'Başlık', tip: 'text' }],
    liste: {
      anahtar: 'items',
      etiket: 'Referans',
      cocuk: [
        { anahtar: 'name', etiket: 'Ad', tip: 'text' },
        { anahtar: 'role', etiket: 'Rol', tip: 'text' },
        { anahtar: 'quote', etiket: 'Alıntı', tip: 'textarea' },
        { anahtar: 'avatar', etiket: 'Avatar URL', tip: 'text' },
      ],
    },
  },
  {
    anahtar: 'timeline',
    baslik: 'Zaman çizelgesi',
    aciklama: 'Hakkımda sayfasındaki geçmiş.',
    alanlar: [{ anahtar: 'title', etiket: 'Başlık', tip: 'text' }],
    liste: {
      anahtar: 'items',
      etiket: 'Kayıt',
      cocuk: [
        { anahtar: 'year', etiket: 'Yıl', tip: 'text' },
        { anahtar: 'title', etiket: 'Başlık', tip: 'text' },
        { anahtar: 'description', etiket: 'Açıklama', tip: 'textarea' },
        {
          anahtar: 'kind',
          etiket: 'Tür',
          tip: 'select',
          secenekler: ['education', 'work', 'learning', 'project'],
        },
        { anahtar: 'order', etiket: 'Sıra', tip: 'number' },
      ],
    },
  },
  {
    anahtar: 'certificates',
    baslik: 'Sertifikalar & başarılar',
    aciklama: 'Hakkımda sayfasındaki kartlar.',
    alanlar: [{ anahtar: 'title', etiket: 'Başlık', tip: 'text' }],
    liste: {
      anahtar: 'items',
      etiket: 'Sertifika',
      cocuk: [
        { anahtar: 'name', etiket: 'Ad', tip: 'text' },
        { anahtar: 'issuer', etiket: 'Veren', tip: 'text' },
        { anahtar: 'year', etiket: 'Yıl', tip: 'text' },
        { anahtar: 'url', etiket: 'Doğrulama bağlantısı', tip: 'text' },
      ],
    },
  },
  {
    anahtar: 'uses',
    baslik: 'Kullandıklarım (/uses)',
    alanlar: [
      { anahtar: 'title', etiket: 'Başlık', tip: 'text' },
      { anahtar: 'description', etiket: 'Açıklama', tip: 'textarea' },
    ],
    liste: {
      anahtar: 'groups',
      etiket: 'Grup',
      cocuk: [
        { anahtar: 'title', etiket: 'Grup başlığı', tip: 'text' },
        { anahtar: 'description', etiket: 'Açıklama', tip: 'text' },
        { anahtar: 'order', etiket: 'Sıra', tip: 'number' },
        {
          anahtar: 'items',
          etiket: 'Ürün',
          cocuk: [
            { anahtar: 'name', etiket: 'Ad', tip: 'text' },
            { anahtar: 'note', etiket: 'Not', tip: 'text' },
            { anahtar: 'href', etiket: 'Bağlantı', tip: 'text' },
          ],
        },
      ],
    },
  },
  {
    anahtar: 'now',
    baslik: 'Şu an (/now)',
    alanlar: [
      {
        anahtar: 'updated',
        etiket: 'Güncelleme tarihi',
        tip: 'text',
        ipucu: 'Örn: "2026-10"',
      },
      { anahtar: 'learning', etiket: 'Öğrendiklerim', tip: 'list' },
      { anahtar: 'building', etiket: 'Ürettiklerim', tip: 'list' },
      { anahtar: 'reading', etiket: 'Okuduklarım', tip: 'list' },
      { anahtar: 'listening', etiket: 'Dinlediklerim', tip: 'list' },
    ],
  },
  {
    anahtar: 'changelog',
    baslik: 'Değişiklikler (/changelog)',
    alanlar: [{ anahtar: 'title', etiket: 'Başlık', tip: 'text' }],
    liste: {
      anahtar: 'entries',
      etiket: 'Kayıt',
      cocuk: [
        { anahtar: 'date', etiket: 'Tarih', tip: 'text' },
        { anahtar: 'title', etiket: 'Başlık', tip: 'text' },
        {
          anahtar: 'changes',
          etiket: 'Değişiklikler',
          tip: 'list',
          ipucu: 'Her satıra bir madde',
        },
      ],
    },
  },
  {
    anahtar: 'videos',
    baslik: 'YouTube videoları',
    aciklama: 'Kanal ID boşsa bölüm hiç gösterilmez.',
    alanlar: [
      {
        anahtar: 'channelId',
        etiket: 'Kanal ID',
        tip: 'text',
        ipucu: 'UC ile başlayan kanal kimliği',
      },
      { anahtar: 'title', etiket: 'Başlık', tip: 'text' },
      { anahtar: 'maxItems', etiket: 'En fazla video', tip: 'number' },
    ],
  },
  {
    anahtar: 'vcard',
    baslik: 'Dijital kartvizit',
    aciklama: 'Hakkımda kartındaki QR kod — telefon taratınca kişiyi tanır.',
    alanlar: [
      { anahtar: 'enabled', etiket: 'Göster', tip: 'bool' },
      { anahtar: 'note', etiket: 'vCard notu', tip: 'text' },
    ],
  },
  {
    anahtar: 'newsletter',
    baslik: 'Bülten',
    aciklama:
      'Sağlayıcı seçilene kadar kapalı; form uydurma abonelik toplamaz.',
    alanlar: [
      { anahtar: 'enabled', etiket: 'Göster', tip: 'bool' },
      { anahtar: 'title', etiket: 'Başlık', tip: 'text' },
      { anahtar: 'description', etiket: 'Açıklama', tip: 'textarea' },
      {
        anahtar: 'provider',
        etiket: 'Sağlayıcı',
        tip: 'text',
        ipucu: 'Örn: brevo, butchery',
      },
    ],
  },
  {
    anahtar: 'privacy',
    baslik: 'Gizlilik Politikası (/gizlilik)',
    aciklama: 'Boş bırakılırsa sayfa taslak uyarısı gösterir.',
    alanlar: [
      { anahtar: 'title', etiket: 'Başlık', tip: 'text' },
      { anahtar: 'updated', etiket: 'Son güncelleme', tip: 'text' },
      {
        anahtar: 'body',
        etiket: 'Metin',
        tip: 'textarea',
        ipucu: 'Paragrafları boş satırla ayır',
      },
      {
        anahtar: 'needsLegalReview',
        etiket: 'Hukuki inceleme uyarısı göster',
        tip: 'bool',
      },
    ],
  },
  {
    anahtar: 'kvkk',
    baslik: 'KVKK (/kvkk)',
    alanlar: [
      { anahtar: 'title', etiket: 'Başlık', tip: 'text' },
      { anahtar: 'updated', etiket: 'Son güncelleme', tip: 'text' },
      {
        anahtar: 'body',
        etiket: 'Metin',
        tip: 'textarea',
        ipucu: 'Paragrafları boş satırla ayır',
      },
      {
        anahtar: 'needsLegalReview',
        etiket: 'Hukuki inceleme uyarısı göster',
        tip: 'bool',
      },
    ],
  },
]
