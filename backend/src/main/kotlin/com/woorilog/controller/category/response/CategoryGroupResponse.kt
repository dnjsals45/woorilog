package com.woorilog.controller.category.response

import com.woorilog.application.category.result.CategoryGroupResult
import com.woorilog.domain.category.entity.CategoryType

data class CategoryGroupResponse(
    val id: Long,
    val ledgerId: Long,
    val name: String,
    val type: CategoryType,
    val code: String,
    val hidden: Boolean,
    val sortOrder: Int,
)

fun CategoryGroupResult.toResponse() = CategoryGroupResponse(
    id = id,
    ledgerId = ledgerId,
    name = name,
    type = type,
    code = code,
    hidden = hidden,
    sortOrder = sortOrder,
)
