package com.woorilog.controller.ledger

import com.woorilog.common.security.UserPrincipal
import com.woorilog.application.ledger.service.LedgerService
import com.woorilog.controller.ledger.request.CreateLedgerRequest
import com.woorilog.controller.ledger.request.CreateSharedLedgerRequest
import com.woorilog.controller.ledger.request.OwnershipTransferRequest
import com.woorilog.controller.ledger.request.UpdateLedgerRequest
import com.woorilog.controller.ledger.response.CreateSharedLedgerResponse
import com.woorilog.controller.ledger.response.LedgerListResponse
import com.woorilog.controller.ledger.response.LedgerMemberResponse
import com.woorilog.controller.ledger.response.LedgerResponse
import com.woorilog.controller.ledger.response.toResponse
import jakarta.validation.Valid
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import org.springframework.http.ResponseEntity

@RestController
@RequestMapping("/api/ledgers")
class LedgerController(
    private val ledgerService: LedgerService
) {

    @GetMapping
    fun getLedgers(@AuthenticationPrincipal principal: UserPrincipal): LedgerListResponse {
        return ledgerService.getLedgers(principal.userId).toResponse()
    }

    @GetMapping("/{ledgerId}/members")
    fun getLedgerMembers(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long
    ): Map<String, List<LedgerMemberResponse>> {
        return mapOf("items" to ledgerService.getLedgerMembers(principal.userId, ledgerId).map { it.toResponse() })
    }

    @PostMapping("/personal")
    fun createPersonalLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: CreateLedgerRequest
    ): LedgerResponse {
        return ledgerService.createPersonalLedger(principal.userId, request.name).toResponse()
    }

    @PostMapping("/group")
    fun createGroupLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: CreateLedgerRequest
    ): LedgerResponse {
        return ledgerService.createGroupLedger(principal.userId, request.name).toResponse()
    }

    @PostMapping("/shared")
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    fun createSharedLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: CreateSharedLedgerRequest,
    ): CreateSharedLedgerResponse = ledgerService.createSharedLedger(
        userId = principal.userId,
        name = request.name,
        totalBudget = request.totalBudget,
        startType = request.budgetCycle.startType,
        startDay = request.budgetCycle.startDay,
    ).toResponse()

    @PostMapping("/{ledgerId}/use")
    fun useLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long
    ): LedgerResponse {
        return ledgerService.useLedger(principal.userId, ledgerId).toResponse()
    }

    @PatchMapping("/{ledgerId}")
    fun updateLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: UpdateLedgerRequest,
    ): LedgerResponse = ledgerService.updateLedger(
        principal.userId,
        ledgerId,
        request.name,
        request.recurringSummaryClosingDay,
        request.budgetCycle?.startType,
        request.budgetCycle?.startDay,
    ).toResponse()

    @DeleteMapping("/{ledgerId}")
    fun deleteLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
    ): ResponseEntity<Void> {
        ledgerService.deleteLedger(principal.userId, ledgerId)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{ledgerId}/archive")
    fun archiveLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
    ): LedgerResponse = ledgerService.archiveLedger(principal.userId, ledgerId).toResponse()

    @DeleteMapping("/{ledgerId}/members/{userId}")
    fun removeMember(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable userId: Long,
    ): ResponseEntity<Void> {
        ledgerService.removeMember(principal.userId, ledgerId, userId)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{ledgerId}/ownership-transfer")
    fun transferOwnership(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestBody request: OwnershipTransferRequest,
    ) = mapOf("items" to ledgerService.transferOwnership(principal.userId, ledgerId, request.newOwnerUserId).map { it.toResponse() })

    @DeleteMapping("/{ledgerId}/members/me")
    fun leaveLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
    ): ResponseEntity<Void> {
        ledgerService.leaveLedger(principal.userId, ledgerId)
        return ResponseEntity.noContent().build()
    }
}
