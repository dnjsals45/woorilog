package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.LedgerDto
import com.woorilog.service.LedgerMemberResponse
import com.woorilog.service.LedgerListResponse
import com.woorilog.service.LedgerService
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

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
    ): List<LedgerMemberResponse> {
        return ledgerService.getLedgerMembers(principal.userId, ledgerId)
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

    @PostMapping("/{ledgerId}/use")
    fun useLedger(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long
    ): LedgerDto {
        return ledgerService.useLedger(principal.userId, ledgerId)
    }
}

data class CreateLedgerRequest(
    @field:NotBlank(message = "장부 이름은 필수 입력값입니다.")
    val name: String
)
