package com.woorilog.application.ledger.result

import com.woorilog.application.budget.result.BudgetPeriodDetailResponse

data class CreateSharedLedgerResult(
    val ledger: LedgerSummaryResult,
    val currentBudgetPeriod: BudgetPeriodDetailResponse,
)
