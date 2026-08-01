package com.woorilog.application.budget.service

import com.woorilog.domain.auth.entity.User
import com.woorilog.domain.auth.repository.UserRepository
import com.woorilog.domain.budget.entity.AllocationCategoryBudget
import com.woorilog.domain.budget.entity.BudgetAllocation
import com.woorilog.domain.budget.entity.BudgetAllocationScope
import com.woorilog.domain.budget.entity.BudgetPeriod
import com.woorilog.domain.budget.entity.ReserveTransfer
import com.woorilog.domain.budget.policy.BudgetAllocationIncreaseApprovalRequired
import com.woorilog.domain.budget.policy.BudgetCyclePolicy
import com.woorilog.domain.budget.repository.AllocationCategoryBudgetRepository
import com.woorilog.domain.budget.repository.BudgetAllocationRepository
import com.woorilog.domain.budget.repository.BudgetPeriodRepository
import com.woorilog.domain.budget.repository.ReserveTransferRepository
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.category.repository.LedgerCategoryGroupRepository
import com.woorilog.domain.ledger.entity.Ledger
import com.woorilog.domain.ledger.entity.LedgerType
import com.woorilog.domain.ledger.repository.LedgerMemberRepository
import com.woorilog.domain.ledger.repository.LedgerRepository
import com.woorilog.domain.scheduled.entity.ScheduledOccurrenceStatus
import com.woorilog.domain.scheduled.repository.ScheduledOccurrenceRepository
import com.woorilog.domain.transaction.entity.Transaction
import com.woorilog.domain.transaction.policy.LedgerTransactionType
import com.woorilog.domain.transaction.policy.TransactionAggregationEffect
import com.woorilog.domain.transaction.repository.TransactionRepository
import com.woorilog.domain.budget.policy.BudgetAllocationPolicy
import com.woorilog.domain.transaction.policy.TransactionPolicy
import com.woorilog.application.budget.command.CategoryBudgetInput
import com.woorilog.application.budget.command.ConfigureBudgetPeriodCommand
import com.woorilog.application.budget.command.PersonalAllocationInput
import com.woorilog.application.budget.result.BudgetAllocationResponse
import com.woorilog.application.budget.result.BudgetPeriodDetailResponse
import com.woorilog.application.budget.result.BudgetPeriodListResponse
import com.woorilog.application.budget.result.BudgetSourceResponse
import com.woorilog.application.budget.result.CategoryBudgetResponse
import com.woorilog.application.budget.result.ReserveTransferListResponse
import com.woorilog.application.budget.result.ReserveTransferResponse
import com.woorilog.application.budget.result.ReserveTransferResultResponse
import com.woorilog.application.budget.result.UserSummaryResponse
import com.woorilog.common.exception.ForbiddenException
import com.woorilog.common.exception.NotFoundException
import com.woorilog.common.exception.WoorilogException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Instant
import java.time.LocalDate

