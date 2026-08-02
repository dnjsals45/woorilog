package com.woorilog.controller.ledger.response

import com.woorilog.application.auth.result.LedgerDto
import com.woorilog.domain.ledger.entity.LedgerType

data class LedgerResponse(
    val id: Long,
    val name: String,
    val type: LedgerType,
    val ownerId: Long,
    val recurringSummaryClosingDay: Int,
    val budgetCycle: BudgetCycleResponse,
)

fun LedgerDto.toResponse() = LedgerResponse(
    id = id,
    name = name,
    type = type,
    ownerId = ownerId,
    recurringSummaryClosingDay = recurringSummaryClosingDay,
    budgetCycle = BudgetCycleResponse(budgetStartType, budgetStartDay),
)
