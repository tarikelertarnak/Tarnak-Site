import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Drawer } from '@/components/ui/drawer'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'

describe('drawer with a portaled combobox', () => {
  it('keeps the middle drawer open while selecting a portaled option', async () => {
    const onClose = vi.fn()
    const onSelect = vi.fn()
    render(
      <>
        <div id="layout-main" />
        <button type="button" data-testid="outside">
          Outside
        </button>
        <Drawer open onClose={onClose} side="middle" containerId="layout-main">
          <SearchableCombobox
            options={[{ value: 'de', label: 'Deutsch' }]}
            selected={[]}
            onSelect={onSelect}
            onClear={() => {}}
            placeholder="Language"
            searchPlaceholder="Search"
            ariaLabel="Language"
          />
        </Drawer>
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Language' }))
    // secenek dugmeleri listbox icinde role="option" tasir (a11y: aria-selected)
    const option = await screen.findByRole('option', { name: 'Deutsch' })
    fireEvent.pointerDown(option)
    fireEvent.click(option)

    expect(onClose).not.toHaveBeenCalled()
    expect(onSelect).toHaveBeenCalledWith('de')

    fireEvent.pointerDown(screen.getByTestId('outside'))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })
})
