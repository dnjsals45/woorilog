package com.woorilog.controller.category.request

import jakarta.validation.constraints.NotBlank

data class UpdateCategoryApiRequest(
    @field:NotBlank(message = "카테고리 이름은 필수 입력값입니다.")
    val name: String,

    val categoryGroupId: Long? = null,

    val applyNameToPastTransactions: Boolean = false,
)
