package com.woorilog.controller.category.response

import com.woorilog.application.category.result.CategoryResult
import com.woorilog.domain.category.entity.CategoryType

data class CategoryResponse(
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

fun CategoryResult.toResponse() = CategoryResponse(
    id = id,
    ledgerId = ledgerId,
    name = name,
    type = type,
    categoryGroupId = categoryGroupId,
    categoryGroupName = categoryGroupName,
    sortOrder = sortOrder,
    defaultCategory = defaultCategory,
    groupCode = groupCode,
    groupName = groupName,
    active = active,
)
