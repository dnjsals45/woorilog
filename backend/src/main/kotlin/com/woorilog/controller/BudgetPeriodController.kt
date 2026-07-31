package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.*
import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
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
        ConfigureBudgetPeriodCommand(
            totalBudget = request.totalBudget,
            personalAllocations = request.personalAllocations.map { PersonalAllocationInput(it.userId, it.amount) },
            sharedAllocation = request.sharedAllocation,
            categoryBudgets = request.categoryBudgets.map {
                CategoryBudgetInput(
                    BudgetSourceResponse(it.source.type, it.source.ownerUserId),
                    it.groupCode,
                    it.amount,
                )
            },
            increaseTotalBudgetIfNeeded = request.increaseTotalBudgetIfNeeded,
            applyToFutureDefaults = request.applyToFutureDefaults,
        ),
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
        BudgetSourceResponse(request.target.type, request.target.ownerUserId),
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

data class ConfigureBudgetPeriodRequest(
    @field:Min(0) val totalBudget: Long,
    val personalAllocations: List<PersonalAllocationRequest> = emptyList(),
    @field:Min(0) val sharedAllocation: Long = 0,
    val categoryBudgets: List<CategoryBudgetRequest> = emptyList(),
    val increaseTotalBudgetIfNeeded: Boolean = false,
    val applyToFutureDefaults: Boolean = false,
)
data class PersonalAllocationRequest(val userId: Long, @field:Min(0) val amount: Long)
data class CategoryBudgetRequest(val source: BudgetSourceRequest, @field:NotBlank val groupCode: String, @field:Min(0) val amount: Long)
data class BudgetSourceRequest(val type: String, val ownerUserId: Long?)
data class CopyBudgetPeriodRequest(val sourceStartDate: LocalDate)
data class ReserveTransferRequest(@field:Min(1) val amount: Long, val target: BudgetSourceRequest)
