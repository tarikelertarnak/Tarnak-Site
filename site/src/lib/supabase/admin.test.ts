import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }))

vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }))

beforeEach(() => {
  vi.resetModules()
  createClientMock.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('server-side Supabase admin client', () => {
  it('prefers SUPABASE_SERVICE_ROLE_KEY and falls back to legacy env name', async () => {
    const client = {}
    createClientMock.mockReturnValue(client)
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'new-service-role-key')
    vi.stubEnv('SUPABASE_SERVICE_ROLE', 'legacy-service-role-key')

    const { createOptionalAdminClient } = await import('@/lib/supabase/admin')
    expect(createOptionalAdminClient()).toBe(client)
    expect(createClientMock).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'new-service-role-key',
      expect.objectContaining({ auth: expect.any(Object), global: expect.any(Object) }),
    )
  })

  it('returns null when server credentials are missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE', '')

    const { createOptionalAdminClient } = await import('@/lib/supabase/admin')
    expect(createOptionalAdminClient()).toBeNull()
    expect(createClientMock).not.toHaveBeenCalled()
  })
})
