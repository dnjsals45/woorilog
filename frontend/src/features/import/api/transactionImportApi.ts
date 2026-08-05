import { z } from 'zod'
import { apiRequest } from '../../../shared/api/client'
import { budgetSourceSchema, transactionSummarySchema, type BudgetSource } from '../../transaction/api/transactionApi'

export const importSourceTypeSchema = z.enum(['RECEIPT', 'CARD_APP_SCREENSHOT'])
export type ImportSourceType = z.infer<typeof importSourceTypeSchema>
export type ImportImageInput = { image: File; sourceType: ImportSourceType }

export const importSessionCandidateSchema = z.object({
  candidateId: z.number(),
  occurredOn: z.string(),
  amount: z.number(),
  merchant: z.string(),
  suggestedCategoryId: z.number().nullable(),
  defaultBudgetSource: budgetSourceSchema.nullable(),
  duplicateSuspected: z.boolean(),
  duplicateTransactionId: z.number().nullable(),
  sourceType: importSourceTypeSchema,
  selectedByDefault: z.boolean(),
})
export type ImportSessionCandidate = z.infer<typeof importSessionCandidateSchema>

export const importSessionPreviewSchema = z.object({
  sessionId: z.number(),
  candidates: z.array(importSessionCandidateSchema),
  omittedCount: z.number(),
})
export type ImportSessionPreview = z.infer<typeof importSessionPreviewSchema>

export type SaveImportSessionCandidate = { candidateId: number; amount: number; occurredOn: string; merchant: string; categoryId: number | null; budgetSource: BudgetSource | null; selected: boolean; paymentMethod?: { type: 'CASH' | 'CARD' | 'OTHER'; displayName?: string | null }; sharedWithPartner?: boolean | null }

export function previewImportSession(ledgerId: number, inputs: ImportImageInput[]) { const body = new FormData(); inputs.forEach(({ sourceType }) => body.append('sourceTypes', sourceType)); inputs.forEach(({ image }) => body.append('images', image)); return apiRequest(`/api/ledgers/${ledgerId}/transaction-imports/previews`, { method: 'POST', body, schema: importSessionPreviewSchema }) }

export const savedImportCandidateSchema = z.object({ candidateId: z.number(), transaction: transactionSummarySchema })
export type SavedImportCandidate = z.infer<typeof savedImportCandidateSchema>

export const saveImportSessionResponseSchema = z.object({ created: z.array(savedImportCandidateSchema) })
export function saveImportSession(ledgerId: number, sessionId: number, candidates: SaveImportSessionCandidate[]) { return apiRequest(`/api/ledgers/${ledgerId}/transaction-imports`, { method: 'POST', body: { sessionId, candidates }, schema: saveImportSessionResponseSchema }) }
