package com.woorilog.service

import com.woorilog.domain.CategoryType
import com.woorilog.domain.Ledger
import com.woorilog.domain.LedgerCategory
import com.woorilog.domain.LedgerCategoryGroup
import com.woorilog.domain.LedgerCategoryGroupRepository
import com.woorilog.domain.LedgerCategoryRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class LedgerCategorySeedingService(
    private val ledgerCategoryRepository: LedgerCategoryRepository,
    private val ledgerCategoryGroupRepository: LedgerCategoryGroupRepository,
) {
    fun seedDefaultCategories(ledger: Ledger) {
        val groups = listOf(
            "식비" to CategoryType.EXPENSE,
            "교통" to CategoryType.EXPENSE,
            "생활" to CategoryType.EXPENSE,
            "수입" to CategoryType.INCOME,
        ).associate { (name, type) ->
            name to ledgerCategoryGroupRepository.save(LedgerCategoryGroup(ledger, name, type))
        }
        val defaults = listOf(
            Triple("식비", "식비", 1),
            Triple("카페", "식비", 2),
            Triple("교통", "교통", 3),
            Triple("생활", "생활", 4),
            Triple("급여", "수입", 5)
        )
        defaults.forEach { (name, groupName, order) ->
            val group = groups.getValue(groupName)
            ledgerCategoryRepository.save(
                LedgerCategory(
                    ledger = ledger,
                    categoryGroup = group,
                    name = name,
                    type = group.type,
                    sortOrder = order,
                    defaultCategory = true
                )
            )
        }
    }
}
