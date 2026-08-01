package com.woorilog.infrastructure.persistence.category

import com.woorilog.domain.category.entity.LedgerCategoryGroup
import org.springframework.data.jpa.repository.JpaRepository

interface LedgerCategoryGroupJpaRepository : JpaRepository<LedgerCategoryGroup, Long> {
    fun findByLedgerIdOrderByIdAsc(ledgerId: Long): List<LedgerCategoryGroup>
    fun findByLedgerIdAndName(ledgerId: Long, name: String): LedgerCategoryGroup?
    fun findByLedgerIdAndCode(ledgerId: Long, code: String): LedgerCategoryGroup?
    fun existsByLedgerId(ledgerId: Long): Boolean
}
