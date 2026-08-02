package com.woorilog.application.scheduled.service

import com.woorilog.domain.auth.repository.UserRepository
import com.woorilog.domain.budget.entity.BudgetAllocation
import com.woorilog.domain.budget.entity.BudgetAllocationScope
import com.woorilog.domain.budget.repository.BudgetAllocationRepository
import com.woorilog.domain.budget.repository.BudgetPeriodRepository
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.category.entity.LedgerCategory
import com.woorilog.domain.category.repository.LedgerCategoryRepository
import com.woorilog.domain.ledger.repository.LedgerMemberRepository
import com.woorilog.domain.ledger.repository.LedgerRepository
import com.woorilog.domain.scheduled.entity.ScheduledOccurrence
import com.woorilog.domain.scheduled.entity.ScheduledOccurrenceStatus
import com.woorilog.domain.scheduled.entity.ScheduledPauseReason
import com.woorilog.domain.scheduled.entity.ScheduledPlan
import com.woorilog.domain.scheduled.entity.ScheduledPlanStatus
import com.woorilog.domain.scheduled.entity.ScheduledPlanType
import com.woorilog.domain.scheduled.policy.ScheduleFrequency
import com.woorilog.domain.scheduled.repository.ScheduledOccurrenceRepository
import com.woorilog.domain.scheduled.repository.ScheduledPlanRepository
import com.woorilog.domain.transaction.entity.PaymentMethod
import com.woorilog.domain.transaction.entity.Transaction
import com.woorilog.domain.transaction.entity.TransactionScheduleKind
import com.woorilog.domain.transaction.policy.BudgetScopeType
import com.woorilog.domain.transaction.repository.TransactionRepository
import com.woorilog.domain.scheduled.policy.InstallmentPolicy
import com.woorilog.domain.scheduled.policy.ScheduleDatePolicy
import com.woorilog.domain.transaction.entity.BudgetSource
import com.woorilog.application.scheduled.command.InstallmentPlanCommand
import com.woorilog.application.scheduled.command.RecurringPlanCommand
import com.woorilog.application.scheduled.command.UpdateScheduledPlanCommand
import com.woorilog.application.scheduled.result.ScheduledPlanCreationResult
import com.woorilog.application.scheduled.result.ScheduledPlanResult
import com.woorilog.common.exception.ForbiddenException
import com.woorilog.common.exception.NotFoundException
import com.woorilog.common.exception.WoorilogException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

/** 반복 지출은 회차 수가 정해져 있지 않아 이만큼의 발생분을 미리 만들어 둔다. */
private const val DEFAULT_RECURRING_OCCURRENCES = 12

