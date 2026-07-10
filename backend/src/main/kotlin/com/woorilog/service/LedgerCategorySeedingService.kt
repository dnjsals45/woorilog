package com.woorilog.service

import com.woorilog.domain.CategoryType
import com.woorilog.domain.Ledger
import com.woorilog.domain.LedgerCategory
import com.woorilog.domain.LedgerCategoryRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class LedgerCategorySeedingService(
    private val ledgerCategoryRepository: LedgerCategoryRepository
) {
    fun seedDefaultCategories(ledger: Ledger) {
        val defaults = listOf(
            Triple("식비", CategoryType.EXPENSE, 1),
            Triple("카페", CategoryType.EXPENSE, 2),
            Triple("교통", CategoryType.EXPENSE, 3),
            Triple("생활", CategoryType.EXPENSE, 4),
            Triple("급여", CategoryType.INCOME, 5)
        )
        defaults.forEach { (name, type, order) ->
            ledgerCategoryRepository.save(
                LedgerCategory(
                    ledger = ledger,
                    name = name,
                    type = type,
                    sortOrder = order,
                    defaultCategory = true
                )
            )
        }
    }
}
