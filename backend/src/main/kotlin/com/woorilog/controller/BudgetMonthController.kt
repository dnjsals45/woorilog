package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.*
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
        return budgetMonthService.getBudgetMonthSettings(principal.userId, ledgerId, budgetMonth)
    }

    @Valid
    @PutMapping
    fun updateBudgetMonth(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable budgetMonth: String,
        @Valid @RequestBody request: UpdateBudgetMonthRequest
    ): BudgetMonthSettingsResponse {
        return budgetMonthService.updateBudgetMonthSettings(principal.userId, ledgerId, budgetMonth, request)
    }

    @PostMapping("/close")
    fun closeBudgetMonth(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable budgetMonth: String
    ): BudgetMonthSettingsResponse {
        return budgetMonthService.closeBudgetMonth(principal.userId, ledgerId, budgetMonth)
    }

    @PostMapping("/reopen")
    fun reopenBudgetMonth(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable budgetMonth: String
    ): BudgetMonthSettingsResponse {
        return budgetMonthService.reopenBudgetMonth(principal.userId, ledgerId, budgetMonth)
    }
}
