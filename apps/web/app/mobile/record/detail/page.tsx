// @ts-nocheck
'use client'
export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'
import { MobileRecordDetail } from '@/app/mobile/record/mobile-record-detail'

export default function MobileRecordDetailPage() {
  const searchParams = useSearchParams()
  const markId = Number(searchParams.get('id'))

  return <MobileRecordDetail markId={markId} />
}
