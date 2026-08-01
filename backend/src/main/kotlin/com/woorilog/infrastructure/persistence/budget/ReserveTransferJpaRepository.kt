package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.ReserveTransfer
import org.springframework.data.jpa.repository.JpaRepository

interface ReserveTransferJpaRepository : JpaRepository<ReserveTransfer, Long> {
    fun findByBudgetPeriodIdOrderByCreatedAt(budgetPeriodId: Long): List<ReserveTransfer>
}
