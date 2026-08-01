package com.woorilog.controller.budget

import com.woorilog.common.security.UserPrincipal
import com.woorilog.application.budget.service.BudgetMonthService
import com.woorilog.controller.budget.request.UpdateBudgetMonthApiRequest
import com.woorilog.controller.budget.response.BudgetMonthSettingsResponse
import com.woorilog.controller.budget.response.toResponse
import jakarta.validation.Valid
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/ledgers/{ledgerId}/months/{budgetMonth}")
class BudgetMonthController(
    private val budgetMonthService: BudgetMonthService
) {

    @GetMapping
    fun getBudgetMonth(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable budgetMonth: String
    ): BudgetMonthSettingsResponse {
        return budgetMonthService.getBudgetMonthSettings(principal.userId, ledgerId, budgetMonth).toResponse()
    }

    @Valid
    @PutMapping
    fun updateBudgetMonth(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable budgetMonth: String,
        @Valid @RequestBody request: UpdateBudgetMonthApiRequest
    ): BudgetMonthSettingsResponse {
        return budgetMonthService.updateBudgetMonthSettings(principal.userId, ledgerId, budgetMonth, request.toCommand()).toResponse()
    }

    @PostMapping("/close")
    fun closeBudgetMonth(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable budgetMonth: String
    ): BudgetMonthSettingsResponse {
        return budgetMonthService.closeBudgetMonth(principal.userId, ledgerId, budgetMonth).toResponse()
    }

    @PostMapping("/reopen")
    fun reopenBudgetMonth(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable budgetMonth: String
    ): BudgetMonthSettingsResponse {
        return budgetMonthService.reopenBudgetMonth(principal.userId, ledgerId, budgetMonth).toResponse()
    }
}
