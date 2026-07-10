package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface LedgerCategoryRepository : JpaRepository<LedgerCategory, Long> {
    fun findByLedgerId(ledgerId: Long): List<LedgerCategory>
    fun findByLedgerIdOrderBySortOrderAsc(ledgerId: Long): List<LedgerCategory>
    fun findByLedgerIdAndName(ledgerId: Long, name: String): LedgerCategory?
}
