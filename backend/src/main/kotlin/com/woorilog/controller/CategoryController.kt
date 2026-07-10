package com.woorilog.controller

import com.woorilog.domain.CategoryType
import com.woorilog.security.UserPrincipal
import com.woorilog.service.CategoryResponse
import com.woorilog.service.CategoryService
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/ledgers/{ledgerId}/categories")
class CategoryController(
    private val categoryService: CategoryService
) {

    @GetMapping
    fun getCategories(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long
    ): List<CategoryResponse> {
        return categoryService.getCategories(principal.userId, ledgerId)
    }

    @PostMapping
    fun createCategory(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: CreateCategoryApiRequest
    ): CategoryResponse {
        return categoryService.createCategory(principal.userId, ledgerId, request.name, request.type)
    }
}

data class CreateCategoryApiRequest(
    @field:NotBlank(message = "카테고리 이름은 필수 입력값입니다.")
    val name: String,

    @field:NotNull(message = "카테고리 타입은 필수 입력값입니다.")
    val type: CategoryType
)