@Service
@Transactional
class ScheduledPlanService(
    private val ledgerRepository: LedgerRepository, private val memberRepository: LedgerMemberRepository,
    private val userRepository: UserRepository, private val categoryRepository: LedgerCategoryRepository,
    private val periodRepository: BudgetPeriodRepository, private val allocationRepository: BudgetAllocationRepository,
    private val planRepository: ScheduledPlanRepository, private val occurrenceRepository: ScheduledOccurrenceRepository,
    private val transactionRepository: TransactionRepository, private val clock: Clock,
) {
    fun createRecurring(userId: Long, ledgerId: Long, request: RecurringPlanCommand): ScheduledPlanResult {
        requireActive(userId, ledgerId); require(request.amount > 0 && request.name.isNotBlank()) { "금액과 이름은 필수입니다." }
        val category = category(userId, ledgerId, request.categoryId)
        val allocation = allocation(userId, ledgerId, request.startDate, request.budgetSource)
        val creator = userRepository.findByIdOrNull(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다.")
        val plan = planRepository.save(ScheduledPlan(ledgerRepository.getReferenceById(ledgerId), creator, allocation, ScheduledPlanType.RECURRING_EXPENSE,
            request.amount, request.startDate, request.startDate, request.endDate, fixedExpense = request.fixedExpense, frequency = request.frequency,
            name = request.name.trim(), merchant = request.merchant?.trim(), memo = request.memo, category = category, scopeType = request.budgetSource.type,
            scopeOwnerUserId = request.budgetSource.ownerUserId, paymentMethodType = request.paymentMethod?.type, paymentMethodDisplayName = request.paymentMethod?.displayName,
            anchorDay = request.startDate.dayOfMonth))
        val occurrences = generateOccurrences(plan)
        val firstTransaction = occurrences.firstOrNull()
            ?.takeIf { !it.dueDate.isAfter(LocalDate.now(clock)) }
            ?.let { occurrence ->
                generate(occurrence)
                occurrence.generatedTransactionId?.let { transactionRepository.findByIdOrNull(it) }
            }
        return toResult(plan, firstTransaction)
    }
    fun createInstallment(userId: Long, ledgerId: Long, request: InstallmentPlanCommand): ScheduledPlanResult {
        return createInstallmentAndGenerateFirst(userId, ledgerId, request).plan
    }

    fun createInstallmentAndGenerateFirst(
        userId: Long,
        ledgerId: Long,
        request: InstallmentPlanCommand,
    ): ScheduledPlanCreationResult {
        require(request.months in 2..60 && request.totalPrincipal > 0 && request.monthlyInterest >= 0) { "할부 입력값이 올바르지 않습니다." }
        requireActive(userId, ledgerId); val category = category(userId, ledgerId, request.categoryId); val allocation = allocation(userId, ledgerId, request.firstDueDate, request.budgetSource)
        val creator = userRepository.findByIdOrNull(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다.")
        val plan = planRepository.save(ScheduledPlan(ledgerRepository.getReferenceById(ledgerId), creator, allocation, ScheduledPlanType.INSTALLMENT,
            request.totalPrincipal, request.firstDueDate, request.firstDueDate, null, frequency = ScheduleFrequency.MONTHLY, name = request.name,
            merchant = request.merchant, memo = request.memo, category = category, scopeType = request.budgetSource.type, scopeOwnerUserId = request.budgetSource.ownerUserId,
            paymentMethodType = request.paymentMethod?.type, paymentMethodDisplayName = request.paymentMethod?.displayName, anchorDay = request.firstDueDate.dayOfMonth,
            installmentTotalCount = request.months, totalPrincipalAmount = request.totalPrincipal, monthlyInterestAmount = request.monthlyInterest))
        val occurrences = generateOccurrences(plan)
        val first = occurrences.firstOrNull() ?: error("할부 첫 발생분을 만들 수 없습니다.")
        generate(first)
        val transaction = first.generatedTransactionId?.let { transactionRepository.findByIdOrNull(it) }
            ?: error("할부 첫 거래를 만들 수 없습니다.")
        return ScheduledPlanCreationResult(toResult(plan), transaction)
    }
    @Transactional(readOnly = true)
    fun list(userId: Long, ledgerId: Long, status: ScheduledPlanStatus? = null, kind: ScheduledPlanType? = null, fixedExpense: Boolean? = null): List<ScheduledPlanResult> {
        requireActive(userId, ledgerId)
        return planRepository.findByLedgerIdOrderByIdDesc(ledgerId).asSequence()
            .filter { status == null || it.status == status }
            .filter { kind == null || it.type == kind }
            .filter { fixedExpense == null || it.fixedExpense == fixedExpense }
            .map { toResult(it) }
            .toList()
    }
    fun pause(userId: Long, planId: Long, reason: ScheduledPauseReason = ScheduledPauseReason.USER_REQUEST): ScheduledPlanResult { val plan = plan(planId); requirePlanWrite(userId, plan); plan.status = ScheduledPlanStatus.PAUSED; plan.pauseReason = reason; return toResult(plan) }
    fun resume(userId: Long, planId: Long, nextDueDate: LocalDate): ScheduledPlanResult { val plan = plan(planId); requirePlanWrite(userId, plan); if (nextDueDate.isBefore(LocalDate.now(clock))) throw WoorilogException("INVALID_NEXT_DUE_DATE", "다음 실행일은 오늘 이전일 수 없습니다.", HttpStatus.BAD_REQUEST); plan.status = ScheduledPlanStatus.ACTIVE; plan.pauseReason = null; plan.nextDueDate = nextDueDate; return toResult(plan) }
    fun delete(userId: Long, planId: Long) { val plan = plan(planId); requirePlanWrite(userId, plan); plan.status = ScheduledPlanStatus.CANCELLED; occurrenceRepository.findByPlanIdAndStatus(planId, ScheduledOccurrenceStatus.SCHEDULED).forEach { it.status = ScheduledOccurrenceStatus.CANCELLED } }
    fun updateFuture(userId: Long, planId: Long, request: UpdateScheduledPlanCommand): ScheduledPlanResult {
        val plan = plan(planId); requirePlanWrite(userId, plan); require(request.scope == "FUTURE") { "FUTURE만 지원합니다." }
        request.amount?.let { require(it > 0); plan.amount = it }
        request.nextDueDate?.let { plan.nextDueDate = it }
        request.endDate?.let { plan.endDate = it }
        request.isFixedExpense?.let { plan.fixedExpense = it }
        request.name?.let { plan.name = it.trim() }
        request.frequency?.let { plan.frequency = it }
        request.categoryId?.let { plan.category = category(userId, plan.ledger.id!!, it) }
        request.budgetSource?.let { source ->
            plan.budgetAllocation = allocation(userId, plan.ledger.id!!, plan.nextDueDate, source)
            plan.scopeType = source.type
            plan.scopeOwnerUserId = source.ownerUserId
        }
        regenerateScheduledOccurrences(plan, request.nextDueDate)
        return toResult(plan)
    }

    /* generate() 는 plan 이 아니라 occurrence 의 amount·dueDate 로 거래를 만든다.
     * 그래서 plan 의 금액·주기·종료일을 바꾸면 아직 생성되지 않은 발생분을 다시 만들어야
     * 변경이 실제 거래에 반영된다. 이미 거래가 만들어진 GENERATED 발생분은 건드리지 않는다. */
    private fun regenerateScheduledOccurrences(plan: ScheduledPlan, explicitNextDueDate: LocalDate?) {
        val all = occurrenceRepository.findByPlanIdOrderBySequence(plan.id!!)
        val stale = all.filter { it.status == ScheduledOccurrenceStatus.SCHEDULED }
        if (stale.isEmpty()) return
        val kept = all.filter { it.status != ScheduledOccurrenceStatus.SCHEDULED }
        occurrenceRepository.deleteAll(stale)

        val total = plan.installmentTotalCount ?: DEFAULT_RECURRING_OCCURRENCES
        val frequency = plan.frequency ?: ScheduleFrequency.MONTHLY
        /* 이어붙일 지점: 요청이 다음 예정일을 명시했으면 그 날짜, 아니면 마지막으로 생성된
         * 발생분의 다음 날짜. 생성분이 없으면 플랜 시작일부터. */
        var due = explicitNextDueDate
            ?: kept.maxByOrNull { it.sequence }
                ?.let { ScheduleDatePolicy.nextDate(it.dueDate, frequency, plan.anchorDay) }
            ?: plan.startDate
        val rebuilt = buildList {
            ((kept.size + 1)..total).forEach { sequence ->
                if (plan.endDate == null || !due.isAfter(plan.endDate)) {
                    add(occurrenceRepository.save(ScheduledOccurrence(plan, due, sequence, occurrenceAmount(plan, sequence))))
                }
                due = ScheduleDatePolicy.nextDate(due, frequency, plan.anchorDay)
            }
        }
        rebuilt.firstOrNull()?.let { plan.nextDueDate = it.dueDate }
    }
    @Transactional(readOnly = true) fun fixedExpenses(userId: Long, ledgerId: Long): List<ScheduledPlanResult> { requireActive(userId, ledgerId); return planRepository.findByLedgerIdAndFixedExpenseTrueAndStatus(ledgerId, ScheduledPlanStatus.ACTIVE).map { toResult(it) } }
    private fun toResult(plan: ScheduledPlan, transaction: Transaction? = null) = ScheduledPlanResult.from(
        plan, transaction,
        if (plan.type == ScheduledPlanType.INSTALLMENT) occurrenceRepository.countByPlanIdAndStatus(plan.id!!, ScheduledOccurrenceStatus.GENERATED).toInt() else null,
    )
    fun pauseForMembershipChange(ledgerId: Long) { planRepository.findByLedgerIdOrderByIdDesc(ledgerId).filter { it.status == ScheduledPlanStatus.ACTIVE }.forEach { it.status = ScheduledPlanStatus.PAUSED; it.pauseReason = ScheduledPauseReason.MEMBERSHIP_CHANGED } }
    fun generateDue(asOf: LocalDate): Int = occurrenceRepository.lockDue(asOf).filter { it.plan.status == ScheduledPlanStatus.ACTIVE }.count { generate(it) }
    private fun generateOccurrences(plan: ScheduledPlan): List<ScheduledOccurrence> {
        var due = plan.startDate
        val count = plan.installmentTotalCount ?: DEFAULT_RECURRING_OCCURRENCES
        return buildList {
            repeat(count) { index ->
                if (plan.endDate == null || !due.isAfter(plan.endDate)) {
                    add(occurrenceRepository.save(ScheduledOccurrence(plan, due, index + 1, occurrenceAmount(plan, index + 1))))
                }
                due = ScheduleDatePolicy.nextDate(due, plan.frequency ?: ScheduleFrequency.MONTHLY, plan.anchorDay)
            }
        }
    }
    private fun generate(occurrence: ScheduledOccurrence): Boolean {
        if (occurrence.status != ScheduledOccurrenceStatus.SCHEDULED) return false
        val plan = occurrence.plan
        val category = plan.category
        val period = periodRepository.findFirstByLedgerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            plan.ledger.id!!,
            occurrence.dueDate,
            occurrence.dueDate,
        ) ?: throw WoorilogException("BUDGET_PERIOD_NOT_FOUND", "예약 실행일의 예산 기간을 찾을 수 없습니다.", HttpStatus.CONFLICT)
        val allocation = allocationRepository.findByBudgetPeriodIdAndScopeAndOwnerId(
            period.id!!,
            BudgetAllocationScope.valueOf(plan.scopeType!!.name),
            plan.scopeOwnerUserId,
        ) ?: throw WoorilogException("BUDGET_ALLOCATION_NOT_FOUND", "예약 실행일의 차감 예산을 찾을 수 없습니다.", HttpStatus.CONFLICT)
        val transaction = transactionRepository.save(
            Transaction(
                plan.ledger, category, plan.createdBy, CategoryType.EXPENSE, occurrence.amount,
                occurrence.dueDate, plan.memo, plan.paymentMethodType ?: PaymentMethod.CASH,
                recorder = plan.createdBy, budgetAllocation = allocation, merchant = plan.merchant,
                scopeType = plan.scopeType, scopeOwnerUserId = plan.scopeOwnerUserId,
                sharedWithPartner = if (plan.scopeType == BudgetScopeType.PERSONAL) false else null,
                lastModifiedBy = plan.createdBy, categoryGroupCode = category?.categoryGroup?.code,
                categoryGroupName = category?.categoryGroup?.name, categoryName = category?.name,
                paymentMethodType = plan.paymentMethodType,
                paymentMethodDisplayName = plan.paymentMethodDisplayName, scheduledPlan = plan,
                scheduleKind = if (plan.type == ScheduledPlanType.INSTALLMENT) TransactionScheduleKind.INSTALLMENT else TransactionScheduleKind.RECURRING_EXPENSE,
                installmentPlanId = plan.id.toString(), installmentSequence = occurrence.sequence,
                installmentTotalCount = plan.installmentTotalCount ?: 1,
            )
        )
        occurrence.generatedTransactionId = transaction.id
        occurrence.status = ScheduledOccurrenceStatus.GENERATED
        plan.nextDueDate = occurrenceRepository.findByPlanIdOrderBySequence(plan.id!!)
            .firstOrNull { it.status == ScheduledOccurrenceStatus.SCHEDULED && it.sequence > occurrence.sequence }
            ?.dueDate ?: occurrence.dueDate
        return true
    }
    private fun occurrenceAmount(plan: ScheduledPlan, sequence: Int) = if (plan.type == ScheduledPlanType.INSTALLMENT) InstallmentPolicy.amountForSequence(plan.totalPrincipalAmount!!, plan.installmentTotalCount!!, sequence, plan.monthlyInterestAmount) else plan.amount
    private fun plan(id: Long) = planRepository.findByIdOrNull(id) ?: throw NotFoundException("예약 계획을 찾을 수 없습니다.")
    private fun requireActive(userId: Long, ledgerId: Long) { if (memberRepository.findByLedgerIdAndUserId(ledgerId, userId) == null) throw ForbiddenException("장부 접근 권한이 없습니다.") }
    private fun requirePlanWrite(userId: Long, plan: ScheduledPlan) { requireActive(userId, plan.ledger.id!!); if (plan.scopeType == BudgetScopeType.PERSONAL && plan.scopeOwnerUserId != userId) throw ForbiddenException("본인 개인 예산의 예약 계획만 변경할 수 있습니다.") }
    private fun category(userId: Long, ledgerId: Long, id: Long): LedgerCategory { requireActive(userId, ledgerId); return categoryRepository.findByIdOrNull(id)?.takeIf { it.ledger.id == ledgerId && it.active && it.type == CategoryType.EXPENSE } ?: throw WoorilogException("INVALID_CATEGORY", "지출 카테고리가 필요합니다.", HttpStatus.BAD_REQUEST) }
    private fun allocation(userId: Long, ledgerId: Long, date: LocalDate, source: BudgetSource): BudgetAllocation { val period = periodRepository.findFirstByLedgerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(ledgerId, date, date) ?: throw WoorilogException("BUDGET_PERIOD_NOT_FOUND", "예산 기간을 찾을 수 없습니다.", HttpStatus.CONFLICT); if (source.type == BudgetScopeType.PERSONAL && source.ownerUserId != userId) throw ForbiddenException("본인 예산만 사용할 수 있습니다."); return allocationRepository.findByBudgetPeriodIdAndScopeAndOwnerId(period.id!!, BudgetAllocationScope.valueOf(source.type.name), source.ownerUserId) ?: throw WoorilogException("BUDGET_ALLOCATION_NOT_FOUND", "차감 예산을 찾을 수 없습니다.", HttpStatus.CONFLICT) }
}
