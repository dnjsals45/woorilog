import { createContext, useContext } from 'react'

type TransactionEntryContextValue = {
  openTransactionEntry: () => void
}

export const TransactionEntryContext = createContext<TransactionEntryContextValue | null>(null)

export function useTransactionEntry() {
  const context = useContext(TransactionEntryContext)

  if (!context) {
    throw new Error('useTransactionEntry must be used inside AppShell')
  }

  return context
}
