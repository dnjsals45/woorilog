package com.woorilog.controller.ledger.request

import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank

data class CreateSharedLedgerRequest(
    @field:NotBlank val name: String,
    @field:Min(0) val totalBudget: Long,
    @field:Valid val budgetCycle: BudgetCycleRequest,
)
