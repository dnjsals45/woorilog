package com.woorilog.application.analytics.service

import com.woorilog.domain.auth.repository.UserRepository
import com.woorilog.domain.budget.entity.BudgetAllocation
import com.woorilog.domain.budget.entity.BudgetAllocationScope
import com.woorilog.domain.budget.repository.BudgetAllocationRepository
import com.woorilog.domain.budget.repository.BudgetPeriodRepository
import com.woorilog.domain.budget.repository.WeeklyBudgetGuideRepository
import com.woorilog.domain.card.repository.CardRepository
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.ledger.entity.LedgerType
import com.woorilog.domain.ledger.repository.LedgerMemberRepository
import com.woorilog.domain.ledger.repository.LedgerMonthRepository
import com.woorilog.domain.ledger.repository.LedgerRepository
import com.woorilog.domain.scheduled.entity.RecurringFrequency
import com.woorilog.domain.scheduled.entity.RecurringTransactionTemplate
import com.woorilog.domain.scheduled.entity.ScheduledOccurrence
import com.woorilog.domain.scheduled.entity.ScheduledOccurrenceStatus
import com.woorilog.domain.scheduled.repository.RecurringTransactionGenerationRepository
import com.woorilog.domain.scheduled.repository.RecurringTransactionTemplateRepository
import com.woorilog.domain.scheduled.repository.ScheduledOccurrenceRepository
import com.woorilog.domain.transaction.entity.PaymentMethod
import com.woorilog.domain.transaction.entity.Transaction
import com.woorilog.domain.transaction.policy.BudgetScopeType
import com.woorilog.domain.transaction.policy.TransferType
import com.woorilog.domain.transaction.repository.TransactionRepository
import com.woorilog.application.auth.service.AuthService
import com.woorilog.application.auth.result.LedgerDto
import com.woorilog.application.transaction.result.TransactionResult
import com.woorilog.application.transaction.result.toResult
import com.woorilog.application.budget.result.UserSummaryResponse
import com.woorilog.application.ledger.result.LedgerSummaryResult
import com.woorilog.application.ledger.result.BudgetCycleResult
import com.woorilog.application.analytics.result.CardPaymentSummaryResult
import com.woorilog.application.analytics.result.CategorySpendingResult
import com.woorilog.application.analytics.result.DashboardBudgetResult
import com.woorilog.application.analytics.result.DashboardPeriodResult
import com.woorilog.application.analytics.result.DashboardSummaryResult
import com.woorilog.application.analytics.result.MemberSpendingResult
import com.woorilog.application.analytics.result.MonthlyStatisticsResult
import com.woorilog.application.analytics.result.WeeklyGuideResult
import com.woorilog.common.exception.ForbiddenException
import com.woorilog.common.exception.NotFoundException
import com.woorilog.common.exception.WoorilogException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate
import java.time.YearMonth

