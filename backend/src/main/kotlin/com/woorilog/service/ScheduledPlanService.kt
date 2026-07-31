package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
import com.woorilog.exception.WoorilogException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

@Service
@Transactional
class ScheduledPlanService(
    private val ledgerRepository: LedgerRepository, private val memberRepository: LedgerMemberRepository,
    private val userRepository: UserRepository, private val categoryRepository: LedgerCategoryRepository,
    private val periodRepository: BudgetPeriodRepository, private val allocationRepository: BudgetAllocationRepository,
    private val planRepository: ScheduledPlanRepository, private val occurrenceRepository: ScheduledOccurrenceRepository,
    private val transactionRepository: TransactionRepository, private val clock: Clock,
) {
    fun createRecurring(userId: Long, ledgerId: Long, request: RecurringPlanRequest): ScheduledPlanResponse {
        requireActive(userId, ledgerId); require(request.amount > 0 && request.name.isNotBlank()) { "금액과 이름은 필수입니다." }
        val category = category(userId, ledgerId, request.categoryId)
        val allocation = allocation(userId, ledgerId, request.startDate, request.budgetSource)
        val creator = userRepository.findById(userId).orElseThrow { ForbiddenException("사용자를 찾을 수 없습니다.") }
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
                occurrence.generatedTransactionId?.let { transactionRepository.findById(it).orElse(null) }
            }
        return ScheduledPlanResponse.from(plan, firstTransaction)
    }
    fun createInstallment(userId: Long, ledgerId: Long, request: InstallmentPlanRequest): ScheduledPlanResponse {
        return createInstallmentAndGenerateFirst(userId, ledgerId, request).plan
    }

    fun createInstallmentAndGenerateFirst(
        userId: Long,
        ledgerId: Long,
        request: InstallmentPlanRequest,
    ): ScheduledPlanCreationResult {
        require(request.months in 2..60 && request.totalPrincipal > 0 && request.monthlyInterest >= 0) { "할부 입력값이 올바르지 않습니다." }
        requireActive(userId, ledgerId); val category = category(userId, ledgerId, request.categoryId); val allocation = allocation(userId, ledgerId, request.firstDueDate, request.budgetSource)
        val creator = userRepository.findById(userId).orElseThrow { ForbiddenException("사용자를 찾을 수 없습니다.") }
        val plan = planRepository.save(ScheduledPlan(ledgerRepository.getReferenceById(ledgerId), creator, allocation, ScheduledPlanType.INSTALLMENT,
            request.totalPrincipal, request.firstDueDate, request.firstDueDate, null, frequency = ScheduleFrequency.MONTHLY, name = request.name,
            merchant = request.merchant, memo = request.memo, category = category, scopeType = request.budgetSource.type, scopeOwnerUserId = request.budgetSource.ownerUserId,
            paymentMethodType = request.paymentMethod?.type, paymentMethodDisplayName = request.paymentMethod?.displayName, anchorDay = request.firstDueDate.dayOfMonth,
            installmentTotalCount = request.months, totalPrincipalAmount = request.totalPrincipal, monthlyInterestAmount = request.monthlyInterest))
        val occurrences = generateOccurrences(plan)
        val first = occurrences.firstOrNull() ?: error("할부 첫 발생분을 만들 수 없습니다.")
        generate(first)
        val transaction = first.generatedTransactionId?.let { transactionRepository.findById(it).orElse(null) }
            ?: error("할부 첫 거래를 만들 수 없습니다.")
        return ScheduledPlanCreationResult(ScheduledPlanResponse.from(plan), transaction)
    }
    @Transactional(readOnly = true)
    fun list(userId: Long, ledgerId: Long, status: ScheduledPlanStatus? = null, kind: ScheduledPlanType? = null, fixedExpense: Boolean? = null): List<ScheduledPlanResponse> {
        requireActive(userId, ledgerId)
        return planRepository.findByLedgerIdOrderByIdDesc(ledgerId).asSequence()
            .filter { status == null || it.status == status }
            .filter { kind == null || it.type == kind }
            .filter { fixedExpense == null || it.fixedExpense == fixedExpense }
            .map(ScheduledPlanResponse::from)
            .toList()
    }
    fun pause(userId: Long, planId: Long, reason: ScheduledPauseReason = ScheduledPauseReason.USER_REQUEST): ScheduledPlanResponse { val plan = plan(planId); requirePlanWrite(userId, plan); plan.status = ScheduledPlanStatus.PAUSED; plan.pauseReason = reason; return ScheduledPlanResponse.from(plan) }
    fun resume(userId: Long, planId: Long, nextDueDate: LocalDate): ScheduledPlanResponse { val plan = plan(planId); requirePlanWrite(userId, plan); if (nextDueDate.isBefore(LocalDate.now(clock))) throw WoorilogException("INVALID_NEXT_DUE_DATE", "다음 실행일은 오늘 이전일 수 없습니다.", HttpStatus.BAD_REQUEST); plan.status = ScheduledPlanStatus.ACTIVE; plan.pauseReason = null; plan.nextDueDate = nextDueDate; return ScheduledPlanResponse.from(plan) }
    fun delete(userId: Long, planId: Long) { val plan = plan(planId); requirePlanWrite(userId, plan); plan.status = ScheduledPlanStatus.CANCELLED; occurrenceRepository.findByPlanIdAndStatus(planId, ScheduledOccurrenceStatus.SCHEDULED).forEach { it.status = ScheduledOccurrenceStatus.CANCELLED } }
    fun updateFuture(userId: Long, planId: Long, request: UpdateScheduledPlanRequest): ScheduledPlanResponse { val plan = plan(planId); requirePlanWrite(userId, plan); require(request.scope == "FUTURE") { "FUTURE만 지원합니다." }; request.amount?.let { require(it > 0); plan.amount = it }; request.nextDueDate?.let { plan.nextDueDate = it }; request.endDate?.let { plan.endDate = it }; request.fixedExpense?.let { plan.fixedExpense = it }; request.name?.let { plan.name = it.trim() }; return ScheduledPlanResponse.from(plan) }
    @Transactional(readOnly = true) fun fixedExpenses(userId: Long, ledgerId: Long): List<ScheduledPlanResponse> { requireActive(userId, ledgerId); return planRepository.findByLedgerIdAndFixedExpenseTrueAndStatus(ledgerId, ScheduledPlanStatus.ACTIVE).map(ScheduledPlanResponse::from) }
    fun pauseForMembershipChange(ledgerId: Long) { planRepository.findByLedgerIdOrderByIdDesc(ledgerId).filter { it.status == ScheduledPlanStatus.ACTIVE }.forEach { it.status = ScheduledPlanStatus.PAUSED; it.pauseReason = ScheduledPauseReason.MEMBERSHIP_CHANGED } }
    fun generateDue(asOf: LocalDate): Int = occurrenceRepository.lockDue(asOf).filter { it.plan.status == ScheduledPlanStatus.ACTIVE }.count { generate(it) }
    private fun generateOccurrences(plan: ScheduledPlan): List<ScheduledOccurrence> {
        var due = plan.startDate
        val count = plan.installmentTotalCount ?: 12
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
    private fun plan(id: Long) = planRepository.findById(id).orElseThrow { NotFoundException("예약 계획을 찾을 수 없습니다.") }
    private fun requireActive(userId: Long, ledgerId: Long) { if (memberRepository.findByLedgerIdAndUserId(ledgerId, userId) == null) throw ForbiddenException("장부 접근 권한이 없습니다.") }
    private fun requirePlanWrite(userId: Long, plan: ScheduledPlan) { requireActive(userId, plan.ledger.id!!); if (plan.scopeType == BudgetScopeType.PERSONAL && plan.scopeOwnerUserId != userId) throw ForbiddenException("본인 개인 예산의 예약 계획만 변경할 수 있습니다.") }
    private fun category(userId: Long, ledgerId: Long, id: Long): LedgerCategory { requireActive(userId, ledgerId); return categoryRepository.findById(id).filter { it.ledger.id == ledgerId && it.active && it.type == CategoryType.EXPENSE }.orElseThrow { WoorilogException("INVALID_CATEGORY", "지출 카테고리가 필요합니다.", HttpStatus.BAD_REQUEST) } }
    private fun allocation(userId: Long, ledgerId: Long, date: LocalDate, source: BudgetSource): BudgetAllocation { val period = periodRepository.findFirstByLedgerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(ledgerId, date, date) ?: throw WoorilogException("BUDGET_PERIOD_NOT_FOUND", "예산 기간을 찾을 수 없습니다.", HttpStatus.CONFLICT); if (source.type == BudgetScopeType.PERSONAL && source.ownerUserId != userId) throw ForbiddenException("본인 예산만 사용할 수 있습니다."); return allocationRepository.findByBudgetPeriodIdAndScopeAndOwnerId(period.id!!, BudgetAllocationScope.valueOf(source.type.name), source.ownerUserId) ?: throw WoorilogException("BUDGET_ALLOCATION_NOT_FOUND", "차감 예산을 찾을 수 없습니다.", HttpStatus.CONFLICT) }
}
data class RecurringPlanRequest(val name: String, val amount: Long, val merchant: String?, val memo: String?, val categoryId: Long, val budgetSource: BudgetSource, val frequency: ScheduleFrequency, val startDate: LocalDate, val endDate: LocalDate?, val fixedExpense: Boolean, val paymentMethod: V1PaymentMethod?)
data class InstallmentPlanRequest(val name: String, val totalPrincipal: Long, val months: Int, val monthlyInterest: Long, val merchant: String?, val memo: String?, val categoryId: Long, val budgetSource: BudgetSource, val firstDueDate: LocalDate, val paymentMethod: V1PaymentMethod?)
data class UpdateScheduledPlanRequest(val scope: String, val name: String?, val amount: Long?, val nextDueDate: LocalDate?, val endDate: LocalDate?, val fixedExpense: Boolean?)
data class ScheduledPlanResponse(
    val id: Long,
    val type: ScheduledPlanType,
    val name: String,
    val amount: Long,
    val frequency: ScheduleFrequency?,
    val status: ScheduledPlanStatus,
    val nextDueDate: LocalDate,
    val isFixedExpense: Boolean,
    val firstTransaction: TransactionResponse? = null,
) {
    companion object {
        fun from(plan: ScheduledPlan, transaction: Transaction? = null) = ScheduledPlanResponse(
            plan.id!!, plan.type, plan.name, plan.amount, plan.frequency, plan.status,
            plan.nextDueDate, plan.fixedExpense, transaction?.toResponse(),
        )
    }
}
data class ScheduledPlanCreationResult(val plan: ScheduledPlanResponse, val firstTransaction: Transaction)
