package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository

interface FixedBudgetTemplateRepository : JpaRepository<FixedBudgetTemplate, Long> {
    fun existsByCategoryId(categoryId: Long): Boolean

    fun findByLedgerIdOrderByIdDesc(ledgerId: Long): List<FixedBudgetTemplate>
    fun findByLedgerIdAndActiveTrue(ledgerId: Long): List<FixedBudgetTemplate>
}
