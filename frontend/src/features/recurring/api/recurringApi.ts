import { apiRequest } from '../../../shared/api/client'
import type {
  TransactionCategorySummary,
  TransactionSummary,
  TransactionType,
  UserSummary,
} from '../../transaction/api/transactionApi'

export type RecurringFrequency = 'WEEKLY' | 'MONTHLY'

export type RecurringTemplate = {
  id: number
  ledgerId: number
  type: TransactionType
  amount: number
  category: TransactionCategorySummary | null
  payer: UserSummary
  memo: string | null
  frequency: RecurringFrequency
  startDate: string
  nextDueDate: string
  endDate: string | null
  paused: boolean
}

export type RecurringDueOccurrence = {
  template: RecurringTemplate
  dueDate: string
}

export type SaveRecurringTemplateRequest = {
  type: TransactionType
  amount: number
  categoryId?: number | null
  memo?: string | null
  payerUserId?: number | null
  frequency: RecurringFrequency
  startDate: string
  endDate?: string | null
}

export function getRecurringTemplates(ledgerId: number) {
  return apiRequest<RecurringTemplate[]>(
    `/api/ledgers/${ledgerId}/recurring-transactions`,
  )
}

export function createRecurringTemplate(
  ledgerId: number,
  request: SaveRecurringTemplateRequest,
) {
  return apiRequest<RecurringTemplate>(
    `/api/ledgers/${ledgerId}/recurring-transactions`,
    {
      method: 'POST',
      body: request,
    },
  )
}

export function updateRecurringTemplate(
  templateId: number,
  request: SaveRecurringTemplateRequest,
) {
  return apiRequest<RecurringTemplate>(
    `/api/recurring-transactions/${templateId}`,
    {
      method: 'PUT',
      body: request,
    },
  )
}

export function pauseRecurringTemplate(templateId: number) {
  return apiRequest<RecurringTemplate>(
    `/api/recurring-transactions/${templateId}/pause`,
    { method: 'POST' },
  )
}

export function resumeRecurringTemplate(templateId: number) {
  return apiRequest<RecurringTemplate>(
    `/api/recurring-transactions/${templateId}/resume`,
    { method: 'POST' },
  )
}

export function getRecurringDue(ledgerId: number, asOf?: string) {
  const query = asOf ? `?${new URLSearchParams({ asOf }).toString()}` : ''

  return apiRequest<RecurringDueOccurrence[]>(
    `/api/ledgers/${ledgerId}/recurring-transactions/due${query}`,
  )
}

export function generateRecurringTransactions(ledgerId: number, asOf?: string) {
  const query = asOf ? `?${new URLSearchParams({ asOf }).toString()}` : ''

  return apiRequest<TransactionSummary[]>(
    `/api/ledgers/${ledgerId}/recurring-transactions/generate${query}`,
    { method: 'POST' },
  )
}
