package com.woorilog.infrastructure.persistence.category

import com.woorilog.domain.category.entity.LedgerCategory
import org.springframework.data.jpa.repository.JpaRepository

interface LedgerCategoryJpaRepository : JpaRepository<LedgerCategory, Long> {
    fun findByLedgerId(ledgerId: Long): List<LedgerCategory>
    fun findByLedgerIdOrderBySortOrderAsc(ledgerId: Long): List<LedgerCategory>
    fun findByLedgerIdAndName(ledgerId: Long, name: String): LedgerCategory?
    fun findByLedgerIdAndCategoryGroupIdAndNameAndActiveTrue(
        ledgerId: Long,
        categoryGroupId: Long,
        name: String,
    ): LedgerCategory?
}
