package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.LedgerDto
import com.woorilog.service.LedgerMemberResponse
import com.woorilog.service.LedgerListResponse
import com.woorilog.service.LedgerService
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
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
        return ledgerService.getLedgers(principal.userId)
    }

    @GetMapping("/{ledgerId}/members")
    fun getLedgerMembers(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long
    ): Map<String, List<LedgerMemberResponse>> {
        return mapOf("items" to ledgerService.getLedgerMembers(principal.userId, ledgerId))
    }

    @PostMapping("/personal")
    fun createPersonalLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: CreateLedgerRequest
    ): LedgerDto {
        return ledgerService.createPersonalLedger(principal.userId, request.name)
    }

    @PostMapping("/group")
    fun createGroupLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: CreateLedgerRequest
    ): LedgerDto {
        return ledgerService.createGroupLedger(principal.userId, request.name)
    }

    @PostMapping("/shared")
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    fun createSharedLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: CreateSharedLedgerRequest,
    ) = ledgerService.createSharedLedger(
        userId = principal.userId,
        name = request.name,
        totalBudget = request.totalBudget,
        startType = request.budgetCycle.startType,
        startDay = request.budgetCycle.startDay,
    )

    @PostMapping("/{ledgerId}/use")
    fun useLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long
    ): LedgerDto {
        return ledgerService.useLedger(principal.userId, ledgerId)
    }

    @PatchMapping("/{ledgerId}")
    fun updateLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: UpdateLedgerRequest,
    ): LedgerDto = ledgerService.updateLedger(
        principal.userId,
        ledgerId,
        request.name,
        request.recurringSummaryClosingDay,
        request.budgetCycle?.startType,
        request.budgetCycle?.startDay,
    )

    @PostMapping("/{ledgerId}/archive")
    fun archiveLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
    ): LedgerDto = ledgerService.archiveLedger(principal.userId, ledgerId)

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
    ) = mapOf("items" to ledgerService.transferOwnership(principal.userId, ledgerId, request.newOwnerUserId))

    @DeleteMapping("/{ledgerId}/members/me")
    fun leaveLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
    ): ResponseEntity<Void> {
        ledgerService.leaveLedger(principal.userId, ledgerId)
        return ResponseEntity.noContent().build()
    }
}

data class CreateLedgerRequest(
    @field:NotBlank(message = "장부 이름은 필수 입력값입니다.")
    val name: String
)

data class CreateSharedLedgerRequest(
    @field:NotBlank val name: String,
    @field:Min(0) val totalBudget: Long,
    @field:Valid val budgetCycle: BudgetCycleRequest,
)

data class BudgetCycleRequest(
    val startType: com.woorilog.domain.BudgetStartType,
    val startDay: Int?,
)

data class OwnershipTransferRequest(val newOwnerUserId: Long)

data class UpdateLedgerRequest(
    val name: String? = null,

    @field:Valid
    val budgetCycle: BudgetCycleRequest? = null,

    @field:Min(value = 1, message = "반복 거래 집계 마감일은 1일에서 31일 사이여야 합니다.")
    @field:Max(value = 31, message = "반복 거래 집계 마감일은 1일에서 31일 사이여야 합니다.")
    val recurringSummaryClosingDay: Int? = null,
)
