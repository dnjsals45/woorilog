import { createContext, useContext, type MouseEvent } from 'react'

type TransactionEntryContextValue = {
  openTransactionEntry: (preset?: TransactionEntryPreset | MouseEvent<HTMLElement>) => void
}

export type TransactionEntryPreset = {
  type?: 'EXPENSE' | 'INCOME'
  categoryName?: string
  amount?: string
  memo?: string
}

export const TransactionEntryContext = createContext<TransactionEntryContextValue | null>(null)

export function useTransactionEntry() {
  const context = useContext(TransactionEntryContext)

  if (!context) {
    throw new Error('useTransactionEntry must be used inside AppShell')
  }

  return context
}
