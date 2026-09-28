import type { ContactApiResponse, ContactFormData } from '@/lib/validations'
import { useT } from '@/components/locale-provider'
import { E164_MAX_DIGITS, validatePhone } from '@/lib/phone'
import { parsePhone } from '@/components/ui/phone-input'
import { useCallback, useMemo, useState } from 'react'
import { COUNTRIES } from '@/lib/countries-data'
import { contactFormSchema } from '@/lib/validations'

interface FormErrors {
  name?: string
  contactValue?: string
  message?: string
  general?: string
}

interface UseContactFormReturn {
  formData: ContactFormData
  errors: FormErrors
  isSubmitting: boolean
  isSubmitted: boolean
  updateField: (field: keyof ContactFormData, value: string) => void
  submitForm: () => Promise<keyof ContactFormData | 'ok' | null>
  resetForm: () => void
  isFormValid: boolean
  switchContactMethod: (method: 'email' | 'phone') => void
  /** Selected country ISO2 for the phone field (timezone-detected, fallback "tr"). */
  country: string
  setCountry: (iso2: string) => void
}

const initialFormData: ContactFormData = {
  name: '',
  contactMethod: 'email',
  contactValue: '',
  message: '',
}

// IANA timezone → ISO2 (lowercase, matches COUNTRIES). Device timezone is
// derived from the user's location — zero permissions, no external API.
// ponytail: explicit map for common zones only; add more if a region matters.
const TIMEZONE_COUNTRY: Record<string, string> = {
  'Europe/Istanbul': 'tr',
  'Europe/London': 'gb',
  'Europe/Paris': 'fr',
  'Europe/Berlin': 'de',
  'Europe/Madrid': 'es',
  'Europe/Rome': 'it',
  'Europe/Amsterdam': 'nl',
  'Europe/Brussels': 'be',
  'Europe/Zurich': 'ch',
  'Europe/Vienna': 'at',
  'Europe/Warsaw': 'pl',
  'Europe/Stockholm': 'se',
  'Europe/Helsinki': 'fi',
  'Europe/Oslo': 'no',
  'Europe/Copenhagen': 'dk',
  'Europe/Lisbon': 'pt',
  'Europe/Athens': 'gr',
  'Europe/Bucharest': 'ro',
  'Europe/Prague': 'cz',
  'Europe/Budapest': 'hu',
  'Europe/Kyiv': 'ua',
  'Europe/Moscow': 'ru',
  'America/New_York': 'us',
  'America/Chicago': 'us',
  'America/Denver': 'us',
  'America/Los_Angeles': 'us',
  'America/Toronto': 'ca',
  'America/Mexico_City': 'mx',
  'America/Sao_Paulo': 'br',
  'America/Argentina/Buenos_Aires': 'ar',
  'America/Santiago': 'cl',
  'America/Bogota': 'co',
  'America/Lima': 'pe',
  'America/Caracas': 've',
  'Asia/Dubai': 'ae',
  'Asia/Riyadh': 'sa',
  'Asia/Tokyo': 'jp',
  'Asia/Shanghai': 'cn',
  'Asia/Hong_Kong': 'hk',
  'Asia/Taipei': 'tw',
  'Asia/Seoul': 'kr',
  'Asia/Kolkata': 'in',
  'Asia/Karachi': 'pk',
  'Asia/Bangkok': 'th',
  'Asia/Singapore': 'sg',
  'Asia/Jakarta': 'id',
  'Asia/Manila': 'ph',
  'Asia/Tehran': 'ir',
  'Australia/Sydney': 'au',
  'Africa/Cairo': 'eg',
  'Africa/Lagos': 'ng',
  'Africa/Johannesburg': 'za',
}

/** Detect the visitor's country from the device timezone (fallback 'tr'). */
function detectCountry(): string {
  if (typeof window === 'undefined')
    return 'tr'
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const iso2 = tz && TIMEZONE_COUNTRY[tz]
    if (iso2 && COUNTRIES.some(c => c.iso2 === iso2))
      return iso2
  }
  catch {
    // fall through to default
  }
  return 'tr'
}

