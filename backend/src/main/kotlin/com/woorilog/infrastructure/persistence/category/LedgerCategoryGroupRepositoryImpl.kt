package com.woorilog.infrastructure.persistence.category

import com.woorilog.domain.category.entity.LedgerCategoryGroup
import com.woorilog.domain.category.repository.LedgerCategoryGroupRepository
import org.springframework.stereotype.Repository

@Repository
class LedgerCategoryGroupRepositoryImpl(
    private val jpaRepository: LedgerCategoryGroupJpaRepository,
) : LedgerCategoryGroupRepository {
    override fun findByIdOrNull(id: Long): LedgerCategoryGroup? = jpaRepository.findById(id).orElse(null)
    override fun findByLedgerIdOrderByIdAsc(ledgerId: Long) = jpaRepository.findByLedgerIdOrderByIdAsc(ledgerId)
    override fun findByLedgerIdAndName(ledgerId: Long, name: String) = jpaRepository.findByLedgerIdAndName(ledgerId, name)
    override fun findByLedgerIdAndCode(ledgerId: Long, code: String) = jpaRepository.findByLedgerIdAndCode(ledgerId, code)
    override fun existsByLedgerId(ledgerId: Long) = jpaRepository.existsByLedgerId(ledgerId)
    override fun save(ledgerCategoryGroup: LedgerCategoryGroup): LedgerCategoryGroup = jpaRepository.save(ledgerCategoryGroup)
}
