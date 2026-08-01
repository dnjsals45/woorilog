package com.woorilog.controller.settlement

import com.woorilog.common.security.UserPrincipal
import com.woorilog.application.settlement.service.SettlementService
import com.woorilog.controller.settlement.request.RecordSettlementRequest
import com.woorilog.controller.settlement.response.SettlementSummaryResponse
import com.woorilog.controller.settlement.response.toResponse
import jakarta.validation.Valid
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
    ): SettlementSummaryResponse = settlementService.getSummary(principal.userId, ledgerId, budgetMonth).toResponse()

    @PostMapping("/api/ledgers/{ledgerId}/months/{budgetMonth}/settlements")
    fun recordPayment(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable budgetMonth: String,
        @Valid @RequestBody request: RecordSettlementRequest,
    ): SettlementSummaryResponse = settlementService.recordPayment(
        principal.userId, ledgerId, budgetMonth, request.fromUserId, request.toUserId, request.amount,
    ).toResponse()

    @DeleteMapping("/api/settlements/{paymentId}")
    fun deletePayment(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable paymentId: Long,
    ): ResponseEntity<Void> {
        settlementService.deletePayment(principal.userId, paymentId)
        return ResponseEntity.noContent().build()
    }
}
