package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.FixedBudgetResponse
import com.woorilog.service.FixedBudgetService
import com.woorilog.service.SaveFixedBudgetRequest
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
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
    ): List<FixedBudgetResponse> = fixedBudgetService.getFixedBudgets(principal.userId, ledgerId)

    @PostMapping("/api/ledgers/{ledgerId}/fixed-budgets")
    fun createFixedBudget(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: FixedBudgetApiRequest,
    ): FixedBudgetResponse = fixedBudgetService.createFixedBudget(principal.userId, ledgerId, request.toServiceRequest())

    @PutMapping("/api/fixed-budgets/{fixedBudgetId}")
    fun updateFixedBudget(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable fixedBudgetId: Long,
        @Valid @RequestBody request: FixedBudgetApiRequest,
    ): FixedBudgetResponse = fixedBudgetService.updateFixedBudget(principal.userId, fixedBudgetId, request.toServiceRequest())

    @DeleteMapping("/api/fixed-budgets/{fixedBudgetId}")
    fun deleteFixedBudget(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable fixedBudgetId: Long,
    ): ResponseEntity<Void> {
        fixedBudgetService.deleteFixedBudget(principal.userId, fixedBudgetId)
        return ResponseEntity.noContent().build()
    }
}

data class FixedBudgetApiRequest(
    @field:NotBlank(message = "고정비 이름은 필수 입력값입니다.")
    val name: String,
    @field:NotNull(message = "카테고리는 필수 입력값입니다.")
    val categoryId: Long,
    @field:Positive(message = "고정비 금액은 양수여야 합니다.")
    val amount: Long,
    val active: Boolean = true,
) {
    fun toServiceRequest() = SaveFixedBudgetRequest(name, categoryId, amount, active)
}
