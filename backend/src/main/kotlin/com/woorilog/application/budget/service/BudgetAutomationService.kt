package com.woorilog.application.budget.service

import com.woorilog.domain.budget.entity.AllocationCategoryBudget
import com.woorilog.domain.budget.entity.BudgetAllocation
import com.woorilog.domain.budget.entity.BudgetAllocationScope
import com.woorilog.domain.budget.entity.BudgetPeriod
import com.woorilog.domain.budget.entity.BudgetThresholdLevel
import com.woorilog.domain.budget.entity.BudgetThresholdState
import com.woorilog.domain.budget.entity.WeeklyBudgetGuide
import com.woorilog.domain.budget.policy.BudgetCyclePolicy
import com.woorilog.domain.budget.repository.AllocationCategoryBudgetRepository
import com.woorilog.domain.budget.repository.BudgetAllocationRepository
import com.woorilog.domain.budget.repository.BudgetPeriodRepository
import com.woorilog.domain.budget.repository.BudgetThresholdStateRepository
import com.woorilog.domain.budget.repository.WeeklyBudgetGuideRepository
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.ledger.entity.Ledger
import com.woorilog.domain.ledger.repository.LedgerMemberRepository
import com.woorilog.domain.ledger.repository.LedgerRepository
import com.woorilog.domain.notification.entity.NotificationType
import com.woorilog.domain.notification.repository.NotificationPreferenceRepository
import com.woorilog.domain.transaction.entity.Transaction
import com.woorilog.domain.transaction.policy.TransferType
import com.woorilog.domain.transaction.repository.TransactionRepository
import com.woorilog.application.notification.service.NotificationService
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZonedDateTime
import java.time.temporal.ChronoUnit

