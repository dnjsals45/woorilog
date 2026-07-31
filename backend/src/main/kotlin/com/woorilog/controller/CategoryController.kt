package com.woorilog.controller

import com.woorilog.domain.CategoryType
import com.woorilog.security.UserPrincipal
import com.woorilog.service.CategoryResponse
import com.woorilog.service.CategoryGroupResponse
import com.woorilog.service.CategoryService
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.http.HttpStatus
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
        return categoryService.createCategory(
            principal.userId,
            ledgerId,
            request.name,
            request.type,
            request.categoryGroupId,
            request.groupCode,
        )
    }

}

data class CreateCategoryApiRequest(
    @field:NotBlank(message = "카테고리 이름은 필수 입력값입니다.")
    val name: String,

    val type: CategoryType?,

    val categoryGroupId: Long?,

    val groupCode: String? = null,
)

data class UpdateCategoryApiRequest(
    @field:NotBlank(message = "카테고리 이름은 필수 입력값입니다.")
    val name: String,

    val categoryGroupId: Long? = null,

    val applyNameToPastTransactions: Boolean = false,
)

@RestController
@RequestMapping("/api/categories")
class CategoryManagementController(
    private val categoryService: CategoryService,
) {
    @PatchMapping("/{categoryId}")
    fun updateCategory(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable categoryId: Long,
        @Valid @RequestBody request: UpdateCategoryApiRequest,
    ): CategoryResponse = categoryService.updateCategory(
        principal.userId,
        categoryId,
        request.name,
        request.categoryGroupId,
        request.applyNameToPastTransactions,
    )

    @DeleteMapping("/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteCategory(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable categoryId: Long,
    ) {
        categoryService.deleteCategory(principal.userId, categoryId)
    }
}

@RestController
@RequestMapping("/api/ledgers/{ledgerId}/category-groups")
class CategoryGroupController(
    private val categoryService: CategoryService,
) {
    @GetMapping
    fun getCategoryGroups(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
    ): List<CategoryGroupResponse> = categoryService.getCategoryGroups(principal.userId, ledgerId)

    @PostMapping
    fun createCategoryGroup(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: CreateCategoryGroupApiRequest,
    ): CategoryGroupResponse = categoryService.createCategoryGroup(principal.userId, ledgerId, request.name, request.type)

    @PatchMapping("/{groupCode}")
    fun updateVisibility(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable groupCode: String,
        @RequestBody request: UpdateCategoryGroupVisibilityRequest,
    ): CategoryGroupResponse = categoryService.updateCategoryGroupVisibility(
        principal.userId,
        ledgerId,
        groupCode,
        request.hidden,
    )
}

data class UpdateCategoryGroupVisibilityRequest(val hidden: Boolean)

data class CreateCategoryGroupApiRequest(
    @field:NotBlank(message = "대분류 이름은 필수 입력값입니다.")
    val name: String,

    @field:NotNull(message = "대분류 타입은 필수 입력값입니다.")
    val type: CategoryType,
)
