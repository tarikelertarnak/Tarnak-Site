'use client'

import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { Divider } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { CropModal } from '@/components/admin/crop-modal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ALLOWED_IMAGE_TYPES, validateImageFile } from '@/lib/image-crop'

const ACCEPT = ALLOWED_IMAGE_TYPES.join(',')

interface Status {
  type: 'success' | 'error'
  text: string
}

export interface ProfilePhotoUploaderProps {
  profileImage: string
  /** Kırpmayı sıfırdan yeniden ayarlayabilmek için saklanan orijinal görsel. */
  originalImage: string
  displayName: string
  /** Yeni yol(lar) hazır: avatar anında güncellenir. */
  onUploaded: (image: string, original: string) => void
  onStatus: (status: Status | null) => void
}

/**
 * Profil kartındaki avatar + fotoğraf yükleme alanı.
 *
 * Akış: dosya seç/sürükle → İSTEMCİ doğrulaması → kırpma modalı → 512×512
 * kare → `/api/profile-photo` (sunucu tekrar doğrular) → panel state'i.
 * Orijinal dosya da yüklenir; "Yeniden kırp" ondan başlar, böylece kırpma
 * sıfırdan ayarlanabilir.
 *
 * Not: uç nokta SADECE dosyayı depolar, `content.json`'a yazmaz — kayıt
 * panelin kendi mekanizmasıyla (`onUploaded` → içerik kaydetme) yapılır.
 */
export function ProfilePhotoUploader({
  profileImage,
  originalImage,
  displayName,
  onUploaded,
  onStatus,
}: ProfilePhotoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [cropSrc, setCropSrc] = useState('')
  /** Yeni seçilen dosya — kırpma sonrası `originalImage` olarak yüklenir. */
  const [original, setOriginal] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Object URL'i modal kapanınca serbest bırak (canvas çizimi bitene kadar
  // geçerli olmalı, o yüzden seçim anında değil kapanışta revoke edilir).
  useEffect(() => {
    return () => {
      if (cropSrc) {
        URL.revokeObjectURL(cropSrc)
      }
    }
  }, [cropSrc])

  const pick = (file: File | undefined) => {
    if (!file) {
      return
    }
    const check = validateImageFile(file)
    if (!check.ok) {
      onStatus({ type: 'error', text: check.error })
      return
    }
    setOriginal(file)
    setCropSrc(URL.createObjectURL(file))
    onStatus(null)
  }

  const closeCropper = () => {
    setCropSrc('')
    setOriginal(null)
    setConfirmRemove(false)
  }

  const upload = async (cropped: File) => {
    setUploading(true)
    try {
      const image = await send(cropped)
      // Orijinal yalnızca YENİ dosya seçildiyse yüklenir; yeniden kırpma
      // zaten kayıtlı orijinali kullanır, gereksiz kopya oluşturmaya gerek yok.
      const originalUrl = original ? await send(original) : originalImage
      onUploaded(image, originalUrl)
      onStatus({ type: 'success', text: 'Profil fotoğrafı güncellendi.' })
      closeCropper()
    }
 catch (error) {
      onStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Fotoğraf yüklenemedi.',
      })
    }
 finally {
      setUploading(false)
    }
  }

  const remove = () => {
    setConfirmRemove(false)
    onUploaded('', '')
    onStatus({
      type: 'success',
      text: 'Profil fotoğrafı kaldırıldı. Kaydetmeyi unutma.',
    })
  }

  return (
    <Card className="bg-background p-4 sm:p-5">
      <div className="pb-3">
        <h2 className="text-base font-semibold sm:text-lg">Profil Fotoğrafı</h2>
        <Divider className="mt-2" />
      </div>

      {/* Sürükle-bırak alanı: tüm kart hedef, görsel kırpılacak. */}
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          pick(event.dataTransfer.files?.[0])
        }}
        className={`flex flex-col items-center gap-4 rounded-xl border border-dashed p-4 transition-colors sm:flex-row sm:items-center ${
          dragging ? 'border-primary bg-primary/5' : 'border-foreground/15'
        }`}
      >
        {profileImage ? (
          <img
            src={profileImage}
            alt={displayName}
            width={96}
            height={96}
            className="h-24 w-24 shrink-0 rounded-full border border-foreground-200/10 object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-dashed border-foreground/25 text-4xl font-black text-foreground/30">
            {displayName.charAt(0) || 'T'}
          </div>
        )}

        <div className="flex flex-col items-center gap-3 sm:items-start">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => {
              pick(event.target.files?.[0])
              // Aynı dosya yeniden seçilirse değişiklik tetiklensin.
              event.target.value = ''
            }}
          />
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              color="primary"
              onPress={() => fileRef.current?.click()}
              isDisabled={uploading}
              startContent={<Icon icon="mdi:camera" width={18} height={18} />}
            >
              {profileImage ? 'Fotoğrafı Değiştir' : 'Fotoğraf Ekle'}
            </Button>
            {originalImage && (
              <Button
                variant="bordered"
                onPress={() => {
                  setOriginal(null)
                  setCropSrc(originalImage)
                }}
                isDisabled={uploading}
                startContent={
                  <Icon icon="mdi:crop-rotate" width={18} height={18} />
                }
              >
                Yeniden Kırp
              </Button>
            )}
            {profileImage ? (
              confirmRemove ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs text-foreground-600">
                    Fotoğrafı kaldır?
                  </span>
                  <Button
                    color="danger"
                    onPress={remove}
                    startContent={(
                      <Icon
                        icon="mdi:trash-can-outline"
                        width={16}
                        height={16}
                      />
                    )}
                  >
                    Evet, kaldır
                  </Button>
                  <Button
                    variant="bordered"
                    onPress={() => setConfirmRemove(false)}
                  >
                    Vazgeç
                  </Button>
                </span>
              ) : (
                <Button
                  variant="bordered"
                  onPress={() => setConfirmRemove(true)}
                  isDisabled={uploading}
                  startContent={
                    <Icon icon="mdi:trash-can-outline" width={18} height={18} />
                  }
                >
                  Fotoğrafı Kaldır
                </Button>
              )
            ) : null}
          </div>
          <Hint>
            JPG, PNG veya WEBP — en fazla 5 MB. Görsel 512×512 kareye kırpılır.
{' '}
            Dosyayı buraya sürükleyip bırakabilirsin.
          </Hint>
        </div>
      </div>

      {uploading && (
        <p role="status" className="mt-3 text-xs text-foreground-500">
          Fotoğraf yükleniyor…
        </p>
      )}

      {cropSrc && (
        <CropModal
          open
          imageSrc={cropSrc}
          onCancel={closeCropper}
          onSave={upload}
        />
      )}
    </Card>
  )
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-foreground-500">{children}</p>
}

/** `/api/profile-photo`'a tek dosya yükler, public URL'i döndürür. */
async function send(file: File): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/profile-photo', { method: 'POST', body })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'Fotoğraf yüklenemedi.')
  }
  return data.url as string
}
