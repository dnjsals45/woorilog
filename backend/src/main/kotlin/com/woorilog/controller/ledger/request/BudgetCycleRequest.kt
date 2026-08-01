package com.woorilog.controller.ledger.request

import com.woorilog.domain.budget.policy.BudgetStartType

data class BudgetCycleRequest(
    val startType: BudgetStartType,
    val startDay: Int?,
)
