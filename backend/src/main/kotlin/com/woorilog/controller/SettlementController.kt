package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.SettlementService
import com.woorilog.service.SettlementSummaryResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.NotNull
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
class SettlementController(private val settlementService: SettlementService) {
    @GetMapping("/api/ledgers/{ledgerId}/months/{budgetMonth}/settlements")
    fun getSummary(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable budgetMonth: String,
    ): SettlementSummaryResponse = settlementService.getSummary(principal.userId, ledgerId, budgetMonth)

    @PostMapping("/api/ledgers/{ledgerId}/months/{budgetMonth}/settlements")
    fun recordPayment(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable budgetMonth: String,
        @Valid @RequestBody request: RecordSettlementRequest,
    ): SettlementSummaryResponse = settlementService.recordPayment(
        principal.userId, ledgerId, budgetMonth, request.fromUserId, request.toUserId, request.amount,
    )

    @DeleteMapping("/api/settlements/{paymentId}")
    fun deletePayment(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable paymentId: Long,
    ): ResponseEntity<Void> {
        settlementService.deletePayment(principal.userId, paymentId)
        return ResponseEntity.noContent().build()
    }
}

data class RecordSettlementRequest(
    @field:NotNull val fromUserId: Long,
    @field:NotNull val toUserId: Long,
    @field:NotNull val amount: Long,
)
