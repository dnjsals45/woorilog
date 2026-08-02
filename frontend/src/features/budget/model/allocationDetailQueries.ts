import { useQuery } from '@tanstack/react-query'
import { getAllocationDetail } from '../api/allocationDetailApi'

export const allocationDetailQueryKeys = {
  all: ['allocation-detail'] as const,
  detail: (ledgerId: number, startDate: string, allocationId: number) =>
    ['allocation-detail', ledgerId, startDate, allocationId] as const,
}

/** 예산 상세 모달 전용 조회 훅 — 카테고리별 사용액·일별 소비 흐름·이 예산의 거래 목록을 한 번에 가져옵니다. */
export function useAllocationDetailQuery(
  ledgerId: number | undefined,
  startDate: string | undefined,
  allocationId: number | undefined,
) {
  return useQuery({
    queryKey:
      ledgerId && startDate && allocationId
        ? allocationDetailQueryKeys.detail(ledgerId, startDate, allocationId)
        : allocationDetailQueryKeys.all,
    queryFn: () => getAllocationDetail(ledgerId!, startDate!, allocationId!),
    enabled: Boolean(ledgerId && startDate && allocationId),
    retry: false,
  })
}
