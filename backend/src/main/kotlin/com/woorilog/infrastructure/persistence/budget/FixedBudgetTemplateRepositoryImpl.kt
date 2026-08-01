package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.FixedBudgetTemplate
import com.woorilog.domain.budget.repository.FixedBudgetTemplateRepository
import org.springframework.stereotype.Repository

@Repository
class FixedBudgetTemplateRepositoryImpl(
    private val jpaRepository: FixedBudgetTemplateJpaRepository,
) : FixedBudgetTemplateRepository {
    override fun findByIdOrNull(id: Long): FixedBudgetTemplate? = jpaRepository.findById(id).orElse(null)
    override fun findByLedgerIdOrderByIdDesc(ledgerId: Long) = jpaRepository.findByLedgerIdOrderByIdDesc(ledgerId)
    override fun findByLedgerIdAndActiveTrue(ledgerId: Long) = jpaRepository.findByLedgerIdAndActiveTrue(ledgerId)
    override fun save(fixedBudgetTemplate: FixedBudgetTemplate): FixedBudgetTemplate = jpaRepository.save(fixedBudgetTemplate)
    override fun delete(fixedBudgetTemplate: FixedBudgetTemplate) = jpaRepository.delete(fixedBudgetTemplate)
}
