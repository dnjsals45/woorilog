package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
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
        val allocation = allocationRepository.findById(allocationId).orElseThrow { NotFoundException("예산 할당을 찾을 수 없습니다.") }
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
            transactions = transactions.map { it.toResponse() },
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
        ledgerRepository.findById(ledgerId).orElseThrow { NotFoundException("장부를 찾을 수 없습니다.") }
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

enum class AnalyticsScope { ALL, SHARED, MINE }
data class V1CategorySpendingResponse(val groupCode: String, val groupName: String, val amount: Long)
data class BudgetPeriodSummaryResponse(val period: BudgetPeriodDetailResponse, val categorySpending: List<V1CategorySpendingResponse>, val unclassifiedCount: Int, val nextPeriodScheduledAmount: Long)
data class DailySpendingResponse(val date: LocalDate, val amount: Long)
data class AllocationDetailResponse(val allocationId: Long, val source: BudgetSourceResponse, val amount: Long, val spentAmount: Long, val currentBalance: Long, val scheduledAmount: Long, val availableAmount: Long, val categorySpending: List<V1CategorySpendingResponse>, val dailySpending: List<DailySpendingResponse>, val transactions: List<TransactionResponse>, val nextCursor: String?)
data class DailyCumulativeResponse(val date: LocalDate, val amount: Long, val cumulativeAmount: Long)
data class PeriodTrendResponse(val startDate: LocalDate, val endDate: LocalDate, val expenseAmount: Long)
data class AnalyticsResponse(val periodStart: LocalDate, val periodEnd: LocalDate, val scope: AnalyticsScope, val totalExpenseAmount: Long, val previousPeriodExpenseAmount: Long?, val changeAmount: Long?, val categoryDistribution: List<V1CategorySpendingResponse>, val dailyFlow: List<DailyCumulativeResponse>, val trend: List<PeriodTrendResponse>)
