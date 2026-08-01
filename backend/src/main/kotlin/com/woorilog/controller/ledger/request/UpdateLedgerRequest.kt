package com.woorilog.controller.ledger.request

import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min

data class UpdateLedgerRequest(
    val name: String? = null,

    @field:Valid
    val budgetCycle: BudgetCycleRequest? = null,

    @field:Min(value = 1, message = "반복 거래 집계 마감일은 1일에서 31일 사이여야 합니다.")
    @field:Max(value = 31, message = "반복 거래 집계 마감일은 1일에서 31일 사이여야 합니다.")
    val recurringSummaryClosingDay: Int? = null,
)
