package com.woorilog.domain.budget.repository

import com.woorilog.domain.budget.entity.FixedBudgetTemplate

interface FixedBudgetTemplateRepository {
    fun findByIdOrNull(id: Long): FixedBudgetTemplate?
    fun findByLedgerIdOrderByIdDesc(ledgerId: Long): List<FixedBudgetTemplate>
    fun findByLedgerIdAndActiveTrue(ledgerId: Long): List<FixedBudgetTemplate>
    fun save(fixedBudgetTemplate: FixedBudgetTemplate): FixedBudgetTemplate
    fun delete(fixedBudgetTemplate: FixedBudgetTemplate)
}
