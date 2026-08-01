package com.woorilog.domain.category.repository

import com.woorilog.domain.category.entity.LedgerCategory

interface LedgerCategoryRepository {
    fun findByIdOrNull(id: Long): LedgerCategory?
    fun findByLedgerId(ledgerId: Long): List<LedgerCategory>
    fun findByLedgerIdOrderBySortOrderAsc(ledgerId: Long): List<LedgerCategory>
    fun findByLedgerIdAndCategoryGroupIdAndNameAndActiveTrue(
        ledgerId: Long,
        categoryGroupId: Long,
        name: String,
    ): LedgerCategory?
    fun save(ledgerCategory: LedgerCategory): LedgerCategory
}
