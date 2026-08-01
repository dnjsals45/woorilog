package com.woorilog.domain.budget.repository

import com.woorilog.domain.budget.entity.ReserveTransfer

interface ReserveTransferRepository {
    fun findByBudgetPeriodIdOrderByCreatedAt(budgetPeriodId: Long): List<ReserveTransfer>
    fun save(reserveTransfer: ReserveTransfer): ReserveTransfer
}
