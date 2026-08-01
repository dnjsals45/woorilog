package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.FixedBudgetTemplate
import org.springframework.data.jpa.repository.JpaRepository

interface FixedBudgetTemplateJpaRepository : JpaRepository<FixedBudgetTemplate, Long> {
    fun existsByCategoryId(categoryId: Long): Boolean

    fun findByLedgerIdOrderByIdDesc(ledgerId: Long): List<FixedBudgetTemplate>
    fun findByLedgerIdAndActiveTrue(ledgerId: Long): List<FixedBudgetTemplate>
}
