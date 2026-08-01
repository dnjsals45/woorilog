package com.woorilog.controller.budget

import com.woorilog.common.security.UserPrincipal
import com.woorilog.application.budget.service.FixedBudgetService
import com.woorilog.controller.budget.request.FixedBudgetApiRequest
import com.woorilog.controller.budget.response.FixedBudgetResponse
import com.woorilog.controller.budget.response.toResponse
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
class FixedBudgetController(
    private val fixedBudgetService: FixedBudgetService,
) {
    @GetMapping("/api/ledgers/{ledgerId}/fixed-budgets")
    fun getFixedBudgets(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
    ): List<FixedBudgetResponse> = fixedBudgetService.getFixedBudgets(principal.userId, ledgerId).map { it.toResponse() }

    @PostMapping("/api/ledgers/{ledgerId}/fixed-budgets")
    fun createFixedBudget(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: FixedBudgetApiRequest,
    ): FixedBudgetResponse = fixedBudgetService.createFixedBudget(principal.userId, ledgerId, request.toCommand()).toResponse()

    @PutMapping("/api/fixed-budgets/{fixedBudgetId}")
    fun updateFixedBudget(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable fixedBudgetId: Long,
        @Valid @RequestBody request: FixedBudgetApiRequest,
    ): FixedBudgetResponse = fixedBudgetService.updateFixedBudget(principal.userId, fixedBudgetId, request.toCommand()).toResponse()

    @DeleteMapping("/api/fixed-budgets/{fixedBudgetId}")
    fun deleteFixedBudget(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable fixedBudgetId: Long,
    ): ResponseEntity<Void> {
        fixedBudgetService.deleteFixedBudget(principal.userId, fixedBudgetId)
        return ResponseEntity.noContent().build()
    }
}