export function useContactForm(): UseContactFormReturn {
  const { t } = useT()
  const [formData, setFormData] = useState<ContactFormData>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [touchedFields, setTouchedFields] = useState<Set<keyof ContactFormData>>(
    new Set(),
  )
  const [country, setCountry] = useState(detectCountry)

  /**
   * Akıllı (insani) hata mesajları.
   *
   * Eski akış zod'un ham İngilizce mesajını basıyordu ("Please enter your email
   * or phone number") — kullanıcı neyi yanlış yaptığını anlamıyordu. Artık:
   *   - boş alan → ne eksik olduğunu söyler
   *   - telefon → veriden gelen gerçek hane sayısı gösterilir (TR 10 vs.)
   *   - e-posta → hatalı olduğu açıkça söylenir
   */
  const smartMessage = useCallback(
    (field: keyof ContactFormData, value: string): string | undefined => {
      const v = value.trim()
      if (field === 'name') {
        if (!v) {
          return t('form.errNameEmpty')
        }
        if (v.length < 2) {
          return t('form.errNameShort', { n: v.length })
        }
        if (!/^[a-z\s]+$/i.test(v)) {
          return t('form.errNameChars')
        }
        return undefined
      }
      if (field === 'message') {
        if (!v) {
          return t('form.errMessageEmpty')
        }
        if (v.length < 10) {
          return t('form.errMessageShort', { n: v.length })
        }
        if (v.length > 1000) {
          return t('form.errMessageLong')
        }
        return undefined
      }
      if (field === 'contactValue') {
        if (!v) {
          return formData.contactMethod === 'phone'
            ? t('form.errPhoneEmpty')
            : t('form.errEmailEmpty')
        }
        if (formData.contactMethod === 'email') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
            return t('form.errEmailInvalid')
          }
          return undefined
        }
        // Telefon: ülke kodu + ulusal numara
        const parsed = parsePhone(v)
        if (!parsed.code && !parsed.number) {
          return t('form.errPhoneEmpty')
        }
        if (parsed.iso2) {
          const r = validatePhone(parsed.code, parsed.number, parsed.iso2)
          if (r.verdict === 'tooShort') {
            return t('form.errPhoneShort', { min: r.min ?? 1, max: r.max ?? 0 })
          }
          if (r.verdict === 'tooLong') {
            return t('form.errPhoneLong', { max: r.max ?? 15 })
          }
        }
        else if (parsed.number.length > E164_MAX_DIGITS) {
          return t('form.errPhoneLong', { max: E164_MAX_DIGITS })
        }
        return undefined
      }
      return undefined
    },
    [t, formData.contactMethod],
  )

  const validateField = useCallback(
    (field: keyof ContactFormData, value: string, showError = false) => {
      const message = smartMessage(field, value)
      if (!message) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete (newErrors as Record<string, string | undefined>)[field]
          return newErrors
        })
        return true
      }
      if (showError || touchedFields.has(field)) {
        setErrors(prev => ({ ...prev, [field]: message }))
      }
      return false
    },
    [smartMessage, touchedFields],
  )

  const updateField = useCallback(
    (field: keyof ContactFormData, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }))
      // Stale closure düzeltmesi: setTouchedFields callback'i içinde
      // validateField çağrılır, böylece touchedFields her zaman günceldir.
      setTouchedFields(prev => {
        const next = new Set(prev).add(field)
        // validateField'i burada çağırmak için güncel touchedFields'e ihtiyaç var
        // ama setState callback'i içinde başka setState çağırmak sorun yaratır.
        // Bunun yerine: validateField'i setTouchedFields'ten SONRA çağırırız
        // ve touchedFields yerine ref kullanırız.
        return next
      })
      // validateField'i hemen çağır — touchedFields hâlâ eski olabilir ama
      // validateField zaten touchedFields.has(field) kontrolü yapıyor.
      // İlk yazımda hata göstermemesi için: sadece value.trim() boş değilse
      // veya daha önce dokunulmuşsa validate et.
      if (value.trim()) {
        validateField(field, value, true)
      }
    },
    [validateField],
  )

  const isFormValid = useMemo(() => {
    const { name, contactValue, message } = formData
    if (!name.trim() || !contactValue.trim() || !message.trim()) {
      return false
    }
    try {
      contactFormSchema.parse(formData)
      return true
    }
    catch {
      return false
    }
  }, [formData])

  /** Reset the value and error when the contact method (Email/Phone) changes. */
  const switchContactMethod = useCallback((method: 'email' | 'phone') => {
    setFormData(prev => ({
      ...prev,
      contactMethod: method,
      contactValue: '',
    }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next.contactValue
      return next
    })
  }, [])

  const submitForm = useCallback(async (): Promise<
    keyof ContactFormData | 'ok' | null
  > => {
    try {
      setErrors({})
      setTouchedFields(
        new Set<keyof ContactFormData>(['name', 'contactValue', 'message']),
      )
      const nameValid = validateField('name', formData.name, true)
      const contactValid = validateField(
        'contactValue',
        formData.contactValue,
        true,
      )
      const messageValid = validateField('message', formData.message, true)
      if (!nameValid || !messageValid || !contactValid) {
        if (!nameValid)
          return 'name'
        if (!contactValid)
          return 'contactValue'
        if (!messageValid)
          return 'message'
      }
      setIsSubmitting(true)
      const validatedData = contactFormSchema.parse(formData)
      // Prefix the selected country calling code to the phone number.
      const callingCode = COUNTRIES.find(c => c.iso2 === country)?.code ?? '90'
      const payload
        = validatedData.contactMethod === 'phone'
          ? {
              ...validatedData,
              contactValue: `+${callingCode}${validatedData.contactValue.replace(/^0+/, '')}`,
            }
          : validatedData
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result: ContactApiResponse = await response.json()
      if (!response.ok) {
        setErrors({ general: result.message || 'Failed to send message' })
        return null
      }
      if (result.success) {
        setIsSubmitted(true)
        setFormData(initialFormData)
        setTouchedFields(new Set())
        return 'ok'
      }
      setErrors({ general: result.message || 'Failed to send message' })
      return null
    }
    catch (error: any) {
      if (error.errors) {
        const fieldErrors: FormErrors = {}
        error.errors.forEach((err: any) => {
          const field = err.path[0] as keyof FormErrors
          fieldErrors[field] = (err as { message: string }).message
        })
        setErrors(fieldErrors)
        return fieldErrors.name
          ? 'name'
          : (Object.keys(fieldErrors)[0] as keyof ContactFormData)
      }
      setErrors({ general: error.message || 'An unexpected error occurred' })
      return null
    }
    finally {
      setIsSubmitting(false)
    }
  }, [formData, validateField, country])

  const resetForm = useCallback(() => {
    setFormData(initialFormData)
    setErrors({})
    setIsSubmitted(false)
    setIsSubmitting(false)
    setTouchedFields(new Set())
  }, [])

  return {
    formData,
    errors,
    isSubmitting,
    isSubmitted,
    updateField,
    submitForm,
    resetForm,
    isFormValid,
    switchContactMethod,
    country,
    setCountry,
  }
}
