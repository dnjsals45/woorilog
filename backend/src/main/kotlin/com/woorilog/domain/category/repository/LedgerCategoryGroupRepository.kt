package com.woorilog.domain.category.repository

import com.woorilog.domain.category.entity.LedgerCategoryGroup

interface LedgerCategoryGroupRepository {
    fun findByIdOrNull(id: Long): LedgerCategoryGroup?
    fun findByLedgerIdOrderByIdAsc(ledgerId: Long): List<LedgerCategoryGroup>
    fun findByLedgerIdAndName(ledgerId: Long, name: String): LedgerCategoryGroup?
    fun findByLedgerIdAndCode(ledgerId: Long, code: String): LedgerCategoryGroup?
    fun existsByLedgerId(ledgerId: Long): Boolean
    fun save(ledgerCategoryGroup: LedgerCategoryGroup): LedgerCategoryGroup
}
