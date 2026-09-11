'use client'

import { PuckPageView } from '@/components/puck/puck-page-view'

export function Client({ data, embed }: { data: Record<string, unknown>; embed?: boolean }) {
  return <PuckPageView data={data} embed={embed} />
}

export default Client