package com.woorilog.controller.category.request

import com.woorilog.domain.category.entity.CategoryType
import jakarta.validation.constraints.NotBlank

data class CreateCategoryApiRequest(
    @field:NotBlank(message = "카테고리 이름은 필수 입력값입니다.")
    val name: String,

    val type: CategoryType?,

    val categoryGroupId: Long?,

    val groupCode: String? = null,
)
