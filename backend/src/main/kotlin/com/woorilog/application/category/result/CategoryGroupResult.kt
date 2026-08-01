package com.woorilog.application.category.result

import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.category.entity.LedgerCategoryGroup

data class CategoryGroupResult(
    val id: Long,
    val ledgerId: Long,
    val name: String,
    val type: CategoryType,
    val code: String,
    val hidden: Boolean,
    val sortOrder: Int,
)

fun LedgerCategoryGroup.toResult() = CategoryGroupResult(
    id = this.id!!,
    ledgerId = this.ledger.id!!,
    name = this.name,
    type = this.type,
    code = this.code,
    hidden = this.hidden,
    sortOrder = this.sortOrder,
)
