package com.woorilog.application.analytics.service

import com.woorilog.domain.budget.entity.BudgetAllocationScope
import com.woorilog.domain.budget.entity.BudgetPeriod
import com.woorilog.domain.budget.repository.BudgetAllocationRepository
import com.woorilog.domain.budget.repository.BudgetPeriodRepository
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.ledger.repository.LedgerMemberRepository
import com.woorilog.domain.ledger.repository.LedgerRepository
import com.woorilog.domain.scheduled.entity.ScheduledOccurrenceStatus
import com.woorilog.domain.scheduled.repository.ScheduledOccurrenceRepository
import com.woorilog.domain.transaction.entity.Transaction
import com.woorilog.domain.transaction.policy.BudgetScopeType
import com.woorilog.domain.transaction.policy.LedgerTransactionType
import com.woorilog.domain.transaction.policy.TransactionAggregationEffect
import com.woorilog.domain.transaction.repository.TransactionRepository
import com.woorilog.domain.transaction.policy.TransactionPolicy
import com.woorilog.application.budget.service.BudgetPeriodService
import com.woorilog.application.budget.result.BudgetPeriodDetailResponse
import com.woorilog.application.budget.result.BudgetSourceResponse
import com.woorilog.application.transaction.result.TransactionResult
import com.woorilog.application.transaction.result.toResult
import com.woorilog.application.analytics.result.AllocationDetailResponse
import com.woorilog.application.analytics.result.AnalyticsResponse
import com.woorilog.application.analytics.result.BudgetPeriodSummaryResponse
import com.woorilog.application.analytics.result.DailyCumulativeResponse
import com.woorilog.application.analytics.result.DailySpendingResponse
import com.woorilog.application.analytics.result.PeriodTrendResponse
import com.woorilog.application.analytics.result.V1CategorySpendingResponse
import com.woorilog.domain.transaction.policy.AnalyticsScope
import com.woorilog.common.exception.ForbiddenException
import com.woorilog.common.exception.NotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

