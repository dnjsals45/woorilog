package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository

interface LedgerCategoryGroupRepository : JpaRepository<LedgerCategoryGroup, Long> {
    fun findByLedgerIdOrderByIdAsc(ledgerId: Long): List<LedgerCategoryGroup>
    fun findByLedgerIdAndName(ledgerId: Long, name: String): LedgerCategoryGroup?
}
