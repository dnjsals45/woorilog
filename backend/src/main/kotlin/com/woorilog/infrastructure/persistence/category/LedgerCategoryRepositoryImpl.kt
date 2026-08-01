package com.woorilog.infrastructure.persistence.category

import com.woorilog.domain.category.entity.LedgerCategory
import com.woorilog.domain.category.repository.LedgerCategoryRepository
import org.springframework.stereotype.Repository

@Repository
class LedgerCategoryRepositoryImpl(
    private val jpaRepository: LedgerCategoryJpaRepository,
) : LedgerCategoryRepository {
    override fun findByIdOrNull(id: Long): LedgerCategory? = jpaRepository.findById(id).orElse(null)
    override fun findByLedgerId(ledgerId: Long) = jpaRepository.findByLedgerId(ledgerId)
    override fun findByLedgerIdOrderBySortOrderAsc(ledgerId: Long) = jpaRepository.findByLedgerIdOrderBySortOrderAsc(ledgerId)
    override fun findByLedgerIdAndCategoryGroupIdAndNameAndActiveTrue(ledgerId: Long, categoryGroupId: Long, name: String) =
        jpaRepository.findByLedgerIdAndCategoryGroupIdAndNameAndActiveTrue(ledgerId, categoryGroupId, name)
    override fun save(ledgerCategory: LedgerCategory): LedgerCategory = jpaRepository.save(ledgerCategory)
}