@Service
@Transactional(readOnly = true)
class BudgetPeriodService(
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val userRepository: UserRepository,
    private val budgetPeriodRepository: BudgetPeriodRepository,
    private val budgetAllocationRepository: BudgetAllocationRepository,
    private val reserveTransferRepository: ReserveTransferRepository,
    private val allocationCategoryBudgetRepository: AllocationCategoryBudgetRepository,
    private val ledgerCategoryGroupRepository: LedgerCategoryGroupRepository,
    private val transactionRepository: TransactionRepository,
    private val scheduledOccurrenceRepository: ScheduledOccurrenceRepository,
    private val clock: Clock,
) {
    @Transactional
    fun getCurrent(userId: Long, ledgerId: Long, at: LocalDate?): BudgetPeriodDetailResponse {
        val ledger = requireActiveLedger(userId, ledgerId)
        val date = at ?: LocalDate.now(clock)
        val period = budgetPeriodRepository
            .findFirstByLedgerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(ledgerId, date, date)
            ?: createPeriodForDate(ledger, date)
        return toDetail(period, date, userId)
    }

    fun get(userId: Long, ledgerId: Long, startDate: LocalDate): BudgetPeriodDetailResponse {
        requireLedgerReader(userId, ledgerId)
        val period = findPeriod(ledgerId, startDate)
        return toDetail(period, LocalDate.now(clock), userId)
    }

    fun list(userId: Long, ledgerId: Long): BudgetPeriodListResponse {
        requireLedgerReader(userId, ledgerId)
        val today = LocalDate.now(clock)
        return BudgetPeriodListResponse(
            items = budgetPeriodRepository.findByLedgerIdOrderByStartDateDesc(ledgerId).map { toDetail(it, today, userId) },
            nextCursor = null,
        )
    }

    @Transactional
    fun configure(
        userId: Long,
        ledgerId: Long,
        startDate: LocalDate,
        request: ConfigureBudgetPeriodCommand,
    ): BudgetPeriodDetailResponse {
        val ledger = requireActiveLedger(userId, ledgerId)
        require(startDate >= cycle(ledger).periodContaining(LocalDate.now(clock)).startDate) {
            "Past budget periods cannot be reconfigured through this endpoint."
        }
        val expected = cycle(ledger).periodContaining(startDate)
        if (expected.startDate != startDate) {
            throw WoorilogException(
                "INVALID_BUDGET_PERIOD_START",
                "장부의 예산 기간 시작일과 일치하지 않습니다.",
                HttpStatus.BAD_REQUEST,
            )
        }

        val members = ledgerMemberRepository.findByLedgerIdAndLeftAtIsNullOrderById(ledgerId)
        val activeUserIds = members.mapTo(mutableSetOf()) { it.user.id!! }
        if (request.personalAllocations.any { it.userId !in activeUserIds || it.amount < 0 }) {
            throw WoorilogException("INVALID_BUDGET_ALLOCATION", "활성 멤버의 개인 예산만 설정할 수 있습니다.", HttpStatus.BAD_REQUEST)
        }
        if (request.personalAllocations.map { it.userId }.distinct().size != request.personalAllocations.size) {
            throw WoorilogException("INVALID_BUDGET_ALLOCATION", "개인 예산 사용자가 중복되었습니다.", HttpStatus.BAD_REQUEST)
        }
        if (request.sharedAllocation < 0) {
            throw WoorilogException("INVALID_BUDGET_ALLOCATION", "공동 예산은 0원 이상이어야 합니다.", HttpStatus.BAD_REQUEST)
        }

        val categoryTotals = request.categoryBudgets.groupBy { it.source }
            .mapValues { (_, budgets) -> budgets.sumOf { it.amount } }
        if (request.categoryBudgets.any { input ->
                input.amount < 0 ||
                    ledgerCategoryGroupRepository.findByLedgerIdAndCode(ledgerId, input.groupCode) == null ||
                    (input.source.type == "PERSONAL" && input.source.ownerUserId != userId)
            }
        ) {
            throw WoorilogException("INVALID_CATEGORY_BUDGET", "설정할 수 없는 대분류 예산입니다.", HttpStatus.BAD_REQUEST)
        }
        val resolvedPersonalInputs = request.personalAllocations.map { input ->
            val categoryTotal = categoryTotals[BudgetSourceResponse("PERSONAL", input.userId)] ?: 0
            if (categoryTotal > input.amount && !request.increaseTotalBudgetIfNeeded) {
                throw WoorilogException(
                    "TOTAL_BUDGET_INCREASE_CONFIRMATION_REQUIRED",
                    "대분류 예산 합계에 맞춰 상위 예산을 늘릴지 확인해주세요.",
                    HttpStatus.CONFLICT,
                )
            }
            input.copy(amount = maxOf(input.amount, categoryTotal))
        }
        val sharedCategoryTotal = categoryTotals[BudgetSourceResponse("SHARED", null)] ?: 0
        if (sharedCategoryTotal > request.sharedAllocation && !request.increaseTotalBudgetIfNeeded) {
            throw WoorilogException(
                "TOTAL_BUDGET_INCREASE_CONFIRMATION_REQUIRED",
                "대분류 예산 합계에 맞춰 공동 예산을 늘릴지 확인해주세요.",
                HttpStatus.CONFLICT,
            )
        }
        val resolvedSharedAmount = maxOf(request.sharedAllocation, sharedCategoryTotal)

        val requestedAmounts = resolvedPersonalInputs.map { it.amount } +
            if (ledger.type == LedgerType.GROUP) listOf(resolvedSharedAmount) else emptyList()
        val decision = try {
            BudgetAllocationPolicy.decide(
                totalBudget = request.totalBudget,
                allocationAmounts = requestedAmounts,
                approveTotalIncrease = request.increaseTotalBudgetIfNeeded,
            )
        } catch (error: BudgetAllocationIncreaseApprovalRequired) {
            throw WoorilogException(
                "TOTAL_BUDGET_INCREASE_CONFIRMATION_REQUIRED",
                "배분 합계에 맞춰 전체 예산을 늘릴지 확인해주세요.",
                HttpStatus.CONFLICT,
            )
        }

        val period = budgetPeriodRepository.findByLedgerIdAndStartDate(ledgerId, startDate)
            ?: BudgetPeriod(
                ledger = ledger,
                startDate = expected.startDate,
                endDate = expected.endDate,
                totalBudgetAmount = decision.totalBudget,
            )
        period.totalBudgetAmount = decision.totalBudget
        period.preparedAt = clock.instant()
        val savedPeriod = budgetPeriodRepository.save(period)

        val existing = budgetAllocationRepository.findByBudgetPeriodIdOrderById(savedPeriod.id!!)
        resolvedPersonalInputs.forEach { input ->
            val owner = userRepository.findByIdOrNull(input.userId) ?: throw NotFoundException("사용자를 찾을 수 없습니다.")
            val allocation = existing.firstOrNull {
                it.scope == BudgetAllocationScope.PERSONAL && it.owner?.id == input.userId
            } ?: BudgetAllocation(savedPeriod, BudgetAllocationScope.PERSONAL, owner, input.amount)
            allocation.amount = input.amount
            budgetAllocationRepository.save(allocation)
        }
        existing.filter { it.scope == BudgetAllocationScope.PERSONAL && it.owner?.id !in resolvedPersonalInputs.map { item -> item.userId } }
            .forEach { it.amount = 0 }

        if (ledger.type == LedgerType.GROUP) {
            val shared = existing.firstOrNull { it.scope == BudgetAllocationScope.SHARED }
                ?: BudgetAllocation(savedPeriod, BudgetAllocationScope.SHARED, null, resolvedSharedAmount)
            shared.amount = resolvedSharedAmount
            budgetAllocationRepository.save(shared)
        }
        val savedAllocations = budgetAllocationRepository.findByBudgetPeriodIdOrderById(savedPeriod.id!!)
        savedAllocations.filter { it.scope == BudgetAllocationScope.SHARED || it.owner?.id == userId }.forEach { allocation ->
            allocationCategoryBudgetRepository.deleteAllInBatch(
                allocationCategoryBudgetRepository.findByBudgetAllocationId(allocation.id!!)
            )
        }
        request.categoryBudgets.forEach { input ->
            val allocation = savedAllocations.firstOrNull {
                it.scope.name == input.source.type && it.owner?.id == input.source.ownerUserId
            } ?: throw WoorilogException("INVALID_CATEGORY_BUDGET", "대분류 예산의 상위 예산을 찾을 수 없습니다.", HttpStatus.BAD_REQUEST)
            allocationCategoryBudgetRepository.save(
                AllocationCategoryBudget(allocation, input.groupCode, input.amount)
            )
        }
        if (request.applyToFutureDefaults) {
            ledger.defaultTotalBudgetAmount = decision.totalBudget
            ledgerRepository.save(ledger)
        }

        return toDetail(savedPeriod, LocalDate.now(clock), userId)
    }

    @Transactional
    fun copy(
        userId: Long,
        ledgerId: Long,
        targetStartDate: LocalDate,
        sourceStartDate: LocalDate,
    ): BudgetPeriodDetailResponse {
        val ledger = requireActiveLedger(userId, ledgerId)
        if (targetStartDate <= LocalDate.now(clock)) {
            throw WoorilogException("INVALID_REQUEST", "미래 예산 기간만 복사할 수 있습니다.", HttpStatus.BAD_REQUEST)
        }
        val existingTarget = budgetPeriodRepository.findByLedgerIdAndStartDate(ledgerId, targetStartDate)
        if (existingTarget?.preparedAt != null) {
            throw WoorilogException(
                "BUDGET_PERIOD_ALREADY_PREPARED",
                "이미 설정된 예산 기간입니다.",
                HttpStatus.CONFLICT,
            )
        }
        val source = findPeriod(ledgerId, sourceStartDate)
        val expected = cycle(ledger).periodContaining(targetStartDate)
        if (expected.startDate != targetStartDate) {
            throw WoorilogException("INVALID_BUDGET_PERIOD_START", "예산 기간 시작일이 올바르지 않습니다.", HttpStatus.BAD_REQUEST)
        }
        val target = existingTarget ?: BudgetPeriod(
            ledger = ledger,
            startDate = expected.startDate,
            endDate = expected.endDate,
            totalBudgetAmount = source.totalBudgetAmount,
        )
        target.totalBudgetAmount = source.totalBudgetAmount
        target.preparedAt = clock.instant()
        target.sourcePeriod = source
        val savedTarget = budgetPeriodRepository.save(target)
        budgetAllocationRepository.findByBudgetPeriodIdOrderById(source.id!!).forEach { sourceAllocation ->
            val targetAllocation = budgetAllocationRepository.save(
                BudgetAllocation(
                    budgetPeriod = savedTarget,
                    scope = sourceAllocation.scope,
                    owner = sourceAllocation.owner,
                    amount = sourceAllocation.amount,
                )
            )
            allocationCategoryBudgetRepository.findByBudgetAllocationId(sourceAllocation.id!!).forEach { categoryBudget ->
                allocationCategoryBudgetRepository.save(
                    AllocationCategoryBudget(targetAllocation, categoryBudget.categoryGroupCode, categoryBudget.amount)
                )
            }
        }
        return toDetail(savedTarget, LocalDate.now(clock), userId)
    }

    @Transactional
    fun transferReserve(
        userId: Long,
        ledgerId: Long,
        startDate: LocalDate,
        amount: Long,
        targetType: String,
        targetOwnerUserId: Long?,
    ): ReserveTransferResultResponse {
        require(amount > 0) { "Reserve transfer amount must be positive." }
        requireActiveLedger(userId, ledgerId)
        val period = findPeriod(ledgerId, startDate)
        val allocations = budgetAllocationRepository.findByBudgetPeriodIdOrderById(period.id!!)
        val reserve = period.totalBudgetAmount - allocations.sumOf { it.amount }
        if (amount > reserve) {
            throw WoorilogException("INSUFFICIENT_RESERVE", "예비비가 부족합니다.", HttpStatus.CONFLICT)
        }
        val targetAllocation = allocations.firstOrNull {
            when (targetType) {
                "SHARED" -> it.scope == BudgetAllocationScope.SHARED && targetOwnerUserId == null
                "PERSONAL" -> it.scope == BudgetAllocationScope.PERSONAL &&
                    it.owner?.id == userId && targetOwnerUserId == userId
                else -> false
            }
        } ?: throw ForbiddenException("본인 개인 예산 또는 공동 예산으로만 옮길 수 있습니다.")
        val actor = userRepository.findByIdOrNull(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다.")
        targetAllocation.amount = Math.addExact(targetAllocation.amount, amount)
        budgetAllocationRepository.save(targetAllocation)
        val transfer = reserveTransferRepository.save(
            ReserveTransfer(period, targetAllocation, actor, amount)
        )
        return ReserveTransferResultResponse(
            transfer = toTransfer(transfer),
            period = toDetail(period, LocalDate.now(clock), userId),
        )
    }

    fun listReserveTransfers(userId: Long, ledgerId: Long, startDate: LocalDate): ReserveTransferListResponse {
        requireLedgerReader(userId, ledgerId)
        val period = findPeriod(ledgerId, startDate)
        return ReserveTransferListResponse(
            items = reserveTransferRepository.findByBudgetPeriodIdOrderByCreatedAt(period.id!!).map(::toTransfer)
        )
    }

    @Transactional
    fun createInitialPeriod(ledger: Ledger, totalBudget: Long, owner: User, preparePersonal: Boolean): BudgetPeriod {
        val dates = cycle(ledger).periodContaining(LocalDate.now(clock))
        val period = budgetPeriodRepository.findByLedgerIdAndStartDate(ledger.id!!, dates.startDate)
            ?: budgetPeriodRepository.save(
                BudgetPeriod(
                    ledger = ledger,
                    startDate = dates.startDate,
                    endDate = dates.endDate,
                    totalBudgetAmount = totalBudget,
                    preparedAt = if (preparePersonal) clock.instant() else null,
                )
            )
        if (preparePersonal && budgetAllocationRepository.findByBudgetPeriodIdOrderById(period.id!!).isEmpty()) {
            budgetAllocationRepository.save(
                BudgetAllocation(period, BudgetAllocationScope.PERSONAL, owner, totalBudget)
            )
        }
        return period
    }

    private fun createPeriodForDate(ledger: Ledger, date: LocalDate): BudgetPeriod {
        val dates = cycle(ledger).periodContaining(date)
        val period = budgetPeriodRepository.save(
            BudgetPeriod(
                ledger = ledger,
                startDate = dates.startDate,
                endDate = dates.endDate,
                totalBudgetAmount = ledger.defaultTotalBudgetAmount,
                preparedAt = if (ledger.type == LedgerType.PERSONAL) clock.instant() else null,
            )
        )
        if (ledger.type == LedgerType.PERSONAL) {
            val owner = userRepository.findByIdOrNull(ledger.ownerId) ?: throw NotFoundException("사용자를 찾을 수 없습니다.")
            budgetAllocationRepository.save(
                BudgetAllocation(period, BudgetAllocationScope.PERSONAL, owner, period.totalBudgetAmount)
            )
        }
        return period
    }

    private fun cycle(ledger: Ledger) = BudgetCyclePolicy(ledger.budgetStartType, ledger.budgetStartDay)

    private fun findPeriod(ledgerId: Long, startDate: LocalDate): BudgetPeriod =
        budgetPeriodRepository.findByLedgerIdAndStartDate(ledgerId, startDate)
            ?: throw NotFoundException("예산 기간을 찾을 수 없습니다.")

    private fun requireActiveLedger(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("장부를 찾을 수 없습니다.")
        ledgerMemberRepository.findFirstByLedgerIdAndUserIdAndLeftAtIsNullOrderByJoinedAtDesc(ledgerId, userId)
            ?: throw ForbiddenException("활성 장부 멤버만 변경할 수 있습니다.")
        return ledger
    }

    private fun requireLedgerReader(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("장부를 찾을 수 없습니다.")
        if (ledgerMemberRepository.findByUserId(userId).none { it.ledger.id == ledgerId }) {
            throw ForbiddenException("장부를 조회할 수 없습니다.")
        }
        return ledger
    }

    private fun toDetail(period: BudgetPeriod, today: LocalDate, viewerUserId: Long): BudgetPeriodDetailResponse {
        val allocations = budgetAllocationRepository.findByBudgetPeriodIdOrderById(period.id!!)
        val transactionsByAllocation = allocations.associate { allocation ->
            allocation.id!! to transactionRepository.findByBudgetAllocationIdAndTransactionDateBetween(
                allocation.id!!,
                period.startDate,
                period.endDate,
            ).filter(::isBudgetExpense)
        }
        val scheduled = scheduledOccurrenceRepository.findByLedgerAndDueDateBetweenAndStatus(
            period.ledger.id!!,
            period.startDate,
            period.endDate,
            ScheduledOccurrenceStatus.SCHEDULED,
        )
        return BudgetPeriodDetailResponse(
            id = period.id!!,
            ledgerId = period.ledger.id!!,
            startDate = period.startDate,
            endDate = period.endDate,
            status = when {
                period.startDate > today -> "UPCOMING"
                period.endDate < today -> "PAST"
                else -> "CURRENT"
            },
            totalBudget = period.totalBudgetAmount,
            allocations = allocations.map { allocation ->
                val spentAmount = transactionsByAllocation.getValue(allocation.id!!).sumOf { it.amount }
                val scheduledAmount = scheduled.filter { occurrence ->
                    occurrence.plan.scopeType?.name == allocation.scope.name &&
                        occurrence.plan.scopeOwnerUserId == allocation.owner?.id
                }.sumOf { it.amount }
                BudgetAllocationResponse(
                    id = allocation.id!!,
                    source = BudgetSourceResponse(
                        type = allocation.scope.name,
                        ownerUserId = allocation.owner?.id,
                    ),
                    owner = allocation.owner?.let { UserSummaryResponse(it.id!!, it.nickname) },
                    amount = allocation.amount,
                    spentAmount = spentAmount,
                    currentBalance = allocation.amount - spentAmount,
                    scheduledAmount = scheduledAmount,
                    availableAmount = allocation.amount - spentAmount - scheduledAmount,
                )
            },
            reserveAmount = if (period.preparedAt == null) null else period.totalBudgetAmount - allocations.sumOf { it.amount },
            prepared = period.preparedAt != null,
            copiedFromPeriodId = period.sourcePeriod?.id,
            categoryBudgets = allocations
                .filter { it.scope == BudgetAllocationScope.SHARED || it.owner?.id == viewerUserId }
                .flatMap { allocation ->
                    allocationCategoryBudgetRepository.findByBudgetAllocationId(allocation.id!!).map { categoryBudget ->
                        CategoryBudgetResponse(
                            source = BudgetSourceResponse(allocation.scope.name, allocation.owner?.id),
                            groupCode = categoryBudget.categoryGroupCode,
                            groupName = ledgerCategoryGroupRepository
                                .findByLedgerIdAndCode(period.ledger.id!!, categoryBudget.categoryGroupCode)
                                ?.name ?: categoryBudget.categoryGroupCode,
                            amount = categoryBudget.amount,
                            spentAmount = transactionsByAllocation.getValue(allocation.id!!)
                                .filter { it.categoryGroupCode == categoryBudget.categoryGroupCode }
                                .sumOf { it.amount },
                        )
                    }
                },
        )
    }

    private fun isBudgetExpense(transaction: Transaction): Boolean = try {
        TransactionPolicy.aggregationEffect(transaction.type.asLedgerTransactionType(), transaction.transferType) ==
            TransactionAggregationEffect.EXPENSE
    } catch (_: IllegalArgumentException) {
        false
    }

    private fun CategoryType.asLedgerTransactionType() = when (this) {
        CategoryType.EXPENSE -> LedgerTransactionType.EXPENSE
        CategoryType.INCOME -> LedgerTransactionType.INCOME
        CategoryType.TRANSFER -> LedgerTransactionType.TRANSFER
    }

    private fun toTransfer(transfer: ReserveTransfer) = ReserveTransferResponse(
        id = transfer.id!!,
        amount = transfer.amount,
        target = BudgetSourceResponse(
            type = transfer.targetAllocation.scope.name,
            ownerUserId = transfer.targetAllocation.owner?.id,
        ),
        actor = UserSummaryResponse(transfer.actor.id!!, transfer.actor.nickname),
        createdAt = transfer.createdAt,
    )
}
