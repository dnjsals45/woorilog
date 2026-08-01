package com.woorilog.controller.budget

import com.woorilog.common.security.UserPrincipal
import com.woorilog.application.budget.service.BudgetPeriodService
import com.woorilog.application.analytics.service.V1InsightsService
import com.woorilog.controller.budget.request.ConfigureBudgetPeriodRequest
import com.woorilog.controller.budget.request.CopyBudgetPeriodRequest
import com.woorilog.controller.budget.request.ReserveTransferRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.time.LocalDate

@RestController
@RequestMapping("/api/ledgers/{ledgerId}/budget-periods")
class BudgetPeriodController(
    private val budgetPeriodService: BudgetPeriodService,
    private val insightsService: V1InsightsService,
) {
    @GetMapping("/current")
    fun current(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestParam(required = false) at: LocalDate?,
    ) = budgetPeriodService.getCurrent(principal.userId, ledgerId, at)

    @GetMapping
    fun list(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
    ) = budgetPeriodService.list(principal.userId, ledgerId)

    @GetMapping("/{startDate}")
    fun get(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable startDate: LocalDate,
    ) = budgetPeriodService.get(principal.userId, ledgerId, startDate)

    @PutMapping("/{startDate}")
    fun configure(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable startDate: LocalDate,
        @Valid @RequestBody request: ConfigureBudgetPeriodRequest,
    ) = budgetPeriodService.configure(
        principal.userId,
        ledgerId,
        startDate,
        request.toCommand(),
    )

    @PostMapping("/{startDate}/copy")
    fun copy(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable startDate: LocalDate,
        @RequestBody request: CopyBudgetPeriodRequest,
    ) = budgetPeriodService.copy(principal.userId, ledgerId, startDate, request.sourceStartDate)

    @PostMapping("/{startDate}/reserve-transfers")
    @ResponseStatus(HttpStatus.CREATED)
    fun transferReserve(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable startDate: LocalDate,
        @Valid @RequestBody request: ReserveTransferRequest,
    ) = budgetPeriodService.transferReserve(
        principal.userId,
        ledgerId,
        startDate,
        request.amount,
        request.target.type,
        request.target.ownerUserId,
    )

    @GetMapping("/{startDate}/reserve-transfers")
    fun reserveTransfers(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable startDate: LocalDate,
    ) = budgetPeriodService.listReserveTransfers(principal.userId, ledgerId, startDate)

    @GetMapping("/{startDate}/summary")
    fun summary(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable startDate: LocalDate,
    ) = insightsService.periodSummary(principal.userId, ledgerId, startDate)

    @GetMapping("/{startDate}/allocations/{allocationId}")
    fun allocationDetail(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable startDate: LocalDate,
        @PathVariable allocationId: Long,
    ) = insightsService.allocationDetail(principal.userId, ledgerId, startDate, allocationId)
}
