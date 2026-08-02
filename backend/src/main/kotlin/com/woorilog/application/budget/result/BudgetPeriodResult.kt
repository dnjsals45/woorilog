package com.woorilog.application.budget.result

import java.time.Instant
import java.time.LocalDate

// NOTE: These types are shared "application result" DTOs consumed directly (by name) across many
// domains that have not yet been migrated to the target layered structure (ledger, invitation,
// analytics, scheduled, transaction, transactionimport). They keep their historical "...Response"
// names even though they now live under application/budget/result to avoid a large simultaneous
// rename across every one of those still-flat consumers. Budget's own controller (BudgetPeriodController)
// intentionally returns these types directly instead of introducing a parallel 1:1 controller/response
// wrapper for each one, since that would only add boilerplate without changing the wire format
// (see kotlin-spring-backend code-organization.md's "boilerplate only" exception).

data class UserSummaryResponse(val id: Long, val nickname: String)
data class BudgetSourceResponse(val type: String, val ownerUserId: Long?)
data class BudgetAllocationResponse(
    val id: Long,
    val source: BudgetSourceResponse,
    val owner: UserSummaryResponse?,
    val amount: Long,
    val spentAmount: Long,
    val currentBalance: Long,
    val scheduledAmount: Long,
    val availableAmount: Long,
)
data class BudgetPeriodDetailResponse(
    val id: Long,
    val ledgerId: Long,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val status: String,
    val totalBudget: Long,
    val allocations: List<BudgetAllocationResponse>,
    val reserveAmount: Long?,
    val prepared: Boolean,
    val copiedFromPeriodId: Long?,
    val categoryBudgets: List<CategoryBudgetResponse>,
)
// previousSpentAmount is null when there is no previous budget period, or when the previous period had
// no allocation of the same scope/owner to compare against. Otherwise it is the amount spent (0 if none).
data class CategoryBudgetResponse(
    val source: BudgetSourceResponse,
    val groupCode: String,
    val groupName: String,
    val amount: Long,
    val spentAmount: Long,
    val previousSpentAmount: Long?,
)
data class BudgetPeriodListResponse(val items: List<BudgetPeriodDetailResponse>, val nextCursor: String?)
data class ReserveTransferResponse(
    val id: Long,
    val amount: Long,
    val target: BudgetSourceResponse,
    val actor: UserSummaryResponse,
    val createdAt: Instant,
)
data class ReserveTransferResultResponse(
    val transfer: ReserveTransferResponse,
    val period: BudgetPeriodDetailResponse,
)
data class ReserveTransferListResponse(val items: List<ReserveTransferResponse>)