@Service
@Transactional
class BudgetAutomationService(
    private val ledgerRepository: LedgerRepository,
    private val memberRepository: LedgerMemberRepository,
    private val periodRepository: BudgetPeriodRepository,
    private val allocationRepository: BudgetAllocationRepository,
    private val categoryBudgetRepository: AllocationCategoryBudgetRepository,
    private val transactionRepository: TransactionRepository,
    private val thresholdStateRepository: BudgetThresholdStateRepository,
    private val weeklyGuideRepository: WeeklyBudgetGuideRepository,
    private val preferenceRepository: NotificationPreferenceRepository,
    private val notificationService: NotificationService,
    private val clock: Clock,
) {
    fun evaluatePeriod(periodId: Long) {
        val period = periodRepository.findByIdOrNull(periodId) ?: return
        val today = LocalDate.now(clock)
        val current = !today.isBefore(period.startDate) && !today.isAfter(period.endDate)
        allocationRepository.findByBudgetPeriodIdOrderById(period.id!!).forEach { allocation ->
            val transactions = transactionRepository.findByBudgetAllocationIdAndTransactionDateBetween(
                allocation.id!!, period.startDate, period.endDate,
            ).filter(::isBudgetExpense)
            updateThreshold(
                stateKey = "allocation:${allocation.id}",
                period = period,
                allocation = allocation,
                groupCode = null,
                spent = transactions.sumOf { it.amount },
                budget = allocation.amount,
                current = current,
            )
            categoryBudgetRepository.findByBudgetAllocationId(allocation.id!!).forEach { categoryBudget ->
                updateThreshold(
                    stateKey = "category:${categoryBudget.id}",
                    period = period,
                    allocation = allocation,
                    groupCode = categoryBudget.categoryGroupCode,
                    spent = transactions.filter { it.categoryGroupCode == categoryBudget.categoryGroupCode }.sumOf { it.amount },
                    budget = categoryBudget.amount,
                    current = current,
                )
            }
        }
    }

    @Scheduled(fixedDelayString = "\${app.budget-automation.threshold-delay-ms:300000}")
    fun evaluateCurrentThresholds() {
        val today = LocalDate.now(clock)
        periodRepository.findAll().filter { today in it.startDate..it.endDate }.forEach { evaluatePeriod(it.id!!) }
    }

    @Scheduled(cron = "0 10 0 * * *", zone = "Asia/Seoul")
    fun prepareBudgetPeriods() {
        val today = LocalDate.now(clock)
        ledgerRepository.findAll().filter { !it.archived }.forEach { ledger ->
            val policy = BudgetCyclePolicy(ledger.budgetStartType, ledger.budgetStartDay)
            val currentDates = policy.periodContaining(today)
            val previous = periodRepository.findByLedgerIdOrderByStartDateDesc(ledger.id!!)
                .firstOrNull { it.startDate < currentDates.startDate }
            val current = periodRepository.findByLedgerIdAndStartDate(ledger.id!!, currentDates.startDate)
                ?: copyOrCreatePeriod(ledger, currentDates.startDate, currentDates.endDate, previous)
            val nextDates = policy.periodContaining(currentDates.endDate.plusDays(1))
            val next = periodRepository.findByLedgerIdAndStartDate(ledger.id!!, nextDates.startDate)
            if (ChronoUnit.DAYS.between(today, nextDates.startDate) in 0..3 && next?.preparedAt == null) {
                memberRepository.findByLedgerIdAndLeftAtIsNullOrderById(ledger.id!!).forEach { member ->
                    notificationService.notifyUser(
                        member.user.id!!, NotificationType.BUDGET_PERIOD_PREPARATION,
                        "다음 예산 기간을 준비해주세요", "다음 기간의 전체·개인·공동 예산을 확인해 주세요.",
                        "/budgets?period=${nextDates.startDate}", "period-prepare-${ledger.id}-${nextDates.startDate}-${member.user.id}",
                        ledger.id, nextDates.startDate,
                    )
                }
            }
        }
    }

    @Scheduled(cron = "0 0 * * * *")
    fun createWeeklyGuides() {
        memberRepository.findAll().filter { it.leftAt == null }.forEach { member ->
            val now = ZonedDateTime.now(clock).withZoneSameInstant(java.time.ZoneId.of(member.user.timezone))
            if (now.dayOfWeek != DayOfWeek.SUNDAY || now.hour < 21) return@forEach
            val today = now.toLocalDate()
            val period = periodRepository.findFirstByLedgerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                member.ledger.id!!, today, today,
            ) ?: return@forEach
            val nextWeekStart = today.plusDays(1)
            if (weeklyGuideRepository.existsByUserIdAndLedgerIdAndWeekStartDateAndBudgetPeriodId(member.user.id!!, member.ledger.id!!, nextWeekStart, period.id!!)) return@forEach
            val preference = preferenceRepository.findByUserId(member.user.id!!)
            if (preference?.weeklyGuideEnabled == false) return@forEach
            val allocations = allocationRepository.findByBudgetPeriodIdOrderById(period.id!!).filter {
                it.scope == BudgetAllocationScope.SHARED || it.owner?.id == member.user.id
            }
            val budget = allocations.sumOf { it.amount }
            if (budget <= 0) return@forEach
            val periodDays = ChronoUnit.DAYS.between(period.startDate, period.endDate).toInt() + 1
            val overlapStart = maxOf(nextWeekStart, period.startDate)
            val overlapEnd = minOf(nextWeekStart.plusDays(6), period.endDate)
            val overlapDays = if (overlapEnd < overlapStart) 0 else ChronoUnit.DAYS.between(overlapStart, overlapEnd).toInt() + 1
            val base = budget * overlapDays / periodDays
            val elapsedDays = ChronoUnit.DAYS.between(period.startDate, minOf(today, period.endDate)).toInt() + 1
            val expectedToDate = budget * elapsedDays / periodDays
            val spent = allocations.sumOf { allocation ->
                transactionRepository.findByBudgetAllocationIdAndTransactionDateBetween(allocation.id!!, period.startDate, minOf(today, period.endDate))
                    .filter(::isBudgetExpense).sumOf { it.amount }
            }
            val overage = maxOf(0, spent - expectedToDate)
            val recommendation = maxOf(0, base - overage)
            weeklyGuideRepository.save(WeeklyBudgetGuide(member.user, member.ledger, period, nextWeekStart, recommendation, maxOf(0, overage - base)))
            notificationService.notifyUser(
                member.user.id!!, NotificationType.WEEKLY_GUIDE, "다음 주 예산 가이드가 준비됐어요",
                "다음 주 권장 사용액은 ${recommendation}원입니다.", "/dashboard", "weekly-guide-${member.user.id}-${member.ledger.id}-$nextWeekStart",
                member.ledger.id, period.startDate,
            )
        }
    }

    private fun updateThreshold(stateKey: String, period: BudgetPeriod, allocation: BudgetAllocation, groupCode: String?, spent: Long, budget: Long, current: Boolean) {
        val next = when {
            budget <= 0 || spent * 100 < budget * 80 -> BudgetThresholdLevel.BELOW_80
            spent < budget -> BudgetThresholdLevel.AT_LEAST_80
            else -> BudgetThresholdLevel.AT_LEAST_100
        }
        val state = thresholdStateRepository.findByStateKey(stateKey)
            ?: BudgetThresholdState(stateKey, period, allocation, groupCode, BudgetThresholdLevel.BELOW_80)
        val enteredHigherLevel = next.ordinal > state.level.ordinal
        state.level = next
        if (enteredHigherLevel) state.notificationSequence += 1
        thresholdStateRepository.save(state)
        if (!current || !enteredHigherLevel || next == BudgetThresholdLevel.BELOW_80) return
        val recipients = if (allocation.scope == BudgetAllocationScope.PERSONAL) listOfNotNull(allocation.owner) else
            memberRepository.findByLedgerIdAndLeftAtIsNullOrderById(period.ledger.id!!).map { it.user }
        recipients.forEach { user ->
            if (next == BudgetThresholdLevel.AT_LEAST_80 && preferenceRepository.findByUserId(user.id!!)?.budgetWarning80Enabled == false) return@forEach
            val type = if (next == BudgetThresholdLevel.AT_LEAST_100) NotificationType.BUDGET_THRESHOLD_100 else NotificationType.BUDGET_THRESHOLD_80
            notificationService.notifyUser(
                user.id!!, type,
                if (next == BudgetThresholdLevel.AT_LEAST_100) "예산을 모두 사용했어요" else "예산을 80% 사용했어요",
                "남은 사용 가능액을 확인해 보세요.", "/budgets?period=${period.startDate}",
                "threshold-$stateKey-${next.name}-${state.notificationSequence}", period.ledger.id, period.startDate,
            )
        }
    }

    private fun copyOrCreatePeriod(ledger: Ledger, startDate: LocalDate, endDate: LocalDate, source: BudgetPeriod?): BudgetPeriod {
        val saved = periodRepository.save(
            BudgetPeriod(
                ledger,
                startDate,
                endDate,
                source?.totalBudgetAmount ?: ledger.defaultTotalBudgetAmount,
                preparedAt = source?.let { clock.instant() },
                sourcePeriod = source,
            )
        )
        source?.let {
            allocationRepository.findByBudgetPeriodIdOrderById(it.id!!).forEach { old ->
                val copied = allocationRepository.save(BudgetAllocation(saved, old.scope, old.owner, old.amount))
                categoryBudgetRepository.findByBudgetAllocationId(old.id!!).forEach { category ->
                    categoryBudgetRepository.save(AllocationCategoryBudget(copied, category.categoryGroupCode, category.amount))
                }
            }
        }
        return saved
    }

    private fun isBudgetExpense(transaction: Transaction): Boolean = when {
        transaction.type == CategoryType.EXPENSE -> true
        transaction.type == CategoryType.TRANSFER && transaction.transferType == TransferType.OUTBOUND -> true
        else -> false
    }
}
