package com.woorilog.application.category.result

import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.category.entity.LedgerCategory

data class CategoryResult(
    val id: Long,
    val ledgerId: Long,
    val name: String,
    val type: CategoryType,
    val categoryGroupId: Long,
    val categoryGroupName: String,
    val sortOrder: Int,
    val defaultCategory: Boolean,
    val groupCode: String,
    val groupName: String,
    val active: Boolean,
)

fun LedgerCategory.toResult() = CategoryResult(
    id = this.id!!,
    ledgerId = this.ledger.id!!,
    name = this.name,
    type = this.type,
    categoryGroupId = this.categoryGroup.id!!,
    categoryGroupName = this.categoryGroup.name,
    sortOrder = this.sortOrder,
    defaultCategory = this.defaultCategory,
    groupCode = this.categoryGroup.code,
    groupName = this.categoryGroup.name,
    active = this.active,
)
