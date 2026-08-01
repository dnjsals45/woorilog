package com.woorilog.controller.category.request

import com.woorilog.domain.category.entity.CategoryType
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull

data class CreateCategoryGroupApiRequest(
    @field:NotBlank(message = "대분류 이름은 필수 입력값입니다.")
    val name: String,

    @field:NotNull(message = "대분류 타입은 필수 입력값입니다.")
    val type: CategoryType,
)