@Service
@Transactional(readOnly = true)
class DashboardService(
    private val userRepository: UserRepository,
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val cardRepository: CardRepository,
    private val ledgerMonthRepository: LedgerMonthRepository,
    private val transactionRepository: TransactionRepository,
    private val recurringTransactionTemplateRepository: RecurringTransactionTemplateRepository,
    private val recurringTransactionGenerationRepository: RecurringTransactionGenerationRepository,
    private val budgetPeriodRepository: BudgetPeriodRepository,
    private val budgetAllocationRepository: BudgetAllocationRepository,
    private val scheduledOccurrenceRepository: ScheduledOccurrenceRepository,
    private val weeklyBudgetGuideRepository: WeeklyBudgetGuideRepository,
    private val authService: AuthService,
    private val clock: Clock
) {

    fun getCurrentDashboardSummary(userId: Long, budgetMonth: String? = null, requestedLedgerId: Long? = null, periodStart: LocalDate? = null): DashboardSummaryResult {
        val user = userRepository.findByIdOrNull(userId) ?: throw NotFoundException("사용자를 찾을 수 없습니다.")
        val currentLedger = requestedLedgerId?.let { ledgerRepository.findByIdOrNull(it) ?: throw NotFoundException("장부를 찾을 수 없습니다.") }
            ?: authService.resolveCurrentLedger(user)
        val ledgerId = currentLedger.id!!
        if (ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId) == null) throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        val currentYearMonth = budgetMonth?.let(::validateBudgetMonth) ?: YearMonth.now(clock)
        val budgetMonthStr = currentYearMonth.toString()

        val ledgerMonth = ledgerMonthRepository.findByLedgerIdAndBudgetMonth(ledgerId, budgetMonthStr)
        val totalBudgetAmount = ledgerMonth?.totalBudgetAmount ?: 0L

        // Fetch transactions for the current month
        val startDate = currentYearMonth.atDay(1)
        val endDate = currentYearMonth.atEndOfMonth()
        val currentMonthTxs = transactionRepository.findByLedgerIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(
            ledgerId, startDate, endDate
        )

        // Sum EXPENSE only
        val totalExpenseAmount = currentMonthTxs.filter { it.type == CategoryType.EXPENSE }
            .sumOf { it.amount }
        val scheduledRecurringExpenseAmount = scheduledRecurringExpenseAmount(ledgerId, currentYearMonth)
        val remainingBudgetAmount = totalBudgetAmount - totalExpenseAmount - scheduledRecurringExpenseAmount

        // Recent transactions: up to 5
        val recentTransactions = currentMonthTxs.take(5).map { it.toResult() }

        val categorySpending = categoryGroupSpending(currentMonthTxs)

        // Member spending: sum EXPENSE for all members
        val members = ledgerMemberRepository.findByLedgerId(ledgerId)
        val memberSpending = members.map { mem ->
            val spent = currentMonthTxs.filter { it.payer.id == mem.user.id && it.type == CategoryType.EXPENSE }
                .sumOf { it.amount }
            MemberSpendingResult(
                userId = mem.user.id!!,
                nickname = mem.user.nickname,
                totalSpent = spent
            )
        }
        val cardPaymentSummaries = nextCardPaymentSummaries(ledgerId)

        val targetPeriod = periodStart?.let { budgetPeriodRepository.findByLedgerIdAndStartDate(ledgerId, it) }
            ?: budgetPeriodRepository.findFirstByLedgerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(ledgerId, LocalDate.now(clock), LocalDate.now(clock))
        val allocations = targetPeriod?.let { budgetAllocationRepository.findByBudgetPeriodIdOrderById(it.id!!) } ?: emptyList()
        val targetTransactions = targetPeriod?.let { period ->
            transactionRepository.findByLedgerIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(ledgerId, period.startDate, period.endDate)
        } ?: emptyList()
        val visibleTargetTransactions = targetTransactions.filter { it.scopeType == BudgetScopeType.SHARED || it.payer.id == userId }
        val myAllocation = allocations.firstOrNull { it.scope == BudgetAllocationScope.PERSONAL && it.owner?.id == userId }
        val sharedAllocation = allocations.firstOrNull { it.scope == BudgetAllocationScope.SHARED }
        val targetScheduled = targetPeriod?.let { period ->
            scheduledOccurrenceRepository.findByLedgerAndDueDateBetweenAndStatus(
                ledgerId, period.startDate, period.endDate, ScheduledOccurrenceStatus.SCHEDULED,
            )
        } ?: emptyList()
        val targetIncome = visibleTargetTransactions.filter { it.type == CategoryType.INCOME || (it.type == CategoryType.TRANSFER && it.transferType == TransferType.INBOUND) }.sumOf { it.amount }
        val activeMembers = ledgerMemberRepository.findByLedgerIdAndLeftAtIsNullOrderById(ledgerId)
        val emptyState = when {
            currentLedger.type == LedgerType.GROUP && activeMembers.size < 2 -> "INVITE_PARTNER"
            targetPeriod == null || targetPeriod.preparedAt == null -> "ALLOCATE_BUDGET"
            visibleTargetTransactions.isEmpty() -> "ADD_FIRST_TRANSACTION"
            else -> "READY"
        }
        return DashboardSummaryResult(
            currentLedger = LedgerDto.from(currentLedger),
            budgetMonth = budgetMonthStr,
            totalBudgetAmount = totalBudgetAmount,
            totalExpenseAmount = totalExpenseAmount,
            scheduledRecurringExpenseAmount = scheduledRecurringExpenseAmount,
            remainingBudgetAmount = remainingBudgetAmount,
            recentTransactions = if (targetPeriod != null) visibleTargetTransactions.take(5).map { it.toResult() } else recentTransactions,
            categorySpending = categorySpending,
            memberSpending = memberSpending,
            cardPaymentSummaries = cardPaymentSummaries,
            ledger = LedgerSummaryResult(
                id = ledgerId, name = currentLedger.name, type = if (currentLedger.type == LedgerType.GROUP) "SHARED" else "PERSONAL",
                role = activeMembers.firstOrNull { it.user.id == userId }?.role?.name ?: "MEMBER", accessState = if (activeMembers.any { it.user.id == userId }) "ACTIVE" else "FORMER",
                partner = activeMembers.firstOrNull { it.user.id != userId }?.user?.let { UserSummaryResponse(it.id!!, it.nickname) },
                budgetCycle = BudgetCycleResult(currentLedger.budgetStartType.name, currentLedger.budgetStartDay),
            ),
            period = targetPeriod?.let { DashboardPeriodResult(it.id!!, it.startDate, it.endDate, it.totalBudgetAmount) },
            sharedBudget = sharedAllocation?.toDashboardBudget(targetTransactions, targetScheduled),
            myBudget = myAllocation?.toDashboardBudget(targetTransactions, targetScheduled),
            incomeAmount = targetIncome,
            weeklyGuide = weeklyBudgetGuideRepository.findFirstByUserIdAndLedgerIdOrderByWeekStartDateDesc(userId, ledgerId)
                ?.let { WeeklyGuideResult(it.weekStartDate, it.recommendedAmount, it.remainingOverageAmount) },
            emptyState = emptyState,
        )
    }

    fun getMonthlyStatistics(
        userId: Long,
        ledgerId: Long,
        fromMonth: String,
        toMonth: String
    ): List<MonthlyStatisticsResult> {
        val ledger = ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("장부를 찾을 수 없습니다.")
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        val fromYearMonth = validateBudgetMonth(fromMonth)
        val toYearMonth = validateBudgetMonth(toMonth)

        if (fromYearMonth > toYearMonth) {
            throw WoorilogException("INVALID_REQUEST", "시작 월은 종료 월보다 이전이어야 합니다.", HttpStatus.BAD_REQUEST)
        }

        val months = mutableListOf<YearMonth>()
        var current = fromYearMonth
        while (!current.isAfter(toYearMonth)) {
            months.add(current)
            current = current.plusMonths(1)
        }

        return months.map { ym ->
            val startDate = ym.atDay(1)
            val endDate = ym.atEndOfMonth()
            val txs = transactionRepository.findByLedgerIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(
                ledgerId, startDate, endDate
            )

            val totalExpense = txs.filter { it.type == CategoryType.EXPENSE }.sumOf { it.amount }
            val totalIncome = txs.filter { it.type == CategoryType.INCOME }.sumOf { it.amount }

            val ledgerMonth = ledgerMonthRepository.findByLedgerIdAndBudgetMonth(ledgerId, ym.toString())
            val totalBudget = ledgerMonth?.totalBudgetAmount ?: 0L

            MonthlyStatisticsResult(
                month = ym.toString(),
                totalBudgetAmount = totalBudget,
                totalExpenseAmount = totalExpense,
                totalIncomeAmount = totalIncome,
                categorySpending = categoryGroupSpending(txs)
            )
        }
    }

    private fun categoryGroupSpending(transactions: List<Transaction>): List<CategorySpendingResult> = transactions
        .filter { it.type == CategoryType.EXPENSE }
        .groupBy { transaction ->
            val group = transaction.category?.categoryGroup
            (group?.id ?: 0L) to (group?.name ?: "미분류")
        }
        .map { (group, groupedTransactions) ->
            CategorySpendingResult(
                categoryGroupId = group.first,
                name = group.second,
                totalSpent = groupedTransactions.sumOf { it.amount },
            )
        }
        .sortedByDescending { it.totalSpent }

    private fun scheduledRecurringExpenseAmount(ledgerId: Long, budgetMonth: YearMonth): Long {
        val startDate = budgetMonth.atDay(1)
        val endDate = budgetMonth.atEndOfMonth()

        return recurringTransactionTemplateRepository.findByLedgerIdAndPausedFalse(ledgerId)
            .asSequence()
            .filter { it.type == CategoryType.EXPENSE }
            .sumOf { template ->
                scheduledOccurrencesInMonth(template, startDate, endDate)
                    .filterNot { occurrence ->
                        recurringTransactionGenerationRepository.existsByTemplateIdAndGeneratedDate(template.id!!, occurrence)
                    }
                    .sumOf { template.amount }
            }
    }

    private fun scheduledOccurrencesInMonth(
        template: RecurringTransactionTemplate,
        monthStart: LocalDate,
        monthEnd: LocalDate,
    ): Sequence<LocalDate> = sequence {
        var occurrence = template.nextDueDate
        while (occurrence.isBefore(monthStart)) {
            occurrence = nextRecurringOccurrence(occurrence, template.frequency)
        }

        while (!occurrence.isAfter(monthEnd) && (template.endDate == null || !occurrence.isAfter(template.endDate))) {
            yield(occurrence)
            occurrence = nextRecurringOccurrence(occurrence, template.frequency)
        }
    }

    private fun nextRecurringOccurrence(date: LocalDate, frequency: RecurringFrequency): LocalDate = when (frequency) {
        RecurringFrequency.WEEKLY -> date.plusWeeks(1)
        RecurringFrequency.MONTHLY -> date.plusMonths(1)
    }

    private fun nextCardPaymentSummaries(ledgerId: Long): List<CardPaymentSummaryResult> {
        val today = LocalDate.now(clock)
        return cardRepository.findByLedgerIdOrderByNameAsc(ledgerId).map { card ->
            val upcomingClosingDate = nextClosingDate(today, card.statementClosingDay)
            val previousClosingDate = closingDate(upcomingClosingDate.minusMonths(1), card.statementClosingDay)
            val totalAmount = transactionRepository
                .findByLedgerIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(
                    ledgerId,
                    previousClosingDate.plusDays(1),
                    upcomingClosingDate,
                )
                .filter { it.type == CategoryType.EXPENSE && it.paymentMethod == PaymentMethod.CARD && it.card?.id == card.id }
                .sumOf { it.amount }
            CardPaymentSummaryResult(
                cardId = card.id!!,
                cardName = card.name,
                statementClosingDate = upcomingClosingDate,
                expectedPaymentMonth = YearMonth.from(upcomingClosingDate).plusMonths(1).toString(),
                totalAmount = totalAmount,
            )
        }
    }

    private fun nextClosingDate(today: LocalDate, closingDay: Int): LocalDate {
        val thisMonthClosing = closingDate(today, closingDay)
        return if (thisMonthClosing.isBefore(today)) closingDate(today.plusMonths(1), closingDay) else thisMonthClosing
    }

    private fun closingDate(referenceDate: LocalDate, closingDay: Int): LocalDate {
        val month = YearMonth.from(referenceDate)
        return month.atDay(minOf(closingDay, month.lengthOfMonth()))
    }

    private fun validateBudgetMonth(budgetMonth: String): YearMonth {
        if (!budgetMonth.matches(Regex("^\\d{4}-\\d{2}$"))) {
            throw WoorilogException("INVALID_REQUEST", "올바르지 않은 예산 월 형식입니다. (YYYY-MM)", HttpStatus.BAD_REQUEST)
        }
        return try {
            YearMonth.parse(budgetMonth)
        } catch (e: Exception) {
            throw WoorilogException("INVALID_REQUEST", "올바르지 않은 예산 월 형식입니다. (YYYY-MM)", HttpStatus.BAD_REQUEST)
        }
    }
}

private fun BudgetAllocation.toDashboardBudget(transactions: List<Transaction>, occurrences: List<ScheduledOccurrence>): DashboardBudgetResult {
    val spent = transactions.filter { it.budgetAllocation?.id == id && isDashboardExpense(it) }.sumOf { it.amount }
    val scheduled = occurrences.filter { it.plan.scopeType?.name == scope.name && it.plan.scopeOwnerUserId == owner?.id }.sumOf { it.amount }
    return DashboardBudgetResult(id!!, amount, spent, amount - spent, amount - spent - scheduled)
}
private fun isDashboardExpense(transaction: Transaction): Boolean = transaction.type == CategoryType.EXPENSE ||
    (transaction.type == CategoryType.TRANSFER && transaction.transferType == TransferType.OUTBOUND)
