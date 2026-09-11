'use client'

import { PuckEditor } from '@/components/puck/puck-editor'

export function Client({ page }: { page: string }) {
  return <PuckEditor page={page} />
}

export default Client