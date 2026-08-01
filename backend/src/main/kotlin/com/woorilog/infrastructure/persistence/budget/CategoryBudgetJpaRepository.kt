package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.CategoryBudget
import org.springframework.data.jpa.repository.JpaRepository

interface CategoryBudgetJpaRepository : JpaRepository<CategoryBudget, Long> {
    fun existsByCategoryId(categoryId: Long): Boolean

    fun findByLedgerMonthId(ledgerMonthId: Long): List<CategoryBudget>
    fun deleteByLedgerMonthId(ledgerMonthId: Long)
}
