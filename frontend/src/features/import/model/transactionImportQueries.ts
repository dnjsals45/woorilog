import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  previewImportSession,
  saveImportSession,
  type SaveImportSessionCandidate,
} from '../api/transactionImportApi'
import { transactionQueryKeys } from '../../transaction/model/transactionQueries'

export function useImportSessionPreviewMutation(ledgerId: number | undefined) { return useMutation({ mutationFn: ({ sourceType, images }: { sourceType: 'RECEIPT' | 'CARD_APP_SCREENSHOT'; images: File[] }) => previewImportSession(ledgerId!, sourceType, images) }) }
export function useSaveImportSessionMutation(ledgerId: number | undefined) { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ sessionId, candidates }: { sessionId: number; candidates: SaveImportSessionCandidate[] }) => saveImportSession(ledgerId!, sessionId, candidates), onSuccess: () => { queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }); queryClient.invalidateQueries({ queryKey: ['budget-periods'] }) } }) }
