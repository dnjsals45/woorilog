package com.woorilog.controller.ledger.response

import com.woorilog.application.budget.result.BudgetPeriodDetailResponse
import com.woorilog.application.budget.result.UserSummaryResponse
import com.woorilog.application.ledger.result.CreateSharedLedgerResult
import com.woorilog.application.ledger.result.LedgerSummaryResult

data class BudgetCycleResponse(val startType: String, val startDay: Int?)

data class LedgerSummaryResponse(
    val id: Long,
    val name: String,
    val type: String,
    val role: String,
    val accessState: String,
    val partner: UserSummaryResponse?,
    val budgetCycle: BudgetCycleResponse,
)

fun LedgerSummaryResult.toResponse() = LedgerSummaryResponse(
    id = id,
    name = name,
    type = type,
    role = role,
    accessState = accessState,
    partner = partner,
    budgetCycle = BudgetCycleResponse(budgetCycle.startType, budgetCycle.startDay),
)

data class CreateSharedLedgerResponse(
    val ledger: LedgerSummaryResponse,
    val currentBudgetPeriod: BudgetPeriodDetailResponse,
)

fun CreateSharedLedgerResult.toResponse() = CreateSharedLedgerResponse(
    ledger = ledger.toResponse(),
    currentBudgetPeriod = currentBudgetPeriod,
)
