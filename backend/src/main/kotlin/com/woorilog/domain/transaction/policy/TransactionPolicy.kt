package com.woorilog.domain.transaction.policy

enum class LedgerTransactionType {
    EXPENSE,
    INCOME,
    TRANSFER,
}

enum class TransferType {
    OWN_ACCOUNTS,
    OUTBOUND,
    INBOUND,
}

enum class BudgetScopeType {
    PERSONAL,
    SHARED,
}

enum class TransactionAggregationEffect {
    EXPENSE,
    INCOME,
    EXCLUDED,
}

object TransactionPolicy {
    fun aggregationEffect(
        type: LedgerTransactionType,
        transferType: TransferType?,
    ): TransactionAggregationEffect = when (type) {
        LedgerTransactionType.EXPENSE -> {
            require(transferType == null) { "Only transfers accept transferType." }
            TransactionAggregationEffect.EXPENSE
        }

        LedgerTransactionType.INCOME -> {
            require(transferType == null) { "Only transfers accept transferType." }
            TransactionAggregationEffect.INCOME
        }

        LedgerTransactionType.TRANSFER -> when (requireNotNull(transferType) {
            "TRANSFER requires transferType."
        }) {
            TransferType.OWN_ACCOUNTS -> TransactionAggregationEffect.EXCLUDED
            TransferType.OUTBOUND -> TransactionAggregationEffect.EXPENSE
            TransferType.INBOUND -> TransactionAggregationEffect.INCOME
        }
    }

    fun requiresBudgetAllocation(
        type: LedgerTransactionType,
        transferType: TransferType?,
    ): Boolean = aggregationEffect(type, transferType) == TransactionAggregationEffect.EXPENSE
}