@Service
@Transactional(readOnly = true)
class V1InsightsService(
    private val ledgerRepository: LedgerRepository,
    private val memberRepository: LedgerMemberRepository,
    private val periodRepository: BudgetPeriodRepository,
    private val allocationRepository: BudgetAllocationRepository,
    private val transactionRepository: TransactionRepository,
    private val occurrenceRepository: ScheduledOccurrenceRepository,
    private val budgetPeriodService: BudgetPeriodService,
    private val clock: Clock,
) {
    fun periodSummary(userId: Long, ledgerId: Long, startDate: LocalDate): BudgetPeriodSummaryResponse {
        val period = requireReadablePeriod(userId, ledgerId, startDate)
        val detail = budgetPeriodService.get(userId, ledgerId, startDate)
        val visibleAllocations = detail.allocations.filter { it.source.type == "SHARED" || it.source.ownerUserId == userId }
        val visibleTransactions = visibleTransactions(userId, ledgerId, period)
        val categorySpending = categorySpending(visibleTransactions)
        val nextScheduled = occurrenceRepository.findByLedgerAndDueDateBetweenAndStatus(
            ledgerId,
            period.endDate.plusDays(1),
            period.endDate.plusMonths(1),
            ScheduledOccurrenceStatus.SCHEDULED,
        ).sumOf { it.amount }
        return BudgetPeriodSummaryResponse(
            period = detail.copy(allocations = visibleAllocations),
            categorySpending = categorySpending,
            unclassifiedCount = visibleTransactions.count { it.category == null },
            nextPeriodScheduledAmount = nextScheduled,
        )
    }

    fun allocationDetail(userId: Long, ledgerId: Long, startDate: LocalDate, allocationId: Long): AllocationDetailResponse {
        val period = requireReadablePeriod(userId, ledgerId, startDate)
        val allocation = allocationRepository.findByIdOrNull(allocationId) ?: throw NotFoundException("예산 할당을 찾을 수 없습니다.")
        if (allocation.budgetPeriod.id != period.id) throw NotFoundException("예산 할당을 찾을 수 없습니다.")
        val isOtherPersonal = allocation.scope == BudgetAllocationScope.PERSONAL && allocation.owner?.id != userId
        val transactions = transactionRepository.findByBudgetAllocationIdAndTransactionDateBetween(allocationId, period.startDate, period.endDate)
            .filter(::isBudgetExpense)
            .filter { !isOtherPersonal || it.sharedWithPartner == true }
            .sortedWith(compareByDescending<Transaction> { it.transactionDate }.thenByDescending { it.id })
        val spent = transactions.sumOf { it.amount }
        val scheduled = occurrenceRepository.findByLedgerAndDueDateBetweenAndStatus(
            ledgerId, period.startDate, period.endDate, ScheduledOccurrenceStatus.SCHEDULED,
        ).filter { it.plan.scopeType?.name == allocation.scope.name && it.plan.scopeOwnerUserId == allocation.owner?.id }
            .sumOf { it.amount }
        val daily = transactions.groupBy { it.transactionDate }.toSortedMap().map { (date, items) ->
            DailySpendingResponse(date, items.sumOf { it.amount })
        }
        return AllocationDetailResponse(
            allocationId = allocation.id!!,
            source = BudgetSourceResponse(allocation.scope.name, allocation.owner?.id),
            amount = allocation.amount,
            spentAmount = spent,
            currentBalance = allocation.amount - spent,
            scheduledAmount = scheduled,
            availableAmount = allocation.amount - spent - scheduled,
            categorySpending = categorySpending(transactions),
            dailySpending = daily,
            transactions = transactions.map { it.toResult() },
            nextCursor = null,
        )
    }

    fun analytics(userId: Long, ledgerId: Long, periodStart: LocalDate?, scope: AnalyticsScope): AnalyticsResponse {
        val periods = periodRepository.findByLedgerIdOrderByStartDateDesc(ledgerId)
        if (periods.isEmpty()) throw NotFoundException("예산 기간을 찾을 수 없습니다.")
        val selected = periodStart?.let { requested -> periods.firstOrNull { it.startDate == requested } }
            ?: periods.firstOrNull { !LocalDate.now(clock).isBefore(it.startDate) && !LocalDate.now(clock).isAfter(it.endDate) }
            ?: periods.first()
        requireReadablePeriod(userId, ledgerId, selected.startDate)
        val transactions = visibleTransactions(userId, ledgerId, selected).filter { transaction ->
            when (scope) {
                AnalyticsScope.ALL -> true
                AnalyticsScope.SHARED -> transaction.scopeType == BudgetScopeType.SHARED
                AnalyticsScope.MINE -> transaction.scopeType == BudgetScopeType.PERSONAL && transaction.scopeOwnerUserId == userId
            }
        }
        val expenses = transactions.filter(::isBudgetExpense)
        var cumulative = 0L
        val daily = expenses.groupBy { it.transactionDate }.toSortedMap().map { (date, items) ->
            val amount = items.sumOf { it.amount }
            cumulative += amount
            DailyCumulativeResponse(date, amount, cumulative)
        }
        val trend = periods.take(12).reversed().map { period ->
            val amount = visibleTransactions(userId, ledgerId, period).filter(::isBudgetExpense).sumOf { it.amount }
            PeriodTrendResponse(period.startDate, period.endDate, amount)
        }
        val previousAmount = trend.dropLast(1).lastOrNull()?.expenseAmount
        val total = expenses.sumOf { it.amount }
        return AnalyticsResponse(
            periodStart = selected.startDate,
            periodEnd = selected.endDate,
            scope = scope,
            totalExpenseAmount = total,
            previousPeriodExpenseAmount = previousAmount,
            changeAmount = previousAmount?.let { total - it },
            categoryDistribution = categorySpending(expenses),
            dailyFlow = daily,
            trend = trend,
        )
    }

    private fun requireReadablePeriod(userId: Long, ledgerId: Long, startDate: LocalDate): BudgetPeriod {
        ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("장부를 찾을 수 없습니다.")
        val period = periodRepository.findByLedgerIdAndStartDate(ledgerId, startDate)
            ?: throw NotFoundException("예산 기간을 찾을 수 없습니다.")
        val zone = clock.zone
        val canRead = memberRepository.findByUserId(userId).filter { it.ledger.id == ledgerId }.any { member ->
            val joined = member.joinedAt.atZone(zone).toLocalDate()
            val left = member.leftAt?.atZone(zone)?.toLocalDate()
            joined <= period.endDate && (left == null || left >= period.startDate)
        }
        if (!canRead) throw ForbiddenException("이 예산 기간을 조회할 수 없습니다.")
        return period
    }

    private fun visibleTransactions(userId: Long, ledgerId: Long, period: BudgetPeriod): List<Transaction> =
        transactionRepository.findByLedgerIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(
            ledgerId, period.startDate, period.endDate,
        ).filter { transaction ->
            transaction.scopeType == BudgetScopeType.SHARED || transaction.scopeOwnerUserId == userId
        }

    private fun categorySpending(transactions: List<Transaction>): List<V1CategorySpendingResponse> = transactions
        .filter(::isBudgetExpense)
        .groupBy { (it.categoryGroupCode ?: "UNCLASSIFIED") to (it.categoryGroupName ?: "미분류") }
        .map { (group, items) -> V1CategorySpendingResponse(group.first, group.second, items.sumOf { it.amount }) }
        .sortedByDescending { it.amount }

    private fun isBudgetExpense(transaction: Transaction): Boolean = try {
        TransactionPolicy.aggregationEffect(transaction.type.asLedgerTransactionType(), transaction.transferType) == TransactionAggregationEffect.EXPENSE
    } catch (_: IllegalArgumentException) {
        false
    }

    private fun CategoryType.asLedgerTransactionType() = when (this) {
        CategoryType.EXPENSE -> LedgerTransactionType.EXPENSE
        CategoryType.INCOME -> LedgerTransactionType.INCOME
        CategoryType.TRANSFER -> LedgerTransactionType.TRANSFER
    }
}
