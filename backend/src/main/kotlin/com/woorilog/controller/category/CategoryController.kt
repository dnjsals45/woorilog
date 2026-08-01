package com.woorilog.controller.category

import com.woorilog.common.security.UserPrincipal
import com.woorilog.application.category.service.CategoryService
import com.woorilog.controller.category.request.CreateCategoryApiRequest
import com.woorilog.controller.category.request.CreateCategoryGroupApiRequest
import com.woorilog.controller.category.request.UpdateCategoryApiRequest
import com.woorilog.controller.category.request.UpdateCategoryGroupVisibilityRequest
import com.woorilog.controller.category.response.CategoryGroupResponse
import com.woorilog.controller.category.response.CategoryResponse
import com.woorilog.controller.category.response.toResponse
import jakarta.validation.Valid
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
        return categoryService.getCategories(principal.userId, ledgerId).map { it.toResponse() }
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
        ).toResponse()
    }

}

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
    ).toResponse()

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
    ): List<CategoryGroupResponse> = categoryService.getCategoryGroups(principal.userId, ledgerId).map { it.toResponse() }

    @PostMapping
    fun createCategoryGroup(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: CreateCategoryGroupApiRequest,
    ): CategoryGroupResponse = categoryService.createCategoryGroup(principal.userId, ledgerId, request.name, request.type).toResponse()

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
    ).toResponse()
}
