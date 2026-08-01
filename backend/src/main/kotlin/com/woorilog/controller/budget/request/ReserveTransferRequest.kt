package com.woorilog.controller.budget.request

import jakarta.validation.constraints.Min

data class ReserveTransferRequest(@field:Min(1) val amount: Long, val target: BudgetSourceRequest)
