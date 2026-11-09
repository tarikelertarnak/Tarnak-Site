/**
 * ODAK KAYBI REGRESYONU (2026-10-16)
 *
 * Kullanıcı şikâyeti: "Ayarlar → Profil → Ad alanına yazıyorum, her yazdığımda
 * odak başka bir yere gidiyor ve yazmam kesiliyor. Başka yerlerde de var."
 *
 * Kök neden: Drawer/Modal'ın odak efekti `onClose`'u bağımlılık listesinde
 * tutuyordu. Çağıranlar `onClose={() => ...}` (satır içi ok fonksiyonu) verdiği
 * için her render'da referans değişiyor → efekt yeniden çalışıyor →
 * `dialogRef.current?.focus()` input'un odağını KAPIYORDU.
 *
 * Bu dosya iki şeyi birlikte doğrular:
 *  1. Açılışta odak panelin içine girer (a11y davranışı KORUNDU).
 *  2. Yazarken odak input'ta KALIR (düzeltmeden önce kırılan iddia).
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Drawer } from '@/components/ui/drawer'
import { Modal } from '@/components/ui/modal'

/* cleanup() olmadan önceki testin DOM'u kalır ve aynı `aria-label` iki kez
   bulunur ("getMultipleElementsFoundError"). Repo konvansiyonu: elle cleanup. */
afterEach(cleanup)

type Variant = 'drawer' | 'modal'

/**
 * Gerçek kullanımı taklit eder: ebeveyn her tuşta yeniden render olur ve
 * `onClose`'u satır içi ok fonksiyonu olarak geçer (profile-edit-drawer.tsx:194
 * ile aynı kalıp).
 */
function Harness({
  variant,
  onClose,
}: {
  variant: Variant
  onClose?: () => void
}) {
  const [open, setOpen] = useState(true)
  const [text, setText] = useState('')

  const body = (
    <input
      aria-label="Ad"
      value={text}
      onChange={e => setText(e.target.value)}
    />
  )
  const close = () => {
    onClose?.()
    setOpen(false)
  }

  return variant === 'drawer' ? (
    <Drawer open={open} onClose={close} title="Profil">
      {body}
    </Drawer>
  ) : (
    <Modal open={open} onClose={close} title="Profil">
      {body}
    </Modal>
  )
}

describe.each(['drawer', 'modal'] as const)('%s odak davranışı', (variant) => {
  it('açılışta odak panelin içine girer', () => {
    render(<Harness variant={variant} />)
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it('yazarken odak input\'ta kalır (odak çalınmaz)', () => {
    const onClose = vi.fn()
    render(<Harness variant={variant} onClose={onClose} />)
    const input = screen.getByLabelText('Ad')

    input.focus()
    expect(document.activeElement).toBe(input)

    for (const value of ['T', 'TA', 'TAR', 'TARI', 'TARIK']) {
      fireEvent.change(input, { target: { value } })
      expect(document.activeElement).toBe(input)
    }

    // Yazma sırasında kapanma/odak kaçışı olmamalı.
    expect(onClose).not.toHaveBeenCalled()
    expect((input as HTMLInputElement).value).toBe('TARIK')
  })

  it('kapatma davranışı korunur: Esc kapatır', () => {
    const onClose = vi.fn()
    render(<Harness variant={variant} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
